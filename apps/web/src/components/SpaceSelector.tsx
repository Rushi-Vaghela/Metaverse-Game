import React, { useEffect, useState } from 'react';

const API_URL = 'http://localhost:3002/api';

interface Space {
    id: string;
    name: string;
    thumbnail?: string;
}

interface SpaceSelectorProps {
    token: string;
    onSelectSpace: (spaceId: string) => void;
}

export const SpaceSelector: React.FC<SpaceSelectorProps> = ({ token, onSelectSpace }) => {
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [newSpaceName, setNewSpaceName] = useState('');

    useEffect(() => {
        // Decode token to check role
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setIsAdmin(payload.role === 'Admin');
        } catch (e) {
            console.error("Invalid token");
        }

        fetchSpaces();
    }, [token]);

    const fetchSpaces = async () => {
        try {
            const res = await fetch(`${API_URL}/spaces`);
            const data = await res.json();
            setSpaces(data);
        } catch (e) {
            console.error("Failed to fetch spaces");
        }
    };

    const handleCreateSpace = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/spaces`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newSpaceName })
            });
            if (res.ok) {
                setNewSpaceName('');
                fetchSpaces();
            } else {
                alert("Failed to create space");
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8">
            <h1 className="text-3xl font-bold mb-8">Select a Space</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
                {spaces.map(space => (
                    <button
                        key={space.id}
                        onClick={() => onSelectSpace(space.id)}
                        className="p-6 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-left transition-colors flex flex-col items-center"
                    >
                        <div className="w-full h-32 bg-gray-900 mb-4 rounded flex items-center justify-center text-gray-500">
                            {space.thumbnail ? <img src={space.thumbnail} alt="" /> : 'No Thumbnail'}
                        </div>
                        <h3 className="text-xl font-semibold">{space.name}</h3>
                    </button>
                ))}

                {spaces.length === 0 && (
                    <div className="col-span-full text-center text-gray-400">
                        No spaces available. {isAdmin ? 'Create one below!' : 'Wait for an admin to create one.'}
                    </div>
                )}
            </div>

            {isAdmin && (
                <div className="mt-12 w-full max-w-md border-t border-gray-800 pt-8">
                    <h2 className="text-xl font-bold mb-4 text-center">Admin: Create New Space</h2>
                    <form onSubmit={handleCreateSpace} className="flex gap-4">
                        <input
                            type="text"
                            placeholder="Space Name"
                            value={newSpaceName}
                            onChange={(e) => setNewSpaceName(e.target.value)}
                            className="flex-1 px-4 py-2 bg-gray-800 rounded border border-gray-600"
                        />
                        <button
                            type="submit"
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded font-bold"
                        >
                            Create
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};
