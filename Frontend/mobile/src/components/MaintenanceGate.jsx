import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import MaintenanceScreen from "./MaintenanceScreen";

/**
 * Wraps the mobile router so every route is gated by maintenance mode.
 */
export default function MaintenanceGate({ children }) {
  const [state, setState] = useState(null); // null = checking

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch("/api/public/status");
        if (cancelled) return;
        setState({
          enabled: !!data.maintenance_mode,
          message: data.maintenance_message || "The app is under maintenance. Please try again later.",
        });
      } catch {
        // Fail-open - a network blip must not lock residents out
        if (!cancelled) setState({ enabled: false, message: "" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === null) {
    return (
      <div className="min-h-[100dvh] bg-[#E5E7EB] flex items-center justify-center">
        <p className="text-[#0B5D2A] font-bold">Loading…</p>
      </div>
    );
  }

  if (state.enabled) {
    return <MaintenanceScreen message={state.message} />;
  }
  return children;
}