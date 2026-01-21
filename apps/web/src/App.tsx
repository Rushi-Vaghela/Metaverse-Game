import React, { useState, useEffect } from 'react';
import { Playground } from './components/Playground';
import { Signin } from './components/Signin';
import { Signup } from './components/Signup';
import { SpaceSelector } from './components/SpaceSelector';

/**
 * App Component
 * Handles the high-level routing based on Authentication state.
 * 
 * Logic:
 * - If Token exists -> Show Space Selector.
 * - If Space Selected -> Show Playground.
 * - If No Token -> Show Signin/Signup forms.
 */
export const App: React.FC = () => {
    // Check localStorage for existing session
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isSignup, setIsSignup] = useState(false);
    const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

    // Sync token changes to localStorage
    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
            setSelectedSpaceId(null);
        }
    }, [token]);

    const handleLogout = () => {
        setToken(null);
        localStorage.removeItem('token');
        setSelectedSpaceId(null);
    };

    // 1. Authenticated & Space Selected: Show Game
    if (token && selectedSpaceId) {
        return <Playground token={token} spaceId={selectedSpaceId} onLogout={() => setSelectedSpaceId(null)} />;
    }

    // 2. Authenticated & No Space: Show Selector
    if (token) {
        return (
            <div className="relative">
                <button
                    onClick={handleLogout}
                    className="absolute top-4 right-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold z-10"
                >
                    Logout
                </button>
                <SpaceSelector token={token} onSelectSpace={setSelectedSpaceId} />
            </div>
        );
    }

    // 3. Unauthenticated: Sign Up Form
    if (isSignup) {
        return (
            <Signup
                onSignupSuccess={() => setIsSignup(false)}
                onSwitchToSignin={() => setIsSignup(false)}
            />
        );
    }

    // 4. Unauthenticated: Sign In Form (Default)
    return (
        <Signin
            onSignin={(t) => setToken(t)}
            onSwitchToSignup={() => setIsSignup(true)}
        />
    );
};
