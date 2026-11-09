const getApiBaseUrl = () => {
    if (import.meta.env.DEV) {
        return ''; 
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:5000';
};

const API_BASE_URL = getApiBaseUrl();

const getToken = () => localStorage.getItem("token");

// ─── Staff idle-logout ───
// Reads the admin-configured web_session_timeout from system_settings
// (via /api/public/status) and, once per page load, enforces an idle
// logout for staff roles (admin / barangay_official). Mobile residents
// are unaffected this is web-panel-only, per the setting's name.
let sessionTimeoutMs = 30 * 60 * 1000;
let sessionTimeoutLoaded = false;

async function ensureSessionTimeout() {
    if (sessionTimeoutLoaded) return;
    sessionTimeoutLoaded = true;
    if (!getToken()) return; // not logged in — no need
    try {
        const res = await fetch(`${API_BASE_URL}/api/public/status`);
        const data = await res.json();
        const minutes = Number(data.web_session_timeout_minutes);
        if (Number.isFinite(minutes) && minutes >= 5 && minutes <= 1440) {
            sessionTimeoutMs = minutes * 60 * 1000;
        }
    } catch {
        // network hiccup - keep 30 min default
    }
}

function enforceStaffIdleTimeout() {
    const token = getToken();
    if (!token) return;
    const adminStr = localStorage.getItem("admin");
    if (!adminStr) return;

    let admin;
    try { admin = JSON.parse(adminStr); } catch { return; }
    if (admin.role !== "admin" && admin.role !== "barangay_official") return;

    const last = Number(localStorage.getItem("session_last_active"));
    if (Number.isFinite(last) && last > 0 && Date.now() - last > sessionTimeoutMs) {
        localStorage.removeItem("token");
        localStorage.removeItem("admin");
        localStorage.removeItem("session_last_active");
        window.location.href = "/admin-login";
        throw new Error("Session expired. Please log in again.");
    }
    // Sliding window: refresh last-active on every request
    localStorage.setItem("session_last_active", String(Date.now()));
}

export const apiFetch = async (endpoint, options = {}) => {
    await ensureSessionTimeout();
    enforceStaffIdleTimeout();

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