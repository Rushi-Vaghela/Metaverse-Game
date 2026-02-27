import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { client } from "@repo/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Environment, State } from "./rl/Environment";
import { QAgent } from "./rl/QAgent";

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

// ----------------------------------------------------------------------
// RL Global State
// ----------------------------------------------------------------------
const rlEnv = new Environment(800, 600, 50);
const rlAgent = new QAgent(rlEnv);

interface RLSession {
    botId: string;
    roomId: string;
    currentState: State;
    targetState: State | null;
    isTraining: boolean;
    episode: number;
    steps: number;
    totalReward: number;
}
// For simplicity, we assume one global bot or one bot per room. We'll support one bot per room.
const roomRLSessions = new Map<string, RLSession>();

// Bot's player ID prefix
const BOT_ID_PREFIX = "RL_BOT_";

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
     * RL: SPAWN BOT
     * Spawns an AI bot in the room.
     */
    socket.on("spawn_rl_agent", (data: { roomId: string, startX?: number, startY?: number }) => {
        const { roomId, startX = 50, startY = 50 } = data;
        const room = rooms.get(roomId);
        if (!room) return;

        const botId = BOT_ID_PREFIX + roomId;
        const botState = rlEnv.getStateFromCoordinates(startX, startY);
        const botCoords = rlEnv.getCoordinatesFromState(botState);

        // Add Bot to Room as a "Player"
        room.set(botId, {
            id: botId,
            username: "[AI] QBot",
            x: botCoords.x,
            y: botCoords.y
        });

        // Initialize RL Session
        roomRLSessions.set(roomId, {
            botId,
            roomId,
            currentState: botState,
            targetState: null,
            isTraining: false,
            episode: 1,
            steps: 0,
            totalReward: 0
        });

        // Broadcast stats
        io.to(roomId).emit("rl_stats_update", {
            episode: 1, totalReward: 0,
            epsilon: rlAgent.epsilon, learningRate: rlAgent.learningRate,
            discountFactor: rlAgent.discountFactor
        });
    });

    /**
     * RL: SET TARGET AND START TRAINING
     */
    socket.on("set_rl_target", (data: { roomId: string, targetX: number, targetY: number }) => {
        const session = roomRLSessions.get(data.roomId);
        if (!session) return;

        session.targetState = rlEnv.getStateFromCoordinates(data.targetX, data.targetY);
        session.isTraining = true;

        io.to(data.roomId).emit("rl_target_set", session.targetState);
    });

    /**
     * RL: UPDATE HYPERPARAMS
     */
    socket.on("update_rl_params", (data: { roomId: string, epsilon?: number, learningRate?: number, discountFactor?: number }) => {
        if (data.epsilon !== undefined) rlAgent.epsilon = data.epsilon;
        if (data.learningRate !== undefined) rlAgent.learningRate = data.learningRate;
        if (data.discountFactor !== undefined) rlAgent.discountFactor = data.discountFactor;
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
 * GAME LOOP TICK RATE: 50ms (20 updates per second)
 * Server pushes states to clients.
 */
setInterval(() => {
    rooms.forEach((players, roomId) => {
        const playerList = Array.from(players.values());
        io.to(roomId).emit("players_update", playerList);
    });
}, 50);

/**
 * RL TRAINING LOOP: 100ms (10 steps per second for visual observation)
 * Fast enough to train, slow enough for users to watch.
 */
setInterval(() => {
    roomRLSessions.forEach((session, roomId) => {
        if (!session.isTraining || !session.targetState) return;

        const room = rooms.get(roomId);
        if (!room) return;
        const bot = room.get(session.botId);
        if (!bot) return;

        const action = rlAgent.chooseAction(session.currentState);
        const { nextState, reward, done } = rlEnv.step(session.currentState, action, session.targetState);

        rlAgent.learn(session.currentState, action, reward, nextState);

        // Update session
        session.currentState = nextState;
        session.totalReward += reward;
        session.steps++;

        // Sync Bot Coordinates
        const coords = rlEnv.getCoordinatesFromState(nextState);
        bot.x = coords.x;
        bot.y = coords.y;

        if (done || session.steps > 500) { // Timeout or Hit target
            rlAgent.decayEpsilon();
            io.to(roomId).emit("rl_stats_update", {
                episode: session.episode,
                totalReward: session.totalReward,
                epsilon: rlAgent.epsilon,
                learningRate: rlAgent.learningRate,
                discountFactor: rlAgent.discountFactor
            });

            // Reset for next episode
            session.episode++;
            session.steps = 0;
            session.totalReward = 0;
            // Let the bot start from its current position (or spawn point, we'll use current for continuous tracking)
            // Actually, usually we reset state, but let's keep it continuous or just reset to center
            session.currentState = rlEnv.getStateFromCoordinates(50, 50); // Reset to origin
        }
    });
}, 100);

const PORT = 3002;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
