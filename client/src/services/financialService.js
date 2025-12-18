// client/src/services/financialService.js
import api from '../api/axiosConfig';

export const getFinancialProfile = async (userId) => {
    const response = await api.get(`/financial/${userId}`);
    return response.data;
};

export const updateFinancialProfile = async (userId, data) => {
    const response = await api.put(`/financial/${userId}`, data);
    return response.data;
};

export const deleteFinancialProfile = async (userId) => {
    const response = await api.delete(`/financial/${userId}`);
    return response.data;
};