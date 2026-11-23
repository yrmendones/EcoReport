const NOTIFICATION_COUNT_UPDATED_EVENT = "ecoreport:notification-count-updated";

function isCurrentBrowserSession(token) {
  try {
    return Boolean(token) && globalThis.localStorage?.getItem("token") === token;
  } catch {
    return false;
  }
}

export function createSessionRequestCache({
  isCurrentSession = () => true,
  now = () => Date.now(),
  measure = () => globalThis.performance?.now?.() ?? Date.now(),
  onDuration = () => {},
} = {}) {
  const values = new Map();
  const requests = new Map();
  const revisions = new Map();
  const keyFor = (resource, token) => JSON.stringify([resource, token]);
  const get = (resource, token) => {
    if (!token || !isCurrentSession(token)) return null;
    return values.get(keyFor(resource, token)) || null;
  };

  return {
    get,

    isFresh(resource, token, ttlMs) {
      const entry = get(resource, token);
      return Boolean(entry && now() - entry.fetchedAt < ttlMs);
    },

    set(resource, token, value) {
      if (!token || !isCurrentSession(token)) return false;
      const key = keyFor(resource, token);
      values.set(key, { value, fetchedAt: now() });
      revisions.set(key, (revisions.get(key) || 0) + 1);
      return true;
    },

    fetch(resource, token, fetcher) {
      if (!token || !isCurrentSession(token)) {
        return Promise.reject(new Error("The resident session changed before the request started."));
      }

      const key = keyFor(resource, token);
      const inFlight = requests.get(key);
      if (inFlight) return inFlight;

      const revisionAtStart = revisions.get(key) || 0;
      const startedAt = measure();
      let request;
      request = Promise.resolve()
        .then(fetcher)
        .then((value) => {
          if (!isCurrentSession(token)) return value;

          const currentRevision = revisions.get(key) || 0;
          if (currentRevision !== revisionAtStart) {
            return values.get(key)?.value ?? value;
          }

          values.set(key, { value, fetchedAt: now() });
          revisions.set(key, currentRevision + 1);
          return value;
        })
        .finally(() => {
          try {
            onDuration(resource, Math.max(0, measure() - startedAt));
          } finally {
            if (requests.get(key) === request) requests.delete(key);
          }
        });

      requests.set(key, request);
      return request;
    },
  };
}

export const sessionRequestCache = createSessionRequestCache({
  isCurrentSession: isCurrentBrowserSession,
  onDuration(resource, durationMs) {
    if (import.meta.env?.DEV) {
      console.info(`[request timing] ${resource}: ${Math.round(durationMs)} ms`);
    }
  },
});

export const NOTIFICATION_CACHE_TTL_MS = 30_000;

export function updateCachedUnreadCount(token, count) {
  const updated = sessionRequestCache.set(
    "GET /api/notifications/unread-count",
    token,
    count
  );
  if (!updated || typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_COUNT_UPDATED_EVENT, {
      detail: { token, count },
    })
  );
}

export { NOTIFICATION_COUNT_UPDATED_EVENT };
