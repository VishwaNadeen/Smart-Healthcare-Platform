import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
};

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant, duration?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<ToastVariant, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info", duration = 3500) => {
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

      <div className="pointer-events-none fixed left-1/2 top-4 z-[9999] flex w-full max-w-md -translate-x-1/2 flex-col gap-3 px-4">
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
      className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm ${toastStyles[toast.variant]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{toast.message}</p>
        <button
          type="button"
          onClick={() => onClose(toast.id)}
          className="text-xs font-semibold opacity-70 transition hover:opacity-100"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
