/**
 * T2109: Warm empty state component — replaces generic "no items" text
 * with inviting messaging consistent with the "Cozy Study" design language.
 */

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center py-16 px-4">
      <span className="text-[40px] opacity-30 select-none">{icon}</span>
      <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      {description && (
        <p className="max-w-xs text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 rounded-[6px] px-4 py-2 text-[13px] font-medium transition-opacity hover:opacity-85"
          style={{ background: 'var(--accent-blue)', color: '#fff' }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
