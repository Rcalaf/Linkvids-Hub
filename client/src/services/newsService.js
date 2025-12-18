import api from '../api/axiosConfig';

// User Feed
export const getNewsFeed = async (params = {}) => {
    const response = await api.get('/news/feed', { params });
    return response.data;
};

// Single Item
export const getNewsById = async (id) => {
    const response = await api.get(`/news/${id}`);
    return response.data;
};

// Admin List
export const getAllNewsAdmin = async () => {
    const response = await api.get('/news/all');
    return response.data;
};

// CRUD
export const createNews = async (data) => {
    const response = await api.post('/news', data);
    return response.data;
};

export const updateNews = async (id, data) => {
    const response = await api.put(`/news/${id}`, data);
    return response.data;
};

export const deleteNews = async (id) => {
    const response = await api.delete(`/news/${id}`);
    return response.data;
};