
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
    const response = await api.put(`/jobs/${jobId}/apply`);
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
    const response = await api.put(`/jobs/${jobId}/assign`, { userId });
    return response.data;
}; 

export const rejectApplicant = async (jobId, userId) => {
    const response = await api.put(`/jobs/${jobId}/reject`, { userId });
    return response.data;
};

export const unassignJob = async (jobId,userId) => {
    const response = await api.put(`/jobs/${jobId}/unassign`, { userId });
    return response.data;
};

export const unrejectApplicant = async (jobId, userId) => {
    const response = await api.put(`/jobs/${jobId}/unreject`, { userId });
    return response.data;
};

export const shortlistApplicant = async (jobId, userId) => {
    const response = await api.put(`/jobs/${jobId}/shortlist`, { userId });
    return response.data;
};

export const undoShortlistApplicant = async (jobId, userId) => {
    const response = await api.put(`/jobs/${jobId}/unshortlist`, { userId });
    return response.data;
};

export const getAllApplications = async (page = 1, limit = 10, status = '', search = '') => {
    try {
        const params = {
            page,
            limit
        };

        // Only attach status if it has a value and isn't 'all'
        if (status && status !== 'all') {
            params.status = status;
        }

        // Only attach search if it has a value
        if (search) {
            params.search = search;
        }

        // Request URL: /api/jobs/applications?page=1&limit=10&status=pending&search=...
        
        const response = await api.get(`/applications`, { params });
        
        return response.data; 
    } catch (error) {
        console.error("Service Error - Get All Apps:", error);
        throw error;
    }
};

export const reviewJobPerformance = async (jobId, payload) => {
    // payload = { rating: 5, feedback: "Great work!" }
    const response = await api.put(`/jobs/${jobId}/review`, payload);
    return response.data;
};  