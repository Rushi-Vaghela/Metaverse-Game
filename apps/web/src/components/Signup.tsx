import React, { useState } from 'react';

const API_URL = 'http://localhost:3002/api';

interface SignupProps {
    onSignupSuccess: () => void;
    onSwitchToSignin: () => void;
}

export const Signup: React.FC<SignupProps> = ({ onSignupSuccess, onSwitchToSignin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (data.userId) {
                onSignupSuccess();
            } else {
                setError(data.error || 'Signup failed');
            }
        } catch (err) {
            setError('Something went wrong');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-black">
            <div className="p-8 bg-gray-900 rounded-lg shadow-xl w-96 border border-gray-700">
                <h1 className="text-2xl font-bold mb-6 text-white text-center">Join the Metaverse</h1>
                {error && <div className="text-red-500 mb-4 text-center">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 mb-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-800 text-white rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-800 text-white rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded transition-colors"
                    >
                        Sign Up
                    </button>
                </form>
                <div className="mt-4 text-center text-gray-400">
                    Already have an account?{' '}
                    <button onClick={onSwitchToSignin} className="text-blue-400 hover:text-blue-300">
                        Sign In
                    </button>
                </div>
            </div>
        </div>
    );
};
