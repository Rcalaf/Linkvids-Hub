// client/src/services/authService.js
import api from '../api/axiosConfig';

// --- Local Storage Helpers ---
export const getStoredUser = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};

export const getStoredToken = () => {
    return localStorage.getItem('token');
};

export const setStoredAuth = (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
};

export const clearStoredAuth = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    //localStorage.clear(); // Optional: Nuclear option
};

// --- API Calls ---
export const loginAPI = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
};

export const logoutAPI = async () => {
    // Optional: Call backend to invalidate token
    // await api.post('/auth/logout'); 
    clearStoredAuth();
};