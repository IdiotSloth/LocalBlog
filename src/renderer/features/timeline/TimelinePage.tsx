import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileEdit, Library, Clock } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import type { BlogWithTags, KnowledgeFileWithTags } from '../../../shared/types';

interface TimelineItem {
  id: number;
  type: 'blog' | 'knowledge';
  title: string;
  date: string;
  excerpt?: string;
}

export function TimelinePage() {
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'blog' | 'knowledge'>('all');
  const abortedRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    abortedRef.current = false;
    setLoading(true);
    setError(null);
    try {
      const [blogR, kbR] = await Promise.all([
        window.api.blogList({ userId: user.id, limit: 200, offset: 0, sortBy: 'created_at', sortOrder: 'DESC' }),
        window.api.kbList({ userId: user.id, limit: 200, offset: 0, sortBy: 'created_at', sortOrder: 'DESC' }),
      ]);

      if (abortedRef.current) return;

      const timeline: TimelineItem[] = [];

      if (blogR.success && blogR.data?.blogs) {
        for (const b of blogR.data.blogs) {
          timeline.push({
            id: b.id,
            type: 'blog',
            title: b.title || '(无标题)',
            date: String(b.createdAt || b.updatedAt || ''),
            excerpt: b.title || '',
          });
        }
      }

      if (kbR.success && kbR.data?.files) {
        for (const f of kbR.data.files) {
          timeline.push({
            id: f.id,
            type: 'knowledge',
            title: f.filename || '(无名称)',
            date: String(f.createdAt || f.updatedAt || ''),
            excerpt: f.fileType || '',
          });
        }
      }

      // Sort by date descending (String() guards against non-string values)
      timeline.sort((a, b) => String(b.date).localeCompare(String(a.date)));
      setItems(timeline);
    } catch (e) {
      console.error('[Timeline]', e);
      if (!abortedRef.current) setError('加载失败');
    } finally {
      if (!abortedRef.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
    return () => { abortedRef.current = true; };
  }, [loadData]);

  // Group items by month
  const grouped = items.reduce<Record<string, TimelineItem[]>>((acc, item) => {
    const month = String(item.date).slice(0, 7); // YYYY-MM
    if (!acc[month]) acc[month] = [];
    acc[month]!.push(item);
    return acc;
  }, {});

  const filteredGroups = Object.entries(grouped).map(([month, monthItems]) => ({
    month,
    items: monthItems.filter((i) => typeFilter === 'all' || i.type === typeFilter),
  })).filter((g) => g.items.length > 0);

  const typeLabel = (t: string) => t === 'blog' ? '博客' : '知识库';
  const typeColor = (t: string) => t === 'blog' ? 'var(--accent-blue)' : 'var(--accent-green)';

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold" style={{ color: 'var(--text-primary)' }}>时间轴</h1>
        <p className="mt-1 text-[14px]" style={{ color: 'var(--text-muted)' }}>知识的生长过程，按时间倒序排列</p>
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-2">
        {[
          { id: 'all' as const, label: '全部' },
          { id: 'blog' as const, label: '博客' },
          { id: 'knowledge' as const, label: '知识库' },
        ].map((f) => (
          <button key={f.id} type="button" onClick={() => setTypeFilter(f.id)}
            className="rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors"
            style={{
              background: typeFilter === f.id ? 'var(--bg-tertiary)' : 'transparent',
              color: typeFilter === f.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
              border: '1px solid',
              borderColor: typeFilter === f.id ? 'var(--accent-blue)' : 'var(--border-default)',
              cursor: 'pointer',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-12 text-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
      ) : error ? (
        <div className="py-12 text-center rounded-[10px] border" style={{ borderColor: 'var(--accent-red)', background: 'var(--bg-secondary)' }}>
          <p className="text-[14px]" style={{ color: 'var(--accent-red)' }}>{error}</p>
          <button type="button" onClick={loadData} className="mt-3 text-[13px] hover:underline" style={{ color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>重试</button>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="py-12 text-center rounded-[10px] border border-dashed" style={{ borderColor: 'var(--border-default)' }}>
          <Clock size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>暂无内容</p>
        </div>
      ) : (
        <div className="relative pl-8">
          {/* Vertical line */}
          <div className="absolute left-[13px] top-2 bottom-2 w-[2px]" style={{ background: 'var(--border-default)' }} />

          {filteredGroups.map(({ month, items: monthItems }) => (
            <div key={month} className="mb-8">
              {/* Month marker */}
              <div className="relative flex items-center mb-4 -ml-8">
                <div className="w-[28px] h-[28px] rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: 'var(--accent-blue)', background: 'var(--bg-primary)' }}>
                  <div className="w-[10px] h-[10px] rounded-full" style={{ background: 'var(--accent-blue)' }} />
                </div>
                <h2 className="ml-3 text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {month.replace('-', ' 年 ')} 月
                </h2>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {monthItems.map((item) => (
                  <Link key={`${item.type}-${item.id}`}
                    to={item.type === 'blog' ? `/blog/${item.id}` : `/knowledge`}
                    className="no-underline block rounded-[8px] border p-3 transition-colors hover:border-[var(--accent-blue)]"
                    style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
                    <div className="flex items-center gap-2">
                      {item.type === 'blog'
                        ? <FileEdit size={14} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                        : <Library size={14} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
                      }
                      <span className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ background: 'var(--bg-tertiary)', color: typeColor(item.type) }}>
                        {typeLabel(item.type)}
                      </span>
                      <span className="flex-1 truncate text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        {item.title}
                      </span>
                      <span className="shrink-0 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {String(item.date).slice(0, 10)}
                      </span>
                    </div>
                    {item.excerpt && (
                      <p className="mt-1 ml-6 text-[12px] line-clamp-1" style={{ color: 'var(--text-secondary)' }}>
                        {item.excerpt}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
