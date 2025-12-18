// client/src/api/axiosConfig.js
import axios from 'axios';

// Create a reusable Axios instance
const api = axios.create({
    baseURL: '/api', // Vite proxy handles routing to http://localhost:3500/api
    headers: {
        'Content-Type': 'application/json',
    },
    // Future: withCredentials for cookies/JWTs
    // withCredentials: true, 
});

api.interceptors.request.use(
    (config) => {
        // Get the token from local storage
        const token = localStorage.getItem('token');
        
        // If token exists, attach it to the Authorization header
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// api.interceptors.response.use(
//     (response) => response,
//     (error) => {
//         if (error.response && error.response.status === 401) {
//             // Token expired or invalid
//             console.warn("Session expired. Redirecting to login...");
//             // Optionally clear storage and redirect (commented out to prevent loops during debugging)
//             // localStorage.removeItem('token');
//             // localStorage.removeItem('user');
//             // window.location.href = '/login'; 
//         }
//         return Promise.reject(error);
//     }
// );

api.interceptors.response.use(
    response => response, // Return success responses as is
    error => {
        const prevRequest = error?.config;
        
        // Check if error is 403 (Forbidden) or 401 (Unauthorized)
        if (error.response?.status === 403 || error.response?.status === 401) {
            
            // Prevent infinite loops if the logout endpoint itself fails
            if (!prevRequest?.sent) {
                prevRequest.sent = true;

                console.warn("Session expired. Logging out...");

                // 1. Clear Local Storage
                localStorage.removeItem('token');
                localStorage.removeItem('user'); // If you store user info
                
                // 2. Redirect to Login
                // Using window.location is the safest way to force a full reset
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Future: Add interceptors for token refresh/error handling here

export default api;