import api from '../api/axiosConfig';


export const getAdminStats = async () => {
    const response = await api.get('/admin/');
    return response.data;
};

export const getAllAdmins = async () => {
    const response = await api.get('/admin/users');
    return response.data;
};

export const getAdminById = async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
};

export const createAdminUser = async (adminData) => {
    // adminData = { name, email }
    const response = await api.post('/admin/users', adminData);
    return response.data; // Returns { success, admin, temporaryPassword }
};

export const updateAdminUser = async (id, adminData) => {
    const response = await api.put(`/admin/users/${id}`, adminData);
    return response.data;
};

export const deleteAdminUser = async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
};

export const toggleAdminStatus = async (id) => {
    const response = await api.put(`/admin/users/${id}/status`);
    return response.data;
};