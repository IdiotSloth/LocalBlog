import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, FileEdit, Library, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';

interface BookmarkItem {
  id: number;
  targetType: string;
  targetId: number;
  title: string;
  createdAt: string;
}

export function BookmarksPage() {
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortedRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    abortedRef.current = false;
    setLoading(true);
    setError(null);
    try {
      const r = await window.api.bookmarkList(user.id);
      if (!abortedRef.current && r.success && r.data) {
        setItems(r.data);
      }
    } catch (e) {
      console.error('[Bookmarks]', e);
      if (!abortedRef.current) setError('加载失败');
    } finally {
      if (!abortedRef.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
    return () => { abortedRef.current = true; };
  }, [loadData]);

  const handleRemove = async (item: BookmarkItem) => {
    if (!user) return;
    await window.api.bookmarkRemove({ userId: user.id, targetType: item.targetType, targetId: item.targetId });
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const typeLabel = (t: string) => t === 'blog' ? '博客' : '知识库';
  const typeColor = (t: string) => t === 'blog' ? 'var(--accent-blue)' : 'var(--accent-green)';
  const typeIcon = (t: string) => t === 'blog' ? FileEdit : Library;
  const itemLink = (item: BookmarkItem) => item.targetType === 'blog' ? `/blog/${item.targetId}` : '/knowledge';

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="mb-8 flex items-center gap-3">
        <Bookmark size={24} style={{ color: 'var(--accent-blue)' }} />
        <div>
          <h1 className="text-[28px] font-bold" style={{ color: 'var(--text-primary)' }}>收藏</h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--text-muted)' }}>{items.length > 0 ? `${items.length} 项收藏` : '快速访问收藏的内容'}</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
      ) : error ? (
        <div className="py-12 text-center rounded-[10px] border" style={{ borderColor: 'var(--accent-red)', background: 'var(--bg-secondary)' }}>
          <p className="text-[14px]" style={{ color: 'var(--accent-red)' }}>{error}</p>
          <button type="button" onClick={loadData} className="mt-3 text-[13px] hover:underline" style={{ color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>重试</button>
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center rounded-[10px] border border-dashed" style={{ borderColor: 'var(--border-default)' }}>
          <Bookmark size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>暂无收藏</p>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>在博客预览或知识库中点击 Bookmark 图标添加收藏</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = typeIcon(item.targetType);
            return (
              <div key={item.id} className="group flex items-center rounded-[8px] border transition-colors hover:border-[var(--accent-blue)]"
                style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
                <Link to={itemLink(item)}
                  className="no-underline flex flex-1 items-center gap-3 px-4 py-3"
                  style={{ color: 'var(--text-primary)' }}>
                  <Icon size={16} style={{ color: typeColor(item.targetType), flexShrink: 0 }} />
                  <span className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ background: 'var(--bg-tertiary)', color: typeColor(item.targetType) }}>
                    {typeLabel(item.targetType)}
                  </span>
                  <span className="flex-1 truncate text-[14px] font-medium">{item.title}</span>
                  <span className="shrink-0 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </Link>
                <button type="button" onClick={() => handleRemove(item)} title="取消收藏" aria-label="取消收藏"
                  className="shrink-0 px-3 py-1 text-[13px] opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--accent-red)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
