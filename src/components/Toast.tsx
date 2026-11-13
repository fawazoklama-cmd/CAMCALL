import { CheckCircle2, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  kind?: 'success' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-20 right-5 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2.5rem)] sm:w-auto pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/95 backdrop-blur-md border border-[#f3d5e5] shadow-lg shadow-pink-950/10 text-[#2d1b28]"
        >
          {toast.kind === 'info' ? (
            <Info className="w-5 h-5 text-violet-600 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-[#db2777] shrink-0" aria-hidden="true" />
          )}
          <span className="text-sm font-medium flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="p-1 rounded-lg text-[#6e4f62] hover:text-[#2d1b28] hover:bg-pink-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
