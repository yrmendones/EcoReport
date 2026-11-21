export const DEFAULT_PRODUCTION_API_URL = "https://ecoreport-production-f9b3.up.railway.app";

export function resolveApiBaseUrl({ isDevelopment, configuredUrl } = {}) {
  if (isDevelopment) return "";

  const baseUrl = String(configuredUrl || "").trim();
  if (!baseUrl) return DEFAULT_PRODUCTION_API_URL;

  try {
    const parsedUrl = new URL(baseUrl);
    const isHttpUrl = parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
    const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname);
    if (!isHttpUrl || isLocalHost) return DEFAULT_PRODUCTION_API_URL;
  } catch {
    return DEFAULT_PRODUCTION_API_URL;
  }

  return baseUrl.replace(/\/+$/, "");
}
