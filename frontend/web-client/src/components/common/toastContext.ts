import { createContext, useContext } from "react";

export type ToastVariant = "success" | "error" | "info";

export type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant, duration?: number) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
