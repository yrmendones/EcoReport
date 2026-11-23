import { handleAuthenticationFailure } from "./utils/authSession.js";
import { resolveApiBaseUrl } from "./utils/apiBaseUrl.js";

// In dev, use relative paths so Vite Proxy intercepts /api requests
// In prod, use the deployed backend URL from the hosting dashboard
export const API_BASE_URL = resolveApiBaseUrl({
    isDevelopment: import.meta.env?.DEV,
    configuredUrl: import.meta.env?.VITE_API_URL,
});

const getToken = () => localStorage.getItem("token");
const inFlightGetRequests = new Map();
const API_GET_TIMEOUT_MS = 30_000;

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

const performApiFetch = async (endpoint, options = {}, timingLabel = "") => {
    const startedAt = performance.now();
    const method = String(options.method || "GET").toUpperCase();
    const timeoutController =
        method === "GET" && !options.signal && typeof AbortController !== "undefined"
            ? new AbortController()
            : null;
    const timeoutId = timeoutController
        ? setTimeout(() => timeoutController.abort(), API_GET_TIMEOUT_MS)
        : null;
    try {
        const requestOptions = timeoutController
            ? { ...options, signal: timeoutController.signal }
            : options;
        const response = await apiFetchResponse(endpoint, requestOptions);

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
    } finally {
        if (timeoutId !== null) clearTimeout(timeoutId);
        if (import.meta.env?.DEV) {
            const durationMs = Math.round(performance.now() - startedAt);
            const label = timingLabel || (
                endpoint === "/api/users/me"
                    ? "resident profile refresh"
                    : endpoint === "/api/notifications"
                        ? "notification fetch"
                        : `${String(options.method || "GET").toUpperCase()} ${endpoint}`
            );
            console.info(`[request timing] ${label}: ${durationMs} ms`);
        }
    }
};

export const apiFetch = (endpoint, options = {}, timingLabel = "") => {
    const method = String(options.method || "GET").toUpperCase();
    const hasRequestSpecificOptions = Object.keys(options).some((key) => key !== "method");
    if (method !== "GET" || hasRequestSpecificOptions) {
        return performApiFetch(endpoint, options, timingLabel);
    }

    const token = getToken();
    const key = JSON.stringify([endpoint, token]);
    const inFlight = inFlightGetRequests.get(key);
    if (inFlight) return inFlight;

    let request;
    request = performApiFetch(endpoint, options, timingLabel).finally(() => {
        if (inFlightGetRequests.get(key) === request) {
            inFlightGetRequests.delete(key);
        }
    });
    inFlightGetRequests.set(key, request);
    return request;
};
