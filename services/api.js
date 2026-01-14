
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://travelapi-34zi.onrender.com';

const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
};

/**
 * Standardized API client for NuviaTravel.
 * Handles base URL, default headers, and common error parsing.
 */
export const api = {
    get: async (endpoint, params = {}) => {
        try {
            const url = new URL(`${API_BASE}${endpoint}`);
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null) {
                    url.searchParams.append(key, params[key]);
                }
            });

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: DEFAULT_HEADERS,
            });
            return handleResponse(response);
        } catch (error) {
            throw handleError(error);
        }
    },

    post: async (endpoint, body = {}) => {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: DEFAULT_HEADERS,
                body: JSON.stringify(body),
            });
            return handleResponse(response);
        } catch (error) {
            throw handleError(error);
        }
    },

    // Expose raw base for specialized calls if needed
    BASE_URL: API_BASE
};

async function handleResponse(response) {
    if (!response.ok) {
        let errorBody;
        try {
            errorBody = await response.json();
        } catch (e) {
            errorBody = { message: response.statusText };
        }
        const error = new Error(errorBody.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.data = errorBody;
        throw error;
    }

    // Some endpoints might return empty body (e.g. 204)
    if (response.status === 204) {
        return null;
    }

    return response.json();
}

function handleError(error) {
    console.error('API Call Failed:', error);
    // Enhance logic here if we want global toast notifications later
    return error;
}
