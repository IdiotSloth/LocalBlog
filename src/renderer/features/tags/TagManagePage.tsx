import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';

interface TagItem { id: number; userId: number; name: string; count: number; }
interface ResultItem { id: number; title: string; type: 'blog' | 'knowledge'; updatedAt?: string; }

export function TagManagePage() {
  const user = useAuthStore((s) => s.user);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');
  const [selectedTag, setSelectedTag] = useState<TagItem | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  const loadTags = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await window.api.tagList(user.id) as { success: boolean; data?: TagItem[] };
      setTags(res?.data || []);
    } catch {
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;
    setError('');
    try {
      const data = await window.api.tagCreate({ userId: user.id, name: newName.trim() });
      const resp = data as { success: boolean; data?: TagItem; error?: string };
      if (resp.success) {
        setNewName('');
        loadTags();
      } else {
        setError(resp.error || '创建失败');
      }
    } catch {
      setError('创建失败');
    }
  };

  const handleSaveEdit = async (tagId: number) => {
    if (!editingName.trim()) return;
    try {
      await window.api.tagUpdate({ tagId, name: editingName.trim() });
      setEditingId(null);
      loadTags();
    } catch {
      setError('重命名失败');
    }
  };

  const handleDelete = async (tagId: number) => {
    if (!confirm('确定要删除此标签吗？关联的文章不会删除，但标签会被移除。')) return;
    try {
      const result = await window.api.tagDelete(tagId);
      const resp = result as { success: boolean; error?: string };
      if (resp && resp.success) {
        loadTags();
      } else {
        setError(resp?.error || '删除失败');
      }
    } catch {
      setError('删除失败');
    }
  };

  const startEdit = (tag: TagItem) => {
    setEditingId(tag.id);
    setEditingName(tag.name);
  };

  return (
    <div className="max-w-2xl">
      <h2 className="mb-6 text-xl font-bold">标签管理</h2>

      {/* Zero-use cleanup */}
      {tags.some((t) => (t.count ?? 0) === 0) && (
        <div className="mb-4 flex items-center gap-3 rounded-[6px] border p-3" style={{ borderColor: 'var(--accent-amber)', background: 'var(--bg-secondary)' }}>
          <span className="text-[13px]" style={{ color: 'var(--accent-amber)' }}>⚠️ {tags.filter((t) => (t.count ?? 0) === 0).length} 个标签未被使用</span>
          <button type="button" onClick={async () => {
            const unused = tags.filter((t) => (t.count ?? 0) === 0);
            if (!confirm(`确定删除 ${unused.length} 个未使用的标签？`)) return;
            for (const t of unused) {
              try { await window.api.tagDelete(t.id); } catch {}
            }
            loadTags();
          }} className="text-[12px] font-medium hover:underline" style={{ color: 'var(--accent-red)' }}>清理未使用标签</button>
        </div>
      )}

      {/* Create new tag */}
      <div className="mb-6 flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="新标签名称..."
          className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-base)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-light)] focus:ring-1 focus:ring-[var(--color-primary-light)]"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={!newName.trim()}
          className="rounded-md bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-40 transition-all"
        >
          创建标签
        </button>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>}

      {/* Tag list */}
      {loading ? (
        <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">加载中...</div>
      ) : tags.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">暂无标签，创建一个吧</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="group flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-2 shadow-sm transition-all hover:shadow-md hover:border-[var(--color-primary-light)]"
            >
              {editingId === tag.id ? (
                <>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(tag.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    className="w-28 rounded border border-[var(--color-primary-light)] bg-[var(--color-bg-base)] px-2 py-0.5 text-sm outline-none"
                  />
                  <button type="button" onClick={() => handleSaveEdit(tag.id)} className="text-xs text-green-600 hover:underline">保存</button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-xs text-[var(--color-text-muted)] hover:underline">取消</button>
                </>
              ) : (
                <>
                  <span
                    className="text-sm font-medium text-[var(--color-text-primary)] cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                    onClick={async () => {
                      setSelectedTag(selectedTag?.id === tag.id ? null : tag);
                      if (selectedTag?.id !== tag.id) {
                        setResultsLoading(true);
                        try {
                          const [blogsRes, kbRes] = await Promise.all([
                            window.api.blogList({ userId: user!.id, tagId: tag.id, limit: 20 }),
                            user ? window.api.kbList({ userId: user.id, tagId: tag.id, limit: 20 }) : Promise.resolve(null),
                          ]);
                          const items: ResultItem[] = [];
                          const br = blogsRes as any; if (br?.success && br.data?.blogs) items.push(...br.data.blogs.map((b: any) => ({ id: b.id, title: b.title, type: 'blog' as const, updatedAt: b.updatedAt })));
                          const kr = kbRes as any; if (kr?.success && kr.data?.files) items.push(...kr.data.files.map((f: any) => ({ id: f.id, title: f.filename, type: 'knowledge' as const })));
                          setResults(items);
                        } catch { setResults([]); }
                        setResultsLoading(false);
                      } else { setResults([]); }
                    }}
                    title={`查看标签"${tag.name}"关联的内容`}
                  >
                    {tag.name}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-[var(--color-text-muted)]" title={`${tag.count ?? 0} 篇关联`}>
                    {tag.count ?? 0}
                  </span>
                  {(tag.count ?? 0) === 0 && <span className="text-[11px]" style={{ color: 'var(--accent-amber)' }}>⚠️ 未使用</span>}
                  <button type="button" onClick={() => startEdit(tag)} className="ml-1 text-xs text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-primary)] transition-all">编辑</button>
                  <button type="button" onClick={() => handleDelete(tag.id)} className="text-xs text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all">删除</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filtered results */}
      {selectedTag && (
        <div className="mt-6 rounded-[8px] border p-5" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              标签「{selectedTag.name}」关联的内容 ({results.length})
            </h3>
            <button type="button" onClick={() => { setSelectedTag(null); setResults([]); }} className="text-[13px] hover:underline" style={{ color: 'var(--text-secondary)' }}>关闭</button>
          </div>
          {resultsLoading ? <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>加载中...</p>
          : results.length === 0 ? <p className="text-[13px]" style={{ color: 'var(--text-placeholder)' }}>该标签下暂无内容</p>
          : <div className="space-y-2">
            {results.map((item) => (
              <Link key={`${item.type}-${item.id}`} to={item.type === 'blog' ? `/blog/${item.id}` : `/knowledge`}
                className="flex items-center gap-3 rounded-[4px] px-3 py-2 text-[14px] no-underline hover:opacity-80 transition-opacity"
                style={{ background: 'var(--bg-primary)' }}>
                <span>{item.type === 'blog' ? '📝' : '📄'}</span>
                <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                <span className="rounded-[3px] px-1.5 py-0.5 text-[11px]" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{item.type === 'blog' ? '博客' : '知识库'}</span>
              </Link>
            ))}
          </div>}
        </div>
      )}

      <p className="mt-6 text-xs text-[var(--color-text-muted)]">
        提示：点击标签名可查看关联的博客和知识库文件。悬停标签可编辑或删除。
      </p>
    </div>
  );
}
