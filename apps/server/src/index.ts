import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { client } from "@repo/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();

// Enable CORS (Cross-Origin Resource Sharing) to allow requests from the Frontend (Port 3000)
app.use(cors());
// Parse incoming JSON payloads in HTTP requests
app.use(express.json());

// Secret key for signing JWT tokens. In production, this should be in .env
const JWT_SECRET = process.env.JWT_SECRET || "secret";

// ----------------------------------------------------------------------
// Authentication Endpoints
// ----------------------------------------------------------------------

/**
 * SIGN UP ROUTE
 * Accepts username and password, hashes the password, and creates a user in the DB.
 */
app.post("/api/signup", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password required" });
        }

        // Hash password before storing it for security
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user in Postgres via Prisma
        // For testing purposes, if username is 'admin', give them Admin role
        const role = username === 'admin' ? 'Admin' : 'User';

        const user = await client.user.create({
            data: {
                username,
                password: hashedPassword,
                role
            }
        });

        res.json({ userId: user.id });
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: "Username already exists or error creating user" });
    }
});

/**
 * SIGN IN ROUTE
 * Verifies credentials and issues a JWT token.
 */
app.post("/api/signin", async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user by username
        const user = await client.user.findUnique({ where: { username } });
        if (!user) return res.status(400).json({ error: "User not found" });

        // Compare provided password with stored hash
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ error: "Invalid password" });

        // Generate JWT Token containing UserId, Username, AND Role
        const token = jwt.sign({
            userId: user.id,
            username: user.username,
            role: user.role
        }, JWT_SECRET);

        res.json({ token });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ----------------------------------------------------------------------
// Space Management Endpoints
// ----------------------------------------------------------------------

/**
 * GET SPACES
 * Returns list of all available spaces.
 */
app.get("/api/spaces", async (req, res) => {
    try {
        const spaces = await client.space.findMany();
        res.json(spaces);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch spaces" });
    }
});

/**
 * CREATE SPACE
 * Allows Admin to create a new space.
 * Checks JWT token from Authorization header.
 */
app.post("/api/spaces", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        if (decoded.role !== 'Admin') {
            return res.status(403).json({ error: "Only admins can create spaces" });
        }

        const { name, width, height } = req.body;
        if (!name) return res.status(400).json({ error: "Space name is required" });

        const space = await client.space.create({
            data: {
                name,
                width: width || 800,
                height: height || 600
            }
        });

        res.json(space);
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: "Error creating space" });
    }
});

// ----------------------------------------------------------------------
// Socket.IO Setup (Real-time Communication)
// ----------------------------------------------------------------------

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

/**
 * MIDDLEWARE: Authentication
 * This runs before a client can connect to the websocket.
 * It checks the 'token' sent in the handshake auth object.
 */
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));
    try {
        // Verify token and attach user data to the socket instance
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        socket.data.user = decoded;
        next();
    } catch (e) {
        next(new Error("Authentication error"));
    }
});

// Data structure to hold player state in memory
interface Player {
    id: string;
    username: string;
    x: number;
    y: number;
}

// Global State: Room ID -> (Map of User ID -> Player Data)
const rooms = new Map<string, Map<string, Player>>();

io.on("connection", (socket) => {
    const user = socket.data.user;
    console.log("User connected:", user.username);

    /**
     * JOIN ROOM
     * Adds the authenticated user to a specific room (Space) and initializes their position.
     */
    socket.on("join_room", (roomId: string) => {
        // Verify room (space) exists? 
        // For strictness we could query DB, but for now we trust client to send valid SpaceID
        // or we check if room map exists or create it.
        socket.join(roomId);

        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Map());
        }
        const room = rooms.get(roomId)!;

        // Add player to room using their Database UserID (fundamental for persistence logic later)
        room.set(user.userId, {
            id: user.userId,
            username: user.username,
            x: 0,
            y: 0
        });

        console.log(`User ${user.username} joined room ${roomId}`);
    });

    /**
     * MOVE
     * Receives new coordinates from the client and updates the server state.
     * Note: In a production game, you would validate these moves here to prevent cheating.
     */
    socket.on("move", (data: { x: number, y: number, roomId: string }) => {
        const room = rooms.get(data.roomId);
        if (!room) return;

        const player = room.get(user.userId);
        if (player) {
            player.x = data.x;
            player.y = data.y;
        }
    });

    /**
     * CHAT MESSAGE
     * Broadcasts a message to everyone in the room.
     */
    socket.on("chat_message", (data: { message: string, roomId: string }) => {
        const room = rooms.get(data.roomId);
        if (!room) return;

        // Broadcast to room
        io.to(data.roomId).emit("chat_message", {
            senderId: user.userId,
            username: user.username,
            message: data.message,
            timestamp: new Date().toISOString()
        });
    });

    /**
     * DISCONNECT
     * Cleanup player data when they leave.
     */
    socket.on("disconnect", () => {
        console.log("User disconnected:", user.username);
        rooms.forEach((players) => {
            if (players.has(user.userId)) {
                players.delete(user.userId);
            }
        });
    });
});

// ----------------------------------------------------------------------
// Game Loop
// ----------------------------------------------------------------------

/**
 * TICK RATE: 50ms (20 updates per second)
 * Instead of broadcasting every move immediately, we batch updates.
 * The server sends the current state of all players in a room to everyone in that room.
 */
setInterval(() => {
    rooms.forEach((players, roomId) => {
        const playerList = Array.from(players.values());
        io.to(roomId).emit("players_update", playerList);
    });
}, 50);

const PORT = 3002;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
