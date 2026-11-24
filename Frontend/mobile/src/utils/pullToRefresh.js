export const PULL_TO_REFRESH_THRESHOLD_PX = 72;
export const MAX_PULL_DISTANCE_PX = 118;

export function getPullDistance(deltaY) {
  return Math.min(MAX_PULL_DISTANCE_PX, Math.max(0, deltaY) * 0.65);
}

export function isHorizontalGesture(deltaX, deltaY) {
  return Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
}

export function shouldTriggerPullRefresh(distance, hasRefreshHandler) {
  return hasRefreshHandler && distance >= PULL_TO_REFRESH_THRESHOLD_PX;
}

export function canStartPull({ atTop, touchCount, interactive, hasRefreshHandler }) {
  return atTop && touchCount === 1 && !interactive && hasRefreshHandler;
}
