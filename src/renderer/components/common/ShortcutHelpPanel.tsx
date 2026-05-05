import { SHORTCUTS, formatKey } from '../../../shared/shortcuts';

interface Props {
  onClose: () => void;
}

export function ShortcutHelpPanel({ onClose }: Props) {
  const groups = ['global', 'editor'] as const;
  const groupLabels: Record<string, string> = { global: '全局', editor: '编辑器' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-[10px] border p-6 shadow-2xl"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)',
          maxWidth: 440,
          width: '90vw',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            快捷键一览
          </h2>
          <button type="button" onClick={onClose} className="text-[16px]" style={{ color: 'var(--text-secondary)' }}>
            ✕
          </button>
        </div>

        {groups.map((group) => {
          const items = SHORTCUTS.filter((s) => s.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-4">
              <div
                className="mb-2 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                {groupLabels[group]}
              </div>
              <div className="space-y-1.5">
                {items.map((s) => (
                  <div key={s.key} className="flex items-center justify-between">
                    <kbd
                      className="rounded-[3px] px-2 py-0.5 font-mono text-[12px]"
                      style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-default)',
                      }}
                    >
                      {formatKey(s.key)}
                    </kbd>
                    <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                      {s.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
