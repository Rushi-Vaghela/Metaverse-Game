import React, { useEffect, useRef, useState, FormEvent, MouseEvent } from 'react';
import { io, Socket } from 'socket.io-client';
import { RLControlPanel } from './RLControlPanel';

// Backend URL - ensures we connect to the correct server port
const SOCKET_URL = 'http://localhost:3002';

interface Player {
    id: string; // User ID from database
    username: string;
    x: number;
    y: number;
}

interface Message {
    senderId: string;
    username: string;
    message: string;
    timestamp: string;
}

interface RLStats {
    episode: number;
    totalReward: number;
    epsilon: number;
    learningRate: number;
    discountFactor: number;
}

interface PlaygroundProps {
    token: string;
    spaceId: string;
    onLogout: () => void;
}

/**
 * Playground Component
 * The main game area. Handles:
 * 1. Socket.IO connection with Auth.
 * 2. Canvas rendering (2D Grid & Players).
 * 3. Chat System (Right Sidebar).
 * 4. RL Dashboard (Left Sidebar).
 * 5. Keyboard input for movement.
 */
export const Playground: React.FC<PlaygroundProps> = ({ token, spaceId, onLogout }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [socket, setSocket] = useState<Socket | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [me, setMe] = useState<Player | null>(null);

    // Chat State
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');

    // RL State
    const [isTargetMode, setIsTargetMode] = useState(false);
    const [rlStats, setRlStats] = useState<RLStats | null>(null);
    const [rlTargetCoords, setRlTargetCoords] = useState<{ x: number, y: number } | null>(null);

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
            newSocket.emit('join_room', spaceId);
        });

        newSocket.on('connect_error', (err) => {
            console.error('Connection Error:', err.message);
        });

        // Receive "tick" updates from server with full player list
        newSocket.on('players_update', (updatedPlayers: Player[]) => {
            setPlayers(updatedPlayers);
        });

        // Receive Chat Messages
        newSocket.on('chat_message', (msg: Message) => {
            setMessages(prev => [...prev, msg]);
        });

        // Receive RL Stats
        newSocket.on('rl_stats_update', (stats: RLStats) => {
            setRlStats(stats);
        });

        newSocket.on('rl_target_set', (state: { col: number, row: number }) => {
            setRlTargetCoords({
                x: state.col * 50 + 25,
                y: state.row * 50 + 25
            });
            setIsTargetMode(false); // Turn off target mode once confirmed
        });

        setSocket(newSocket);

        // Cleanup on unmount
        return () => {
            newSocket.disconnect();
        };
    }, [token, spaceId]); // Re-connect if space changes

    // Auto-scroll chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ------------------------------------------------------------------
    // 2. Identify "Myself"
    // ------------------------------------------------------------------
    useEffect(() => {
        if (!token) return;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const myUserId = payload.userId;

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

        const draw = () => {
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

            // Draw Players and Bots
            players.forEach(p => {
                const isMe = me?.id === p.id;
                const isBot = p.id.startsWith("RL_BOT_");

                if (isBot) {
                    ctx.fillStyle = '#f59e0b'; // Amber target for AI
                } else if (isMe) {
                    ctx.fillStyle = '#4f46e5'; // Blue for me
                } else {
                    ctx.fillStyle = '#10b981'; // Green for others
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
                ctx.fill();

                if (isBot) {
                    // Draw little robot eyes just for fun
                    ctx.fillStyle = 'black';
                    ctx.beginPath(); ctx.arc(p.x - 7, p.y - 5, 3, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(p.x + 7, p.y - 5, 3, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'white';
                } else {
                    ctx.fillStyle = 'white';
                }

                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(p.username, p.x, p.y - 25);
            });

            // Draw RL Target Flag if set
            if (rlTargetCoords) {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.5)'; // Transparent red square
                const col = Math.floor(rlTargetCoords.x / 50);
                const row = Math.floor(rlTargetCoords.y / 50);
                ctx.fillRect(col * 50, row * 50, 50, 50);

                ctx.fillStyle = 'white';
                ctx.font = '20px Arial';
                ctx.fillText('🏁', rlTargetCoords.x, rlTargetCoords.y + 7);
            }

            requestAnimationFrame(draw);
        };

        const animationId = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animationId);
    }, [players, me]);

    // ------------------------------------------------------------------
    // 4. Input Handling (Movement)
    // ------------------------------------------------------------------
    useEffect(() => {
        if (!socket || !me) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore movement keys if user is typing in an input field
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            const speed = 10;
            let { x, y } = me;

            if (e.key === 'w' || e.key === 'ArrowUp') y -= speed;
            if (e.key === 's' || e.key === 'ArrowDown') y += speed;
            if (e.key === 'a' || e.key === 'ArrowLeft') x -= speed;
            if (e.key === 'd' || e.key === 'ArrowRight') x += speed;

            socket.emit('move', { x, y, roomId: spaceId });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [socket, me, spaceId]);

    // ------------------------------------------------------------------
    // 5. Chat Handlers
    // ------------------------------------------------------------------
    const handleSendMessage = (e: FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        socket.emit('chat_message', {
            message: newMessage,
            roomId: spaceId
        });
        setNewMessage('');
    };

    // ------------------------------------------------------------------
    // 6. RL Handlers
    // ------------------------------------------------------------------
    const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
        if (!isTargetMode || !socket || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        // Calculate canvas coordinates
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        socket.emit("set_rl_target", { roomId: spaceId, targetX: x, targetY: y });
    };

    const spawnAgent = () => {
        socket?.emit("spawn_rl_agent", { roomId: spaceId, startX: 50, startY: 50 });
    };

    const updateRlParams = (params: { epsilon?: number, learningRate?: number, discountFactor?: number }) => {
        socket?.emit("update_rl_params", { roomId: spaceId, ...params });
        // Optimistic UI update
        if (rlStats) {
            setRlStats({
                ...rlStats,
                ...params
            });
        }
    };

    return (
        <div className="flex h-screen bg-black overflow-hidden relative">
            {/* LEFT SIDEBAR: RL Controls */}
            <RLControlPanel
                stats={rlStats}
                onSpawn={spawnAgent}
                isTargetMode={isTargetMode}
                onSetTargetMode={() => setIsTargetMode(!isTargetMode)}
                onUpdateParams={updateRlParams}
            />

            {/* CENTER: Game Area */}
            <div className={`flex-1 relative flex items-center justify-center bg-gray-900 ${isTargetMode ? 'cursor-crosshair' : ''}`}>
                <button
                    onClick={onLogout}
                    className="absolute top-4 left-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold z-10"
                >
                    Logout
                </button>

                <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    onClick={handleCanvasClick}
                    className={`bg-black border rounded-lg shadow-xl ${isTargetMode ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'border-gray-700'}`}
                />

                <div className="absolute bottom-4 left-4 text-gray-500 pointer-events-none">
                    Use W, A, S, D to move
                </div>
            </div>

            {/* RIGHT: Chat Sidebar */}
            <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col">
                <div className="p-4 border-b border-gray-800 bg-gray-800">
                    <h2 className="text-xl font-bold text-white">Space Chat</h2>
                    <div className="text-sm text-gray-400">Connected: {players.length}</div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, idx) => {
                        const isMe = msg.username === me?.username;
                        return (
                            <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className="text-xs text-gray-400 mb-1">{msg.username}</div>
                                <div className={`px-3 py-2 rounded-lg max-w-[85%] break-words ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'
                                    }`}>
                                    {msg.message}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-800 bg-gray-800">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-gray-900 border border-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold transition-colors disabled:opacity-50"
                            disabled={!newMessage.trim()}
                        >
                            Send
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
