import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { sessionRequestCache } from "./sessionRequestCache";

export const RESIDENT_PROFILE_RESOURCE = "GET /api/users/me";
export const SESSION_REVALIDATION_INTERVAL_MS = 60_000;

export function getResidentProfile(token = localStorage.getItem("token")) {
  if (!token) return null;

  const cached = sessionRequestCache.get(RESIDENT_PROFILE_RESOURCE, token);
  if (cached) return cached.value;

  try {
    if (localStorage.getItem("token") !== token) return null;
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function saveResidentProfile(token, profile) {
  if (!token || !profile || localStorage.getItem("token") !== token) return null;

  sessionRequestCache.set(RESIDENT_PROFILE_RESOURCE, token, profile);
  try {
    localStorage.setItem("user", JSON.stringify(profile));
  } catch {
    // The in-memory profile remains available for the current app session.
  }
  return profile;
}

export function updateResidentProfile(token, updates) {
  const current = getResidentProfile(token);
  if (!current || !updates) return null;
  return saveResidentProfile(token, { ...current, ...updates });
}

export function useResidentProfile() {
  const token = localStorage.getItem("token");
  const [retryVersion, setRetryVersion] = useState(0);
  const initialProfile = getResidentProfile(token);
  const [view, setView] = useState(() => ({
    token,
    profile: initialProfile,
    loading: !initialProfile,
    error: "",
  }));
  const currentView = view.token === token ? view : null;
  const profile = currentView?.profile ?? getResidentProfile(token);
  const loading = !profile && (currentView?.loading ?? true);
  const error = currentView?.error ?? "";

  useEffect(() => {
    if (!token) return undefined;

    const cached = sessionRequestCache.get(RESIDENT_PROFILE_RESOURCE, token);
    if (
      retryVersion === 0 &&
      cached &&
      sessionRequestCache.isFresh(
        RESIDENT_PROFILE_RESOURCE,
        token,
        SESSION_REVALIDATION_INTERVAL_MS
      )
    ) {
      return undefined;
    }

    let active = true;
    const request = sessionRequestCache.fetch(
      RESIDENT_PROFILE_RESOURCE,
      token,
      () => apiFetch("/api/users/me")
    );
    request.then(
      (data) => {
        if (active && localStorage.getItem("token") === token) {
          saveResidentProfile(token, data);
          setView({ token, profile: data, loading: false, error: "" });
        }
      },
      (requestError) => {
        if (active && localStorage.getItem("token") === token) {
          setView((current) => ({
            token,
            profile: current.token === token ? current.profile : getResidentProfile(token),
            loading: false,
            error: requestError.message || "Failed to refresh resident profile.",
          }));
        }
      }
    );

    return () => {
      active = false;
    };
  }, [retryVersion, token]);

  return {
    profile,
    loading,
    error,
    retry: () => setRetryVersion((version) => version + 1),
  };
}
