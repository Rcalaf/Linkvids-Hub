import api from '../api/axiosConfig';

export const getNotifications = async () => {
    const response = await api.get('/notifications');
    return response.data; // Returns { notifications: [], unreadCount: 0 }
};

export const markNotificationAsRead = async (id) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
};

export const markAllNotificationsRead = async () => {
    const response = await api.put('/notifications/mark-all-read');
    return response.data;
};

export const deleteNotification = async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
};