// client/src/services/staticDataService.js
import api from '../api/axiosConfig';

const STATIC_DATA_URL = '/data/static-lists';

// Cache variable to store lists after the first successful fetch
let staticDataCache = null;

/**
 * Fetches and caches comprehensive lists of countries and languages.
 * @returns {Promise<{countries: string[], languages: string[]}>}
 */
export const getStaticLists = async () => {
    // Return from cache if data is already available
    if (staticDataCache) {
        return staticDataCache;
    }

    try {
        console.log("Fetching global static lists...");
        const response = await api.get(STATIC_DATA_URL);
        
        // Store the result in the cache and return it
        staticDataCache = response.data;
        return staticDataCache;
    } catch (error) {
        console.error("Failed to fetch static global lists:", error);
        
        // Re-throw a custom error message for the UI
        if (error.response) {
            throw new Error(error.response.data.message || 'Error fetching global configuration lists.');
        }
        throw new Error('Network error: Could not load countries or languages.');
    }
};

/**
 * Utility to check if an attribute requires global data.
 * @param {string[] | undefined} defaultOptions
 * @returns {string | null} Returns the required global key ('countries' or 'languages') or null.
 */
export const getGlobalDataKey = (defaultOptions) => {
    if (!defaultOptions || defaultOptions.length === 0) return null;
    
    const option = defaultOptions[0];
    if (option === 'GLOBAL_COUNTRIES') return 'countries';
    if (option === 'GLOBAL_LANGUAGES') return 'languages';
    
    return null;
};