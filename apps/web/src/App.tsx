import React, { useState, useEffect } from 'react';
import { Playground } from './components/Playground';
import { Signin } from './components/Signin';
import { Signup } from './components/Signup';

/**
 * App Component
 * Handles the high-level routing based on Authentication state.
 * 
 * Logic:
 * - If Token exists -> Show Game (Playground).
 * - If No Token -> Show Signin/Signup forms.
 */
export const App: React.FC = () => {
    // Check localStorage for existing session
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isSignup, setIsSignup] = useState(false);

    // Sync token changes to localStorage
    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }, [token]);

    const handleLogout = () => {
        setToken(null);
        localStorage.removeItem('token');
    };

    // 1. Authenticated State: Show Game
    if (token) {
        return <Playground token={token} onLogout={handleLogout} />;
    }

    // 2. Unauthenticated: Sign Up Form
    if (isSignup) {
        return (
            <Signup
                onSignupSuccess={() => setIsSignup(false)}
                onSwitchToSignin={() => setIsSignup(false)}
            />
        );
    }

    // 3. Unauthenticated: Sign In Form (Default)
    return (
        <Signin
            onSignin={(t) => setToken(t)}
            onSwitchToSignup={() => setIsSignup(true)}
        />
    );
};
