import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "../components/common/toastContext";

type ToastLocationState = {
  successMessage?: string;
  errorMessage?: string;
  infoMessage?: string;
};

export function useLocationToast() {
  const location = useLocation();
  const { showToast } = useToast();
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastKeyRef.current === location.key) {
      return;
    }

    const state =
      typeof location.state === "object" && location.state !== null
        ? (location.state as ToastLocationState)
        : null;

    if (!state) {
      return;
    }

    if (state.successMessage) {
      showToast(state.successMessage, "success");
    }

    if (state.errorMessage) {
      showToast(state.errorMessage, "error");
    }

    if (state.infoMessage) {
      showToast(state.infoMessage, "info");
    }

    lastKeyRef.current = location.key;
  }, [location.key, location.state, showToast]);
}
