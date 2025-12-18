// client/src/services/attributeService.js
import api from '../api/axiosConfig';

const ATTRIBUTE_URL = '/attributes';
const USERTYPE_URL = '/attributes';

// Get all attributes from the server
export const getAllAttributes = async () => {
    const response = await api.get(ATTRIBUTE_URL);
    return response.data;
};

// Create a new attribute
export const createAttribute = async (attributeData) => {
    const response = await api.post(ATTRIBUTE_URL, attributeData);
    return response.data;
};

// Update an existing attribute
export const updateAttribute = async (slug, attributeData) => {
    const response = await api.put(`${ATTRIBUTE_URL}/${slug}`, attributeData);
    return response.data;
};

// Delete an attribute
export const deleteAttribute = async (slug) => {
    const response = await api.delete(`${ATTRIBUTE_URL}/${slug}`);
    return response.data;
};

// Utility function to process form data before sending (e.g., options string to array)
export const processAttributeFormData = (formData) => {
    return {
        ...formData,
        defaultOptions: formData.defaultOptions 
            ? formData.defaultOptions.split(',').map(s => s.trim()).filter(s => s) 
            : undefined,
    };
};