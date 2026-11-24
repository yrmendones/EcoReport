import { useCallback, useEffect, useRef, useState } from "react";
import {
  PUBLIC_CACHE_TOKEN,
  publicRequestCache,
} from "./sessionRequestCache";
import { usePullToRefresh } from "../components/usePullToRefresh";

export const PUBLIC_RESOURCE_CACHE_TTL_MS = 30_000;

export function usePublicResource(resource, fetcher) {
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const cached = publicRequestCache.get(resource, PUBLIC_CACHE_TOKEN);
  const [view, setView] = useState(() => ({
    resource,
    data: cached?.value ?? null,
    loading: !cached,
    error: "",
  }));
  const [retryTicket, setRetryTicket] = useState({ resource: null, version: 0 });
  const currentView = view.resource === resource ? view : null;
  const data = currentView?.data ?? cached?.value ?? null;
  const loading = data === null && (currentView?.loading ?? true);
  const error = currentView?.error ?? "";

  const refresh = useCallback(async () => {
    const cachedAtStart = publicRequestCache.get(resource, PUBLIC_CACHE_TOKEN);
    try {
      const value = await publicRequestCache.fetch(
        resource,
        PUBLIC_CACHE_TOKEN,
        () => fetcherRef.current()
      );
      setView({ resource, data: value, loading: false, error: "" });
      return value;
    } catch (requestError) {
      setView((current) => ({
        resource,
        data: current.resource === resource
          ? current.data
          : cachedAtStart?.value ?? null,
        loading: false,
        error: requestError.message || "Failed to load data.",
      }));
      throw requestError;
    }
  }, [resource]);

  usePullToRefresh(refresh, !loading);

  useEffect(() => {
    const forceRetry = retryTicket.resource === resource;
    let active = true;
    let activeRequest = null;

    const refreshIfStale = (force = false) => {
      const cachedAtStart = publicRequestCache.get(resource, PUBLIC_CACHE_TOKEN);
      if (
        !force &&
        publicRequestCache.isFresh(
          resource,
          PUBLIC_CACHE_TOKEN,
          PUBLIC_RESOURCE_CACHE_TTL_MS
        )
      ) return;
      if (activeRequest) return;

      if (!cachedAtStart) {
        setView({ resource, data: null, loading: true, error: "" });
      }

      const request = publicRequestCache.fetch(
        resource,
        PUBLIC_CACHE_TOKEN,
        () => fetcherRef.current()
      );
      activeRequest = request;
      const finishRequest = () => {
        if (activeRequest === request) activeRequest = null;
      };
      request.then(
        (value) => {
          if (active) setView({ resource, data: value, loading: false, error: "" });
          finishRequest();
        },
        (requestError) => {
          if (active) {
            setView((current) => ({
              resource,
              data: current.resource === resource
                ? current.data
                : cachedAtStart?.value ?? null,
              loading: false,
              error: requestError.message || "Failed to load data.",
            }));
          }
          finishRequest();
        }
      );
    };

    refreshIfStale(forceRetry);
    const onForeground = () => refreshIfStale();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshIfStale();
    };
    window.addEventListener("focus", onForeground);
    window.addEventListener("pageshow", onForeground);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.removeEventListener("focus", onForeground);
      window.removeEventListener("pageshow", onForeground);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [resource, retryTicket]);

  return {
    data,
    loading,
    error,
    retry: () => setRetryTicket((current) => ({
      resource,
      version: current.resource === resource ? current.version + 1 : 1,
    })),
  };
}
