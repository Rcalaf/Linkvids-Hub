import api from '../api/axiosConfig';

export const saveFilterSet = async (name, filters, context = 'collaborators') => {
    const response = await api.post('/filters', { name, filters, context });
    return response.data;
};

export const getSavedFilters = async (context = 'collaborators') => {
    const response = await api.get(`/filters?context=${context}`);
    return response.data;
};

export const deleteSavedFilter = async (id) => {
    const response = await api.delete(`/filters/${id}`);
    return response.data;
};