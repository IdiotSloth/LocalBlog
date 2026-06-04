import { type ReactNode, createContext, useCallback, useContext, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed right-4 bottom-4 z-[9999] flex flex-col gap-2"
        style={{ maxWidth: 360 }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-[6px] px-4 py-3 text-[13px] font-medium shadow-lg"
            style={{
              background: t.type === 'success' ? '#238636' : t.type === 'error' ? '#3a1a1a' : 'var(--bg-secondary)',
              color: t.type === 'success' ? '#ffffff' : t.type === 'error' ? '#f85149' : 'var(--text-primary)',
              border:
                t.type !== 'info'
                  ? `1px solid ${t.type === 'success' ? '#238636' : '#da3633'}`
                  : '1px solid var(--border-default)',
              animation: 'toast-slide-in .3s ease',
            }}
          >
            {t.type === 'success' ? '✓ ' : t.type === 'error' ? '✗ ' : ''}
            {t.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

// ---- Inline Toast component (used by QuickNote) ----
interface InlineToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

export function Toast({ message, actionLabel, onAction, onDismiss }: InlineToastProps) {
  return (
    <div
      className="mt-2 flex items-center gap-3 rounded-[6px] px-3 py-2 text-[13px]"
      style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
    >
      <span className="flex-1">{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="rounded-[3px] px-2 py-0.5 text-[12px] font-medium hover:opacity-80 transition-opacity"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          {actionLabel}
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-[14px] hover:opacity-60 transition-opacity"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ×
        </button>
      )}
    </div>
  );
}
