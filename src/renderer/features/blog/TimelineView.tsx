import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface BlogItem {
  id: number;
  title: string;
  format: string;
  createdAt: string;
  tags: { id: number; name: string }[];
}

interface MonthGroup {
  month: string; // '2026-05'
  label: string; // '2026年 五月'
  items: BlogItem[];
}

interface Props {
  userId: number;
}

export function TimelineView({ userId }: Props) {
  const [groups, setGroups] = useState<MonthGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    window.api
      .blogList({ userId, sortBy: 'created_at', sortOrder: 'desc', limit: 200 })
      .then((r) => {
        if (r.success && r.data) {
          setGroups(groupByMonth(r.data.blogs || []));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  if (loading)
    return (
      <p className="py-12 text-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>
        加载中...
      </p>
    );
  if (groups.length === 0)
    return (
      <div
        className="rounded-[6px] border border-dashed p-12 text-center"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          还没有博客，开始记录吧
        </p>
      </div>
    );

  return (
    <div className="timeline-container" style={{ paddingLeft: 32 }}>
      {groups.map((g) => (
        <div key={g.month} className="mb-8">
          <h3 className="mb-4 text-[16px] font-semibold" style={{ color: 'var(--accent-blue)' }}>
            {g.label}
          </h3>
          {g.items.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              className="timeline-item mb-5 block w-full rounded-[8px] border p-4 text-left transition-all duration-200"
              style={{
                borderColor: 'var(--border-default)',
                background: 'var(--bg-secondary)',
                borderLeft: '3px solid var(--accent-blue)',
                animationDelay: `${idx * 0.05}s`,
              }}
              onClick={() => navigate(`/blog/${item.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[12px] font-mono" style={{ color: 'var(--text-placeholder)' }}>
                  {new Date(item.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                </span>
                <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  {item.title || '无标题'}
                </span>
                <span
                  className="rounded-[3px] px-1.5 py-0.5 font-mono text-[10px] uppercase"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  {item.format}
                </span>
              </div>
              {item.tags?.length > 0 && (
                <div className="mt-1.5 flex gap-1">
                  {item.tags.map((t) => (
                    <span key={t.id} className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      #{t.name}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function groupByMonth(blogs: BlogItem[]): MonthGroup[] {
  const map = new Map<string, BlogItem[]>();
  for (const b of blogs) {
    const key = b.createdAt.substring(0, 7); // '2026-05'
    if (!map.has(key)) map.set(key, []);
    map.get(key)?.push(b);
  }
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  return Array.from(map.entries()).map(([month, items]) => {
    const [y, m] = month.split('-');
    return { month, label: `${y}年 ${months[Number(m) - 1]}`, items };
  });
}
