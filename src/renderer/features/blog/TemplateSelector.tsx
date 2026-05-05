import type { BlogTemplate } from '../../../shared/templates';
import { BUILTIN_TEMPLATES } from '../../../shared/templates';

interface Props {
  onSelect: (template: BlogTemplate) => void;
}

export function TemplateSelector({ onSelect }: Props) {
  return (
    <div style={{ maxWidth: 640, margin: '40px auto' }}>
      <h2
        className="mb-2 text-center text-[22px] font-bold"
        style={{ color: 'var(--text-primary)' }}
      >
        新建博客
      </h2>
      <p
        className="mb-8 text-center text-[14px]"
        style={{ color: 'var(--text-secondary)' }}
      >
        选择一个模板开始写作，或从空白博客自由发挥
      </p>

      <div className="grid grid-cols-2 gap-3">
        {BUILTIN_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t)}
            className="rounded-[8px] border p-5 text-left transition-all duration-150"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-default)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-blue)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.transform = '';
            }}
          >
            <div className="mb-2 text-[24px]">{iconMap[t.icon] || '📄'}</div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t.name}
            </div>
            <div className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              {t.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const iconMap: Record<string, string> = {
  Code2: '💻',
  CalendarDays: '📅',
  BookOpen: '📖',
  Users: '👥',
  FileText: '📄',
};
