import { handleAuthenticationFailure } from "./utils/authSession";
import { resolveApiBaseUrl } from "./utils/apiBaseUrl";

// In dev, use relative paths so Vite Proxy intercepts /api requests
// In prod, use the deployed backend URL from the hosting dashboard
export const API_BASE_URL = resolveApiBaseUrl({
    isDevelopment: import.meta.env.DEV,
    configuredUrl: import.meta.env.VITE_API_URL,
});

const getToken = () => localStorage.getItem("token");

/**
 * Fetch an API response while applying shared session invalidation handling.
 * Network failures never reach the response handler, so they cannot sign a
 * resident out. Callers that need the raw Response (for example file uploads)
 * can use this helper and parse the body themselves.
 */
export const apiFetchResponse = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;

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

    if (!response.ok) {
        const errorData = await response.clone().json().catch(() => ({}));
        handleAuthenticationFailure(errorData, { hadToken: Boolean(token), token });
    }

    return response;
};

export const apiFetch = async (endpoint, options = {}) => {
    const response = await apiFetchResponse(endpoint, options);

    // Handle 204 No Content
    if (response.status === 204) {
        return {};
    }

    // Maintenance mode active — the backend blocked a resident/guest call.
    if (response.status === 503) {
        const data = await response.clone().json().catch(() => ({}));
        if (data.error === 'maintenance') {
            window.location.href = '/';
            throw new Error('Maintenance mode active');
        }
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.error || "Something went wrong");
        error.code = data.code;
        error.status = response.status;
        throw error;
    }
    return data;
};
