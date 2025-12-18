// client/src/services/userService.js
import api from '../api/axiosConfig';

const USER_URL = '/collaborators';

// export const createNewUser = async (userData) => {
//     // This calls the 'handleNewUser' function on the Node.js backend
//     const response = await api.post(USER_URL, userData);
//     return response.data.user; // Assuming API returns the created user object
// };

export const getAllUsers = async (paramsObj) => {
    // Destructure known static keys (page, limit, search) and treat the rest as filters
    const { page = 1, limit = 20, search = '', ...filters } = paramsObj; 

    try {
        // Construct query parameters with base values
        const params = new URLSearchParams({ page, limit });

        if (search) {
            params.append('search', search);
        }
        
        // 🚨 FIX: Iterate over remaining filters and append them to the query string 🚨
        for (const [key, value] of Object.entries(filters)) {
            // Only append if the value is defined (i.e., not the 'undefined' used to clear filters)
            if (value !== undefined && value !== null) {
                 params.append(key, value);
            }
        }
        
        // Calls GET /api/collaborators/?page=X&limit=Y&search=Z&nationality=Andorra&city=Barcelona
        const response = await api.get(`${USER_URL}?${params.toString()}`);
        
        return response.data; 
    } catch (error) {
        if (error.response) {
            throw new Error(error.response.data.message || 'Failed to fetch user list.');
        }
        throw new Error('Network error: Could not connect to API.');
    }
};

export const createNewUser = async (userData) => {
    try {
        // Calls POST /api/collaborators/create
        const response = await api.post(`${USER_URL}/create`, userData); 
        return response.data.user; 
    } catch (error) {
        if (error.response) {
            const { status, data } = error.response;
            if (status === 409) {
                throw new Error('Creation failed: Email already in use.');
            }
            if (status === 400) {
                 throw new Error(data.message || 'Creation failed: Missing required fields or invalid type.');
            }
            throw new Error(data.message || 'Creation failed due to server error.');
        }
        throw new Error('Network error: Could not connect to API.');
    }
};

export const getUserById = async (userId) => {
    try {
        const response = await api.get(`${USER_URL}/${userId}`);
        return response.data;
    } catch (error) {
        throw new Error('Failed to fetch user data.');
    }
};

export const updateExistingUser = async (userId, userData) => {
    try {
        console.log('UserService - Update User')
        const response = await api.put(`${USER_URL}/${userId}`, userData); 
        console.log(response)

        return response.data.user;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Update failed.');
    }
};

export const deleteUser = async (userId) => { // 🚨 FIX: Ensure 'export' is here 🚨
    try {
        // Calls DELETE /api/collaborators/:userId
        const response = await api.delete(`${USER_URL}/${userId}`);
        return response.data;
    } catch (error) {
        if (error.response) {
            // 409 Conflict check should be handled by the backend
            throw new Error(error.response.data.message || 'Deletion failed.');
        }
        throw new Error('Network error.');
    }
};

export const getDashboardStats = async () => {
    const response = await api.get(`${USER_URL}/dashboard-stats`);
    return response.data;
};



// You might also add:
// export const getAllUsers = async () => {...}
// export const deleteUser = async (userId) => {...}