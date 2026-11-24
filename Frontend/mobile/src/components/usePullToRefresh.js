import { useContext, useEffect, useRef } from "react";
import { PullToRefreshContext } from "./pullToRefreshContext";

export function usePullToRefresh(refresh, enabled = true) {
  const register = useContext(PullToRefreshContext);
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!register || !enabled || typeof refresh !== "function") return undefined;
    return register(() => refreshRef.current?.());
  }, [register, enabled, refresh]);
}
