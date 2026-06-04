import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BlogWithTags, KnowledgeFileWithTags } from '../../../shared/types';
import { useAuthStore } from '../../stores/auth-store';
import { BlogCard } from '../../components/blog/BlogCard';

// T2306: Discrete weighted font sizes based on absolute count
function tagCloudFontSize(count: number): string {
  if (count >= 11) return 'var(--text-lg, 18px)';
  if (count >= 6) return 'var(--text-base, 16px)';
  if (count >= 3) return 'var(--text-sm, 14px)';
  return 'var(--text-xs, 12px)';
}

interface TagItem {
  id: number;
  userId: number;
  name: string;
  description?: string;
  count: number;
  blogCount: number;
  kbCount: number;
}
interface ResultItem {
  id: number;
  title: string;
  type: 'blog' | 'knowledge';
  updatedAt?: string;
}

// ── Reducer ──

type TagAction =
  | { type: 'SET_TAGS'; tags: TagItem[] }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_NEW_NAME'; name: string }
  | { type: 'START_EDIT'; id: number; name: string }
  | { type: 'CANCEL_EDIT' }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'SELECT_TAG'; tag: TagItem | null }
  | { type: 'SET_RESULTS'; results: ResultItem[] }
  | { type: 'SET_RESULTS_LOADING'; v: boolean }
  | { type: 'SET_TAG_FILTER'; val: string }
  | { type: 'SET_DEBOUNCED_FILTER'; val: string };

interface TagState {
  tags: TagItem[];
  loading: boolean;
  newName: string;
  editingId: number | null;
  editingName: string;
  error: string;
  selectedTag: TagItem | null;
  results: ResultItem[];
  resultsLoading: boolean;
  tagFilter: string;
  debouncedFilter: string;
}

const initialState: TagState = {
  tags: [],
  loading: true,
  newName: '',
  editingId: null,
  editingName: '',
  error: '',
  selectedTag: null,
  results: [],
  resultsLoading: false,
  tagFilter: '',
  debouncedFilter: '',
};

export function tagManageReducer(state: TagState, action: TagAction): TagState {
  switch (action.type) {
    case 'SET_TAGS': return { ...state, tags: action.tags };
    case 'SET_LOADING': return { ...state, loading: action.loading };
    case 'SET_NEW_NAME': return { ...state, newName: action.name };
    case 'START_EDIT': return { ...state, editingId: action.id, editingName: action.name };
    case 'CANCEL_EDIT': return { ...state, editingId: null, editingName: '', error: '' };
    case 'SET_ERROR': return { ...state, error: action.error };
    case 'SELECT_TAG': return { ...state, selectedTag: action.tag };
    case 'SET_RESULTS': return { ...state, results: action.results, resultsLoading: false };
    case 'SET_RESULTS_LOADING': return { ...state, resultsLoading: action.v };
    case 'SET_TAG_FILTER': return { ...state, tagFilter: action.val };
    case 'SET_DEBOUNCED_FILTER': return { ...state, debouncedFilter: action.val };
    default: return state;
  }
}

export function TagManagePage() {
  const user = useAuthStore((s) => s.user);
  const [state, dispatch] = useReducer(tagManageReducer, initialState);
  const filterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTags = useCallback(async () => {
    if (!user) return;
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const res = (await window.api.tagList(user.id)) as { success: boolean; data?: TagItem[] };
      dispatch({ type: 'SET_TAGS', tags: res?.data || [] });
    } catch {
      dispatch({ type: 'SET_TAGS', tags: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [user]);

  useEffect(() => { loadTags(); }, [loadTags]);

  const handleFilterChange = useCallback((val: string) => {
    dispatch({ type: 'SET_TAG_FILTER', val });
    if (filterTimer.current) clearTimeout(filterTimer.current);
    filterTimer.current = setTimeout(() => dispatch({ type: 'SET_DEBOUNCED_FILTER', val }), 200);
  }, []);

  const filteredTags = state.debouncedFilter
    ? state.tags.filter((t) => t.name.toLowerCase().includes(state.debouncedFilter.toLowerCase()))
    : state.tags;

  const maxTagCount = Math.max(1, ...state.tags.map((t) => t.blogCount + t.kbCount));

  const handleCreate = async () => {
    if (!user || !state.newName.trim()) return;
    dispatch({ type: 'SET_ERROR', error: '' });
    try {
      const data = await window.api.tagCreate({ userId: user.id, name: state.newName.trim() });
      const resp = data as { success: boolean; data?: TagItem; error?: string };
      if (resp.success) {
        dispatch({ type: 'SET_NEW_NAME', name: '' });
        loadTags();
      } else {
        dispatch({ type: 'SET_ERROR', error: resp.error || '创建失败' });
      }
    } catch {
      dispatch({ type: 'SET_ERROR', error: '创建失败' });
    }
  };

  const handleSaveEdit = async (tagId: number) => {
    if (!state.editingName.trim()) return;
    try {
      await window.api.tagUpdate({ userId: user.id, tagId, name: state.editingName.trim() });
      dispatch({ type: 'CANCEL_EDIT' });
      loadTags();
    } catch {
      dispatch({ type: 'SET_ERROR', error: '重命名失败' });
    }
  };

  const handleDelete = async (tagId: number) => {
    if (!confirm('确定要删除此标签吗？关联的文章不会删除，但标签会被移除。')) return;
    try {
      const result = await window.api.tagDelete({ userId: user.id, tagId });
      const resp = result as { success: boolean; error?: string };
      if (resp?.success) {
        loadTags();
      } else {
        dispatch({ type: 'SET_ERROR', error: resp?.error || '删除失败' });
      }
    } catch {
      dispatch({ type: 'SET_ERROR', error: '删除失败' });
    }
  };

  const startEdit = (tag: TagItem) => dispatch({ type: 'START_EDIT', id: tag.id, name: tag.name });

  const unusedCount = state.tags.filter((t) => (t.count ?? 0) === 0).length;

  return (
    <div className="mx-auto max-w-[780px]">
      <h2 className="mb-6 text-xl font-bold">标签管理</h2>

      {unusedCount > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-[6px] border p-3" style={{ borderColor: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
          <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>⚠️ {unusedCount} 个标签未被使用</span>
          <button type="button" onClick={async () => {
            const unused = state.tags.filter((t) => (t.count ?? 0) === 0);
            if (!confirm(`确定删除 ${unused.length} 个未使用的标签？`)) return;
            for (const t of unused) {
              try { await window.api.tagDelete({ userId: user.id, tagId: t.id }); } catch { /* skip */ }
            }
            loadTags();
          }} className="text-[12px] font-medium hover:underline" style={{ color: 'var(--accent-red)' }}>清理未使用标签</button>
        </div>
      )}

      <div className="mb-6 flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <input type="text" value={state.newName} onChange={(e) => dispatch({ type: 'SET_NEW_NAME', name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} placeholder="新标签名称..." aria-label="新标签名称" className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-base)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-light)] focus:ring-1 focus:ring-[var(--color-primary-light)]" />
        <button type="button" onClick={handleCreate} disabled={!state.newName.trim()} className="rounded-md bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-40 transition-all">创建标签</button>
      </div>

      {state.error && <div className="mb-4 rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-600">{state.error}</div>}

      {!state.loading && state.tags.length > 0 && (
        <input type="text" value={state.tagFilter} onChange={(e) => handleFilterChange(e.target.value)} placeholder="搜索标签..." aria-label="搜索标签" className="mb-4 rounded-[6px] border px-3 py-1.5 text-[13px] outline-none w-full max-w-[300px]" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
      )}

      {state.loading ? (
        <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">加载中...</div>
      ) : state.tags.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center"><p className="text-sm text-[var(--color-text-muted)]">暂无标签，创建一个吧</p></div>
      ) : filteredTags.length === 0 ? (
        <p className="py-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>没有匹配的标签</p>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {filteredTags.map((tag) => {
            const tagColor = (tag as any).color || 'var(--accent-blue)';
            return (
            <div key={tag.id} className="group rounded-[8px] border p-4 cursor-pointer transition-all duration-[0.15s] hover:scale-[1.02]" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)', borderLeft: `4px solid ${tagColor}` }}
              onClick={async () => {
                const isSelected = state.selectedTag?.id === tag.id;
                dispatch({ type: 'SELECT_TAG', tag: isSelected ? null : tag });
                if (!isSelected) {
                  dispatch({ type: 'SET_RESULTS_LOADING', v: true });
                  try {
                    const [blogsRes, kbRes] = await Promise.all([
                      window.api.blogList({ userId: user?.id, tagId: tag.id, limit: 20 }),
                      user ? window.api.kbList({ userId: user.id, tagId: tag.id, limit: 20 }) : Promise.resolve(null),
                    ]);
                    const items: ResultItem[] = [];
                    if (blogsRes?.success && blogsRes.data?.blogs) items.push(...blogsRes.data.blogs.map((b: BlogWithTags) => ({ id: b.id, title: b.title, type: 'blog' as const, updatedAt: b.updatedAt })));
                    if (kbRes?.success && kbRes.data?.files) items.push(...kbRes.data.files.map((f: KnowledgeFileWithTags) => ({ id: f.id, title: f.filename, type: 'knowledge' as const })));
                    dispatch({ type: 'SET_RESULTS', results: items });
                  } catch { dispatch({ type: 'SET_RESULTS', results: [] }); }
                } else { dispatch({ type: 'SET_RESULTS', results: [] }); }
              }}>
              {state.editingId === tag.id ? (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <input type="text" value={state.editingName} onChange={(e) => dispatch({ type: 'START_EDIT', id: tag.id, name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(tag.id); if (e.key === 'Escape') dispatch({ type: 'CANCEL_EDIT' }); }} placeholder={tag.name} aria-label="编辑标签名称" className="w-full rounded border px-2 py-1 text-[13px] outline-none" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                  <button type="button" onClick={() => handleSaveEdit(tag.id)} className="text-[11px] hover:underline" style={{ color: 'var(--accent-green)' }}>保存</button>
                </div>
              ) : (
                <>
                  <div className="text-[16px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{tag.name}</div>
                  <div className="text-[12px] space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
                    <div>{(tag.blogCount ?? 0)} 篇博客</div>
                    <div>{(tag.kbCount ?? 0)} 个素材</div>
                  </div>
                  {(tag.blogCount ?? 0) === 0 && (tag.kbCount ?? 0) === 0 && <div className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>未使用</div>}
                  <div className="mt-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => startEdit(tag)} className="text-[11px] rounded-[3px] px-2 py-0.5 hover:opacity-80" style={{ color: 'var(--accent-blue)' }}>重命名</button>
                    <button type="button" onClick={() => handleDelete(tag.id)} className="text-[11px] rounded-[3px] px-2 py-0.5 hover:opacity-80" style={{ color: 'var(--accent-red)' }}>删除</button>
                  </div>
                </>
              )}
            </div>
          );})}
        </div>
      )}

      {state.selectedTag && (
        <TagResultsSection tag={state.selectedTag} loading={state.resultsLoading} results={state.results} user={user} onClose={() => { dispatch({ type: 'SELECT_TAG', tag: null }); dispatch({ type: 'SET_RESULTS', results: [] }); }} />
      )}

      <p className="mt-6 text-xs text-[var(--color-text-muted)]">提示：点击标签名可查看关联的博客和知识库文件。悬停标签可编辑或删除。</p>
    </div>
  );
}

// T2306: Tag results with BlogCard feed + KB tab switching
function TagResultsSection({ tag, loading, results, user, onClose }: {
  tag: TagItem; loading: boolean; results: ResultItem[];
  user: { id: number } | null; onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'blog' | 'knowledge'>('blog');
  const blogs = results.filter(r => r.type === 'blog');
  const kbItems = results.filter(r => r.type === 'knowledge');

  return (
    <div className="mt-6 rounded-[8px] border p-5" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          标签「{tag.name}」({results.length})
        </h3>
        <button type="button" onClick={onClose} className="text-[13px] hover:underline" style={{ color: 'var(--text-secondary)' }}>关闭</button>
      </div>

      {/* Tab switcher */}
      <div className="mb-3 flex gap-2">
        <button type="button" onClick={() => setActiveTab('blog')}
          className="rounded-[4px] px-3 py-1.5 text-[13px] transition-colors"
          style={{
            background: activeTab === 'blog' ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
            color: activeTab === 'blog' ? 'var(--text-on-accent)' : 'var(--text-secondary)',
          }}>
          博客 ({blogs.length})
        </button>
        <button type="button" onClick={() => setActiveTab('knowledge')}
          className="rounded-[4px] px-3 py-1.5 text-[13px] transition-colors"
          style={{
            background: activeTab === 'knowledge' ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
            color: activeTab === 'knowledge' ? 'var(--text-on-accent)' : 'var(--text-secondary)',
          }}>
          知识库 ({kbItems.length})
        </button>
      </div>

      {loading ? (
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>加载中...</p>
      ) : results.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--text-placeholder)' }}>该标签下暂无内容</p>
      ) : activeTab === 'blog' ? (
        blogs.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--text-placeholder)' }}>该标签下暂无博客</p>
        ) : (
          <div className="space-y-3">
            {blogs.map(item => (
              <BlogCard key={`blog-${item.id}`} blog={{ id: item.id, title: item.title, updatedAt: item.updatedAt || '' } as any} showExcerpt={false} />
            ))}
          </div>
        )
      ) : (
        kbItems.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--text-placeholder)' }}>该标签下暂无知识库文件</p>
        ) : (
          <div className="space-y-1">
            {kbItems.map(item => (
              <Link key={`kb-${item.id}`} to="/knowledge" className="flex items-center gap-3 rounded-[4px] px-3 py-2 text-[14px] no-underline hover:opacity-80 transition-opacity" style={{ background: 'var(--bg-primary)' }}>
                <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                <span className="rounded-[3px] px-1.5 py-0.5 text-[11px]" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>知识库</span>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
