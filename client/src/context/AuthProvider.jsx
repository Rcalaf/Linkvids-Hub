// client/src/context/AuthProvider.jsx
import React, { createContext, useState, useEffect } from 'react';
import { 
    getStoredUser, 
    getStoredToken, 
    setStoredAuth, 
    clearStoredAuth 
} from '../services/authService'; // 🚨 Import Service

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState({ user: null, token: null, isAuthenticated: false });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Initialize State using Service
        const user = getStoredUser();
        const token = getStoredToken();

        if (user && token) {
            setAuth({
                user: user,
                token: token,
                isAuthenticated: true
            });
        }
        setLoading(false);
    }, []);

    // --- Actions ---

    const login = (userData, token) => {
        console.log('Performing Login...')
        // Update React State
        setAuth({
            user: userData,
            token: token,
            isAuthenticated: true
        });
        // Delegate Storage to Service
        setStoredAuth(userData, token);
    };

    const logout = () => {
        // Update React State
        setAuth({ user: null, token: null, isAuthenticated: false });
        // Delegate Storage to Service
        clearStoredAuth();
    };

    const updateUser = (updatedUserData) => {
        setAuth(prev => {
            const newUser = { ...prev.user, ...updatedUserData };
            // Delegate Storage Update
            setStoredAuth(newUser, prev.token); 
            return { ...prev, user: newUser };
        });
    };

    return (
        <AuthContext.Provider value={{ auth, login, logout, updateUser, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthContext;