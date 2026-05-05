import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, actionLabel, onAction, onDismiss, duration = 2000 }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => { setVisible(false); setTimeout(onDismiss, 300); }, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 rounded-[6px] border px-4 py-2.5 shadow-lg transition-all duration-300"
      style={{
        borderColor: 'var(--accent-green)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
        opacity: visible ? 1 : 0,
      }}
    >
      <span className="text-[13px]">{message}</span>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="text-[12px] font-medium hover:underline" style={{ color: 'var(--accent-blue)' }}>{actionLabel}</button>
      )}
    </div>
  );
}
