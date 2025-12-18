export const logoutUser = () => {
    // 1. Clear Local Storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // 2. (Optional) If you implement Refresh Tokens later, 
    // you would call an API endpoint here: await api.post('/auth/logout');
};

export const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) return JSON.parse(userStr);
    return null;
};