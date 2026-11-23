import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { FullScreenLoading } from "./LoadingIndicator";
import MaintenanceScreen from "./MaintenanceScreen";

let maintenanceStatusRequest = null;

function fetchMaintenanceStatus() {
  if (!maintenanceStatusRequest) {
    const request = apiFetch("/api/public/status");
    maintenanceStatusRequest = request;
    const clearRequest = () => {
      if (maintenanceStatusRequest === request) maintenanceStatusRequest = null;
    };
    request.then(clearRequest, clearRequest);
  }
  return maintenanceStatusRequest;
}

/**
 * Wraps the mobile router so every route is gated by maintenance mode.
 */
export default function MaintenanceGate({ children }) {
  const [state, setState] = useState(null); // null = checking

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchMaintenanceStatus();
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
    return <FullScreenLoading label="Loading app..." />;
  }

  if (state.enabled) {
    return <MaintenanceScreen message={state.message} />;
  }
  return children;
}
