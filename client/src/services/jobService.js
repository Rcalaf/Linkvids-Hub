
import api from '../api/axiosConfig';

export const getAllJobs = async (params = {}) => {
    // params can include: page, limit, search, status, targetRole
    const response = await api.get('/jobs', { params });
    return response.data; // Expected { data: [], metadata: {} }
};

export const getJobById = async (id) => {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
};

export const createJob = async (jobData) => {
    const response = await api.post('/jobs', jobData);
    return response.data;
};

export const updateJob = async (id, jobData) => {
    const response = await api.put(`/jobs/${id}`, jobData);
    return response.data;
};

export const deleteJob = async (id) => {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
};

export const toggleJobApplication = async (jobId) => {
    const response = await api.post(`/jobs/${jobId}/apply`);
    return response.data; // Returns { message, hasApplied: boolean }
};

export const getJobStats = async () => {
    const response = await api.get('/jobs/stats');
    return response.data;
};

export const getJobApplicants = async (jobId) => {
    const response = await api.get(`/jobs/${jobId}/applicants`);
    return response.data;
};

export const assignJob = async (jobId, userId) => {
    const response = await api.post(`/jobs/${jobId}/assign`, { userId });
    return response.data;
}; 

export const rejectApplicant = async (jobId, userId) => {
    const response = await api.post(`/jobs/${jobId}/reject`, { userId });
    return response.data;
};

export const unassignJob = async (jobId) => {
    const response = await api.post(`/jobs/${jobId}/unassign`);
    return response.data;
};

export const unrejectApplicant = async (jobId, userId) => {
    const response = await api.post(`/jobs/${jobId}/unreject`, { userId });
    return response.data;
};