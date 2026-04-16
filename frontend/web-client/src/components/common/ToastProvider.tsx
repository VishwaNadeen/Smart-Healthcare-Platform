import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ToastContext, type ToastVariant } from "./toastContext";

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
};

const toastStyles: Record<ToastVariant, string> = {
  success: "border-emerald-600 bg-emerald-600 text-white",
  error: "border-rose-600 bg-rose-600 text-white",
  info: "border-blue-600 bg-blue-600 text-white",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info", duration = 2000) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);

      setToasts((current) => [
        ...current,
        {
          id,
          message,
          variant,
          duration,
        },
      ]);
    },
    []
  );

  const value = useMemo(
    () => ({
      showToast,
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed left-1/2 top-20 z-[9999] flex w-auto max-w-full -translate-x-1/2 flex-col items-center gap-3 px-4">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: (id: number) => void;
}) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onClose(toast.id);
    }, toast.duration);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [onClose, toast.duration, toast.id]);

  return (
    <div
      className={`pointer-events-auto w-fit max-w-[90vw] rounded-2xl border px-4 py-3 shadow-lg ${toastStyles[toast.variant]} sm:max-w-sm`}
    >
      <div className="flex items-start gap-3">
        <p className="text-sm font-medium leading-5">{toast.message}</p>
      </div>
    </div>
  );
}
