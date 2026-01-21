import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Backend URL - ensures we connect to the correct server port
const SOCKET_URL = 'http://localhost:3002';

interface Player {
    id: string; // User ID from database
    username: string;
    x: number;
    y: number;
}

interface PlaygroundProps {
    token: string;
    onLogout: () => void;
}

/**
 * Playground Component
 * The main game area. Handles:
 * 1. Socket.IO connection with Auth.
 * 2. Canvas rendering (2D Grid & Players).
 * 3. Keyboard input for movement.
 */
export const Playground: React.FC<PlaygroundProps> = ({ token, onLogout }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [me, setMe] = useState<Player | null>(null);

    // ------------------------------------------------------------------
    // 1. Connection & Events
    // ------------------------------------------------------------------
    useEffect(() => {
        // Initialize Socket with JWT Token in handshake
        const newSocket = io(SOCKET_URL, {
            auth: { token }
        });

        newSocket.on('connect', () => {
            console.log('Connected to socket');
            newSocket.emit('join_room', 'room-1');
        });

        newSocket.on('connect_error', (err) => {
            console.error('Connection Error:', err.message);
        });

        // Receive "tick" updates from server with full player list
        newSocket.on('players_update', (updatedPlayers: Player[]) => {
            setPlayers(updatedPlayers);
        });

        setSocket(newSocket);

        // Cleanup on unmount
        return () => {
            newSocket.disconnect();
        };
    }, [token]);

    // ------------------------------------------------------------------
    // 2. Identify "Myself"
    // ------------------------------------------------------------------
    useEffect(() => {
        if (!token) return;
        try {
            // Decode JWT payload (middle part of token) to get our userId
            const payload = JSON.parse(atob(token.split('.')[1]));
            const myUserId = payload.userId;

            // Find our player object in the state based on ID
            const myPlayer = players.find(p => p.id === myUserId);
            if (myPlayer) setMe(myPlayer);
        } catch (e) {
            console.error("Invalid token format");
        }
    }, [players, token]);

    // ------------------------------------------------------------------
    // 3. Drawing Loop (Canvas)
    // ------------------------------------------------------------------
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Render Function - runs on every animation frame
        const draw = () => {
            // Clear screen
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Background Grid
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            for (let x = 0; x < canvas.width; x += 50) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += 50) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            // Draw Players
            players.forEach(p => {
                const isMe = me?.id === p.id;
                ctx.fillStyle = isMe ? '#4f46e5' : '#10b981'; // Blue for me, Green for others

                // Draw Body (Circle)
                ctx.beginPath();
                ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
                ctx.fill();

                // Draw Username
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(p.username, p.x, p.y - 25);
            });

            requestAnimationFrame(draw);
        };

        const animationId = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animationId);
    }, [players, me]);

    // ------------------------------------------------------------------
    // 4. Input Handling
    // ------------------------------------------------------------------
    useEffect(() => {
        if (!socket || !me) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const speed = 10;
            let { x, y } = me;

            // Calculate new position
            // NOTE: In a real game, you would check collisions here before sending
            if (e.key === 'w' || e.key === 'ArrowUp') y -= speed;
            if (e.key === 's' || e.key === 'ArrowDown') y += speed;
            if (e.key === 'a' || e.key === 'ArrowLeft') x -= speed;
            if (e.key === 'd' || e.key === 'ArrowRight') x += speed;

            // Send 'move' event to server. The server will update state and broadcast it back.
            socket.emit('move', { x, y, roomId: 'room-1' });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [socket, me]);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-black relative">
            <button
                onClick={onLogout}
                className="absolute top-4 right-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold"
            >
                Logout
            </button>
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl"
            />
            <div className="mt-4 text-gray-500">
                Use W, A, S, D to move
            </div>
        </div>
    );
};
