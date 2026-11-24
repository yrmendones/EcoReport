import { useCallback, useEffect, useRef, useState } from "react";
import { FaArrowDown, FaExclamationCircle, FaSpinner } from "react-icons/fa";
import { PullToRefreshContext } from "./pullToRefreshContext";
import {
  canStartPull,
  getPullDistance,
  isHorizontalGesture,
  shouldTriggerPullRefresh,
} from "../utils/pullToRefresh";

const INTERACTIVE_SELECTOR = [
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "option",
  "label",
  "video",
  "audio",
  "iframe",
  "[contenteditable='true']",
  "[role='button']",
  "[role='slider']",
  "[data-pull-to-refresh='ignore']",
  ".leaflet-container",
].join(",");

function getScrollContainers(target) {
  const containers = [];
  let node = target instanceof Element ? target : target?.parentElement;
  while (node && node !== document.documentElement) {
    const overflowY = window.getComputedStyle(node).overflowY;
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
      containers.push(node);
    }
    node = node.parentElement;
  }
  if (!containers.length && document.scrollingElement) {
    containers.push(document.scrollingElement);
  }
  return containers;
}

function isInteractiveTarget(target) {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR));
}

function hasTextSelection() {
  return Boolean(window.getSelection?.()?.toString());
}

export function PullToRefreshProvider({ children }) {
  const handlersRef = useRef(new Set());
  const refreshingRef = useRef(false);
  const gestureRef = useRef(null);
  const resetTimerRef = useRef(null);
  const [indicator, setIndicator] = useState({ mode: "idle", pull: 0, left: 0, top: 0 });

  const register = useCallback((handler) => {
    handlersRef.current.add(handler);
    return () => handlersRef.current.delete(handler);
  }, []);

  const settleIndicator = useCallback((mode = "idle", message = "") => {
    window.clearTimeout(resetTimerRef.current);
    const nextMode = mode === "idle" ? "settling" : mode;
    setIndicator((current) => ({ ...current, mode: nextMode, pull: 0, message }));
    resetTimerRef.current = window.setTimeout(() => {
      setIndicator({ mode: "idle", pull: 0, left: 0, top: 0, message: "" });
    }, mode === "error" ? 2400 : 220);
  }, []);

  const refreshCurrentPage = useCallback(async () => {
    if (refreshingRef.current) return;
    const handlers = Array.from(handlersRef.current);
    if (!handlers.length) {
      settleIndicator();
      return;
    }

    refreshingRef.current = true;
    setIndicator((current) => ({ ...current, mode: "refreshing", pull: 26, message: "" }));
    try {
      const results = await Promise.allSettled(handlers.map((handler) => handler()));
      const failed = results.some((result) => result.status === "rejected");
      if (failed) {
        settleIndicator("error", "Couldn't refresh. Pull to retry.");
      } else {
        settleIndicator();
      }
    } finally {
      refreshingRef.current = false;
    }
  }, [settleIndicator]);

  useEffect(() => {
    const resetGesture = () => {
      gestureRef.current = null;
      if (!refreshingRef.current) settleIndicator();
    };

    const onTouchStart = (event) => {
      if (
        refreshingRef.current ||
        !handlersRef.current.size ||
        event.touches.length !== 1 ||
        isInteractiveTarget(event.target)
      ) return;

      const scrollContainers = getScrollContainers(event.target);
      const atTop = scrollContainers.length > 0 &&
        scrollContainers.every((container) => container.scrollTop <= 1);
      if (!canStartPull({
        atTop,
        touchCount: event.touches.length,
        interactive: isInteractiveTarget(event.target),
        hasRefreshHandler: handlersRef.current.size > 0,
      })) return;

      window.clearTimeout(resetTimerRef.current);
      const touch = event.touches[0];
      const pageScrollContainer = scrollContainers[scrollContainers.length - 1];
      const bounds = pageScrollContainer.getBoundingClientRect();
      if (hasTextSelection()) return;
      gestureRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        scrollContainers,
        left: bounds.left + bounds.width / 2,
        top: bounds.top + 8,
        pull: 0,
      };
    };

    const onTouchMove = (event) => {
      const gesture = gestureRef.current;
      if (!gesture) return;
      if (event.touches.length !== 1 || hasTextSelection()) {
        resetGesture();
        return;
      }

      const touch = event.touches[0];
      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;
      if (isHorizontalGesture(deltaX, deltaY)) {
        resetGesture();
        return;
      }
      if (gesture.scrollContainers.some((container) => container.scrollTop > 1)) {
        resetGesture();
        return;
      }

      const pull = getPullDistance(deltaY);
      gesture.pull = pull;
      if (pull > 0 && event.cancelable) event.preventDefault();
      setIndicator({
        mode: pull > 0 ? "pulling" : "settling",
        pull: Math.min(48, pull * 0.42),
        left: gesture.left,
        top: gesture.top,
        message: "",
      });
    };

    const onTouchEnd = () => {
      const gesture = gestureRef.current;
      gestureRef.current = null;
      if (!gesture) return;
      if (shouldTriggerPullRefresh(gesture.pull, handlersRef.current.size > 0)) {
        void refreshCurrentPage();
      } else {
        settleIndicator();
      }
    };

    document.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    document.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
    document.addEventListener("touchend", onTouchEnd, { capture: true, passive: true });
    document.addEventListener("touchcancel", resetGesture, { capture: true, passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart, true);
      document.removeEventListener("touchmove", onTouchMove, true);
      document.removeEventListener("touchend", onTouchEnd, true);
      document.removeEventListener("touchcancel", resetGesture, true);
      window.clearTimeout(resetTimerRef.current);
    };
  }, [refreshCurrentPage, settleIndicator]);

  const visible = indicator.mode !== "idle";
  const icon = indicator.mode === "refreshing"
    ? <FaSpinner className="animate-spin" />
    : indicator.mode === "error"
      ? <FaExclamationCircle />
      : <FaArrowDown style={{ transform: `rotate(${indicator.pull >= 30 ? 180 : 0}deg)` }} />;

  return (
    <PullToRefreshContext.Provider value={register}>
      {children}
      {visible && (
        <div
          className="pointer-events-none fixed z-[120] flex flex-col items-center gap-1 transition-[opacity,transform] duration-200"
          style={{
            left: indicator.left,
            top: indicator.top,
            opacity: indicator.mode === "pulling"
              ? Math.min(1, indicator.pull / 18)
              : indicator.mode === "settling" ? 0 : 1,
            transform: `translate(-50%, ${indicator.pull}px)`,
          }}
          role="status"
          aria-live="polite"
          aria-label={indicator.mode === "refreshing" ? "Refreshing page" : indicator.message || "Pull to refresh"}
        >
          <span className={`flex h-9 w-9 items-center justify-center rounded-full border border-[#C8DCC3] bg-white text-[#0B5D2A] shadow-md ${indicator.mode === "error" ? "text-red-600" : ""}`}>
            {icon}
          </span>
          {indicator.message && (
            <span className="rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold text-red-700 shadow-sm">
              {indicator.message}
            </span>
          )}
        </div>
      )}
    </PullToRefreshContext.Provider>
  );
}
