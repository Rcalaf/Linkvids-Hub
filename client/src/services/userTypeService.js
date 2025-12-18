import api from '../api/axiosConfig';

const USER_TYPE_URL = '/user-types';

// Placeholder function for fetching all user type configurations
export const getAllUserTypes = async () => {
    // In a real scenario, this would fetch data from the API.
    // For now, we return empty data to prevent a crash.
    console.log("Fetching User Types (Placeholder)");
    
    // You should modify this return once the API endpoints are fully implemented.
    try {
        const response = await api.get(USER_TYPE_URL);
        return response.data;
    } catch (error) {
        console.error("API call failed (Placeholder mode):", error);
        // Return seeded data structure to prevent UI crash if needed:
        return [
            { slug: 'ugc-creator', name: 'UGC Creator', parentType: 'Collaborator', fields: [] },
            { slug: 'actor', name: 'Actor / Model', parentType: 'Collaborator', fields: [] },
        ];
    }
};

export const getUniqueFilterAttributes = async () => {
    try {
        const configs = await getAllUserTypes();
        const attributeMap = new Map();

        configs.forEach(config => {
            (config.fields || []).forEach(field => {
                const slug = field.attributeDetails?.slug;
                
                if (slug) {
                    // 🚨 FIX: Ensure critical metadata is explicitly included in the stored object 🚨
                    if (!attributeMap.has(slug)) {
                         attributeMap.set(slug, {
                            ...field.attributeDetails, 
                            label: field.label,
                            section: field.section, // 👈 CRITICAL: Retain the section for grouping
                            attributeSlug: field.attributeSlug, // Retain original slug
                            fieldType: field.attributeDetails.fieldType // Ensure fieldType is primary
                        });
                    }
                }
            });
        });

        return Array.from(attributeMap.values());
    } catch (error) {
        console.error("Error fetching filter attributes:", error);
        throw error;
    }
};


export const createUserType = async (userTypeData) => {
    try {
        const response = await api.post(USER_TYPE_URL, userTypeData);
        return response.data; // Returns the newly created UserTypeConfig document
    } catch (error) {
        // Use structured error handling to send a clean message back to the component
        if (error.response) {
            const { status, data } = error.response;
            
            // 409 Conflict: Slug already exists (Handled by backend check)
            if (status === 409) {
                throw new Error(data.message || 'User Type slug already exists.');
            }
            // 400 Bad Request: Missing fields, validation failed (Handled by backend checks)
            if (status === 400) {
                throw new Error(data.message || 'Invalid data submitted. Check required fields or attribute slugs.');
            }
            // 500 Internal Server Error
            throw new Error(data.message || 'Server error occurred during creation.');
        }
        // Network/other errors
        throw new Error('Network error: Could not connect to the API.');
    }
};

export const updateUserType = async (slug, userTypeData) => {
    try {
        const response = await api.put(`${USER_TYPE_URL}/${slug}`, userTypeData);
        return response.data;
    } catch (error) {
        if (error.response) {
            const { status, data } = error.response;
            if (status === 404) {
                throw new Error(data.message || 'User Type not found.');
            }
            if (status === 400) {
                throw new Error(data.message || 'Invalid data submitted for update.');
            }
            throw new Error(data.message || 'Server error occurred during update.');
        }
        throw new Error('Network error: Could not connect to the API.');
    }
};

export const deleteUserType = async (slug) => {
    try {
        // 🚨 Implementation for DELETE 🚨
        const response = await api.delete(`${USER_TYPE_URL}/${slug}`);
        return response.data;
    } catch (error) {
        if (error.response) {
            const { status, data } = error.response;
            // 409 Conflict: CRITICAL CHECK (Attribute/UserType is in use)
            if (status === 409) {
                throw new Error(data.message || 'Cannot delete: The user type is currently in use.');
            }
            if (status === 404) {
                throw new Error(data.message || 'User Type not found.');
            }
            throw new Error(data.message || 'Server error occurred during deletion.');
        }
        throw new Error('Network error: Could not connect to the API.');
    }
};

