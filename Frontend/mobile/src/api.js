// In dev, use relative paths so Vite Proxy intercepts /api requests
// In prod, use the deployed backend URL from the hosting dashboard
const getApiBaseUrl = () => {
    if (import.meta.env.DEV) {
        return ''; 
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:5000';
};

const API_BASE_URL = getApiBaseUrl();

const getToken = () => localStorage.getItem("token");

export const apiFetch = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Default headers
    const headers = {
        ...options.headers,
    };

    // Only set JSON content-type if we aren't sending a file
    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const token = getToken();
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    // Handle 204 No Content
    if (response.status === 204) {
        return {};
    }

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
    }
    return data;
};