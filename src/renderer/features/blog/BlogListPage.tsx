import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { BlogWithTags, FolderTreeNode, ScrapeResult, Tag } from '../../../shared/types';
import { FolderTree } from '../../components/common/FolderTree';
import { useBatchSelect } from '../../hooks/useBatchSelect';
import { usePagination } from '../../hooks/usePagination';
import { formatDate } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';
import { BlogCard } from '../../components/blog/BlogCard';
import { ManualCollectTab } from './ManualCollectTab';
import { TimelineView } from './TimelineView';

export interface BlogListState {
  blogs: BlogWithTags[];
  total: number;
  loading: boolean;
  query: string;
  sortBy: string;
  filterTagId: number | null;
  filterTagName: string;
  filterFolderId: number | null;
  showFolderSidebar: boolean;
  viewMode: 'cards' | 'timeline';
  importing: boolean;
  scrapeOpen: boolean;
  scrapeUrl: string;
  scrapeLoading: boolean;
  scrapeResult: ScrapeResult | null;
  scrapeError: string;
  excludeSeries: boolean;
  activeTab: 'blogs' | 'manual';
  folderTree: FolderTreeNode[];
}

export type BlogListAction =
  | { type: 'SET_BLOGS'; payload: { blogs: BlogWithTags[]; total: number } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'SET_SORT_BY'; payload: string }
  | { type: 'SET_TAG_FILTER'; payload: { id: number | null; name: string } }
  | { type: 'SET_FOLDER_FILTER'; payload: number | null }
  | { type: 'TOGGLE_FOLDER_SIDEBAR'; payload: boolean }
  | { type: 'SET_VIEW_MODE'; payload: 'cards' | 'timeline' }
  | { type: 'SET_IMPORTING'; payload: boolean }
  | { type: 'SET_SCRAPE_OPEN'; payload: boolean }
  | { type: 'SET_SCRAPE_URL'; payload: string }
  | { type: 'SET_SCRAPE_LOADING'; payload: boolean }
  | { type: 'SET_SCRAPE_RESULT'; payload: ScrapeResult | null }
  | { type: 'SET_SCRAPE_ERROR'; payload: string }
  | { type: 'SET_EXCLUDE_SERIES'; payload: boolean }
  | { type: 'SET_ACTIVE_TAB'; payload: 'blogs' | 'manual' }
  | { type: 'SET_FOLDER_TREE'; payload: FolderTreeNode[] }
  | { type: 'BATCH_SET'; payload: Partial<BlogListState> };

export function blogListReducer(state: BlogListState, action: BlogListAction): BlogListState {
  switch (action.type) {
    case 'SET_BLOGS':
      return { ...state, blogs: action.payload.blogs, total: action.payload.total };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_QUERY':
      return { ...state, query: action.payload };
    case 'SET_SORT_BY':
      return { ...state, sortBy: action.payload };
    case 'SET_TAG_FILTER':
      return { ...state, filterTagId: action.payload.id, filterTagName: action.payload.name };
    case 'SET_FOLDER_FILTER':
      return { ...state, filterFolderId: action.payload };
    case 'TOGGLE_FOLDER_SIDEBAR':
      return { ...state, showFolderSidebar: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SET_IMPORTING':
      return { ...state, importing: action.payload };
    case 'SET_SCRAPE_OPEN':
      return { ...state, scrapeOpen: action.payload };
    case 'SET_SCRAPE_URL':
      return { ...state, scrapeUrl: action.payload };
    case 'SET_SCRAPE_LOADING':
      return { ...state, scrapeLoading: action.payload };
    case 'SET_SCRAPE_RESULT':
      return { ...state, scrapeResult: action.payload };
    case 'SET_SCRAPE_ERROR':
      return { ...state, scrapeError: action.payload };
    case 'SET_EXCLUDE_SERIES':
      return { ...state, excludeSeries: action.payload };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_FOLDER_TREE':
      return { ...state, folderTree: action.payload };
    case 'BATCH_SET':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

/** T2108: Color label → CSS color mapping (D72: component-level only, no global tokens) */
const COLOR_MAP: Record<string, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  purple: '#a855f7',
  gray: '#6b7280',
};

export function BlogListPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, dispatch] = useReducer(blogListReducer, searchParams, (sp: URLSearchParams): BlogListState => ({
    blogs: [],
    total: 0,
    loading: true,
    query: '',
    sortBy: 'updated_at',
    filterTagId: null,
    filterTagName: '',
    filterFolderId: null,
    showFolderSidebar: localStorage.getItem('sidebar_folder_blog') === '1',
    viewMode: 'cards',
    importing: false,
    scrapeOpen: false,
    scrapeUrl: '',
    scrapeLoading: false,
    scrapeResult: null,
    scrapeError: '',
    excludeSeries: localStorage.getItem('blog-list-tab') !== 'all',
    activeTab: sp.get('tab') === 'manual' ? 'manual' : 'blogs',
    folderTree: [],
  }));
  const {
    blogs, total, loading, query, sortBy, filterTagId, filterTagName,
    filterFolderId, showFolderSidebar, viewMode, importing,
    scrapeOpen, scrapeUrl, scrapeLoading, scrapeResult, scrapeError,
    excludeSeries, activeTab, folderTree,
  } = state;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollSentinelRef = useRef<HTMLDivElement | null>(null);
  const batch = useBatchSelect(blogs as { id: number }[]);
  const pagination = usePagination(20, total);
  const [error, setError] = useState<string | null>(null);
  const loadFolders = useCallback(async () => {
    if (!user) return;
    const r = await window.api.folderTree({ userId: user.id, type: 'blog' });
    if (r.success && r.data) dispatch({ type: 'SET_FOLDER_TREE', payload: r.data });
  }, [user]);
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Listen for main-process navigate events (e.g., tray → manual collect)
  useEffect(() => {
    if (!window.api.onNavigate) return;
    const unsub = window.api.onNavigate((path: string) => {
      if (path.includes('tab=manual')) dispatch({ type: 'SET_ACTIVE_TAB', payload: 'manual' });
    });
    if (typeof unsub === 'function') return unsub;
  }, []);

  const loadBlogs = useCallback(async () => {
    if (!user) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const r = await window.api.blogList({
        userId: user.id,
        query: query || undefined,
        tagId: filterTagId || undefined,
        folderId: filterFolderId || undefined,
        sortBy,
        sortOrder: 'desc',
        offset: pagination.offset,
        limit: pagination.limit,
        excludeSeries: excludeSeries || undefined,
      });
      if (r.success && r.data) {
        // T2108: Pinned blogs first
        const sorted = [...r.data.blogs].sort((a, b) => (b.isPinned ?? 0) - (a.isPinned ?? 0));
        // T2302: Batch fetch ref counts for each blog
        const withRefs = await Promise.all(
          sorted.map(async (blog) => {
            try {
              const refR = await window.api.refGetFrom({ sourceType: 'blog', sourceId: blog.id });
              return { ...blog, refCount: (refR.success && refR.data) ? refR.data.length : 0 };
            } catch { return { ...blog, refCount: 0 }; }
          }),
        );
        dispatch({ type: 'SET_BLOGS', payload: { blogs: withRefs, total: r.data.total } });
      }
    } catch (e) {
      console.error(e);
      setError('加载失败');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user, query, sortBy, filterTagId, filterFolderId, pagination.offset, pagination.limit, excludeSeries]);
  useEffect(() => {
    const tagId = searchParams.get('tagId');
    const tagName = searchParams.get('tagName');
    if (tagId) {
      dispatch({ type: 'SET_TAG_FILTER', payload: { id: Number(tagId), name: tagName || '' } });
    }
  }, [searchParams]);
  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  // Listen for blog:refresh from main process (e.g., MVF save)
  useEffect(() => {
    const unsubscribe = window.api.onBlogRefresh(() => {
      loadBlogs();
    });
    return unsubscribe;
  }, [loadBlogs]);

  // T2302: Infinite scroll IntersectionObserver
  useEffect(() => {
    const el = scrollSentinelRef.current;
    if (!el) return;
    const totalPages = Math.ceil(total / pagination.limit);
    if (pagination.page >= totalPages) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) pagination.next();
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [total, pagination.page, pagination.limit]);

  const handleDelete = async (id: number) => {
    if (!confirm('移至回收站？')) return;
    try {
      await window.api.blogDelete({ userId: user.id, blogId: id });
      loadBlogs();
    } catch (e) {
      console.error('delete blog failed', e);
    }
  };
  const handleImportMd = async () => {
    if (!user) {
      alert('请先登录');
      return;
    }
    try {
      const files = await window.api.selectFiles(['md', 'txt', 'html']);
      if (files?.length) {
        dispatch({ type: 'SET_IMPORTING', payload: true });
        try {
          const r = await window.api.blogImportMd({ userId: user.id, filePaths: files });
          if (r?.success === false) {
            alert(`导入失败: ${r.error || '未知错误'}`);
          } else loadBlogs();
        } catch {
          alert('导入失败');
        } finally {
          dispatch({ type: 'SET_IMPORTING', payload: false });
        }
        return;
      }
      fileInputRef.current?.click();
    } catch (err) {
      alert(`打开文件对话框失败: ${(err as Error).message}`);
    }
  };
  const handleWebFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.length) return;
    dispatch({ type: 'SET_IMPORTING', payload: true });
    try {
      const contents: { title: string; content: string }[] = [];
      for (const file of Array.from(e.target.files)) {
        const text = await file.text();
        contents.push({ title: file.name.replace(/\.(md|txt|html)$/i, ''), content: text });
      }
      await window.api.blogImportMd({ userId: user.id, filePaths: [], contents });
      loadBlogs();
    } catch (e) {
      console.error(e);
    } finally {
      dispatch({ type: 'SET_IMPORTING', payload: false });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const handleScrape = async () => {
    if (!scrapeUrl.trim() || !user) return;
    dispatch({ type: 'SET_SCRAPE_LOADING', payload: true });
    dispatch({ type: 'SET_SCRAPE_ERROR', payload: '' });
    dispatch({ type: 'SET_SCRAPE_RESULT', payload: null });
    try {
      const r = await window.api.scrapeWebpage(scrapeUrl.trim());
      if (r.success) dispatch({ type: 'SET_SCRAPE_RESULT', payload: r.data });
      else dispatch({ type: 'SET_SCRAPE_ERROR', payload: r.error });
    } catch {
      dispatch({ type: 'SET_SCRAPE_ERROR', payload: '抓取失败' });
    } finally {
      dispatch({ type: 'SET_SCRAPE_LOADING', payload: false });
    }
  };

  return (
    <div className="flex gap-6" style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      {/* Folder sidebar */}
      {user && (
        <div className="hidden lg:block relative">
          <button
            type="button"
            onClick={() => {
              const v = !showFolderSidebar;
              dispatch({ type: 'TOGGLE_FOLDER_SIDEBAR', payload: v });
              localStorage.setItem('sidebar_folder_blog', v ? '1' : '0');
            }}
            className="mb-2 rounded-[4px] px-2 py-1 text-[11px] hover:opacity-80 transition-opacity"
            style={{
              color: 'var(--text-secondary)',
              background: showFolderSidebar ? 'var(--bg-tertiary)' : 'transparent',
            }}
          >
            📂 {showFolderSidebar ? '收起' : '文件夹'}
          </button>
          {showFolderSidebar && (
            <div style={{ width: 170 }}>
              <FolderTree
                userId={user.id}
                type="blog"
                selectedFolderId={filterFolderId}
                onSelectFolder={(id) => dispatch({ type: 'SET_FOLDER_FILTER', payload: id })}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Tabs: 博客 / 批量手册 */}
        <div className="mb-4 flex gap-2 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'blogs' })}
            className="px-3 py-2 text-[14px] font-medium border-b-2 transition-colors"
            style={{
              color: activeTab === 'blogs' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              borderColor: activeTab === 'blogs' ? 'var(--accent-blue)' : 'transparent',
              marginBottom: -1,
            }}
          >
            博客
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'manual' })}
            className="px-3 py-2 text-[14px] font-medium border-b-2 transition-colors"
            style={{
              color: activeTab === 'manual' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              borderColor: activeTab === 'manual' ? 'var(--accent-blue)' : 'transparent',
              marginBottom: -1,
            }}
          >
            📘 批量手册
          </button>
        </div>
        {activeTab === 'manual' ? (
          <ManualCollectTab />
        ) : (
        <div>
        <div className="mb-3 flex items-center gap-4">
          <div
            className="inline-flex rounded-[4px] border p-0.5"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'SET_EXCLUDE_SERIES', payload: true });
                localStorage.setItem('blog-list-tab', 'independent');
              }}
              className="rounded-[3px] px-3 py-1 text-[12px] transition-colors"
              style={{
                background: excludeSeries ? 'var(--bg-tertiary)' : 'transparent',
                color: 'var(--text-secondary)',
              }}
            >
              独立博客
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'SET_EXCLUDE_SERIES', payload: false });
                localStorage.setItem('blog-list-tab', 'all');
              }}
              className="rounded-[3px] px-3 py-1 text-[12px] transition-colors"
              style={{
                background: !excludeSeries ? 'var(--bg-tertiary)' : 'transparent',
                color: 'var(--text-secondary)',
              }}
            >
              全部博客
            </button>
          </div>
        </div>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-[24px] font-semibold text-primary">
              博客 <span className="text-[14px] font-normal text-secondary">{total} 篇</span>
            </h2>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => dispatch({ type: 'SET_SCRAPE_OPEN', payload: true })} className="btn-primary !text-[13px]">
              收藏网页
            </button>
            <button
              type="button"
              onClick={handleImportMd}
              disabled={importing}
              className="btn-primary !text-[13px]"
              style={{ opacity: importing ? 0.4 : 1 }}
            >
              导入 MD
            </button>
            <Link to="/blog/new" className="btn-primary !text-[13px] no-underline inline-flex items-center">
              新建博客
            </Link>
            <button
              type="button"
              onClick={() => {
                batch.setIsBatchMode(!batch.isBatchMode);
              }}
              className="rounded-[4px] border px-2 py-1 text-[12px] hover:opacity-80 transition-opacity"
              style={{
                background: batch.isBatchMode ? 'var(--accent-blue)' : 'transparent',
                color: batch.isBatchMode ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                borderColor: 'var(--border-default)',
              }}
            >
              批量
            </button>
          </div>
        </div>

        <div className="mb-4 flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => dispatch({ type: 'SET_QUERY', payload: e.target.value })}
            placeholder="搜索博客标题..."
            className="max-w-xs surface-input px-3 py-1.5 text-[13px]"
          />
          <select
            value={sortBy}
            onChange={(e) => dispatch({ type: 'SET_SORT_BY', payload: e.target.value })}
            title="排序方式"
            className="max-w-[140px] surface-input px-3 py-1.5 text-[13px]"
          >
            <option value="updated_at">最近修改</option>
            <option value="created_at">创建时间</option>
            <option value="title">标题</option>
          </select>
        </div>

        {error && (
          <div className="py-8 text-center">
            <p className="text-[14px]" style={{ color: 'var(--accent-red)' }}>{error}</p>
            <button onClick={() => { setError(null); loadBlogs(); }} className="mt-3 text-[13px] hover:underline" style={{ color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>重试</button>
          </div>
        )}
        {!error && viewMode === 'timeline' && user ? (
          <TimelineView userId={user.id} />
        ) : !error && loading ? (
          <p className="py-12 text-center text-[14px] text-secondary">加载中...</p>
        ) : blogs.length === 0 ? (
          <div
            className="rounded-[6px] border border-dashed p-12 text-center"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <p className="text-[14px] text-secondary">
              {query ? '没有找到匹配的博客' : filterTagId ? '该标签下暂无博客' : '还没有博客'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Batch action bar */}
            {batch.isBatchMode && (
              <div
                className="flex items-center gap-3 rounded-[6px] border p-2.5"
                style={{ borderColor: 'var(--accent-blue)', background: 'var(--bg-secondary)' }}
              >
                <span className="text-[13px] text-primary">已选 {batch.selectedCount} 篇</span>
                <button
                  type="button"
                  onClick={batch.selectAll}
                  className="text-[12px] hover:underline"
                  style={{ color: 'var(--accent-blue)' }}
                >
                  全选
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(`将 ${batch.selectedCount} 篇博客移至回收站？`)) return;
                    try {
                      await window.api.blogBatchDelete({ userId: user.id, blogIds: [...batch.selectedIds] });
                      batch.clearSelection();
                      loadBlogs();
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  disabled={batch.selectedCount === 0}
                  className="text-[12px] hover:underline disabled:opacity-40"
                  style={{ color: 'var(--accent-red)' }}
                >
                  移至回收站
                </button>
                <button
                  type="button"
                  onClick={batch.clearSelection}
                  className="ml-auto text-[12px] hover:underline text-secondary"
                >
                  取消
                </button>
              </div>
            )}
            {/* Tag filter indicator */}
            {filterTagId && (
              <div
                className="flex items-center gap-2 rounded-[6px] border p-3"
                style={{ borderColor: 'var(--accent-blue)', background: 'var(--bg-secondary)' }}
              >
                <span className="text-[13px] text-secondary">筛选标签:</span>
                <span className="tag !text-[13px]" style={{ cursor: 'default' }}>
                  {filterTagName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'SET_TAG_FILTER', payload: { id: null, name: '' } });
                  }}
                  className="ml-auto text-[12px] hover:underline"
                  style={{ color: 'var(--accent-red)' }}
                >
                  清除筛选
                </button>
              </div>
            )}
            {blogs.map((blog: BlogWithTags) => (
              <BlogCard
                key={blog.id}
                blog={blog}
                showExcerpt={true}
                isBatchSelected={batch.isBatchMode ? batch.selectedIds.has(blog.id) : undefined}
                onBatchToggle={batch.isBatchMode ? () => batch.toggleSelect(blog.id) : undefined}
                onClick={() => {
                  if (batch.isBatchMode) {
                    batch.toggleSelect(blog.id);
                    return;
                  }
                  navigate(`/blog/${blog.id}`);
                }}
              >
                {/* Footer: folder move + delete */}
                <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity duration-[0.15s]" style={{ borderColor: 'var(--border-default)' }}>
                  <select
                    value=""
                    onChange={async (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const fid = e.target.value ? Number(e.target.value) : null;
                      try {
                        await window.api.folderMoveItem({ userId: user.id, itemType: 'blog', itemId: blog.id, folderId: fid });
                        loadBlogs();
                        loadFolders();
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    className="text-[10px] rounded-[3px] border px-1 py-0.5 outline-none"
                    style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', maxWidth: 60 }}
                    title="移至文件夹"
                  >
                    <option value="">移至</option>
                    <option value="0">根目录</option>
                    {folderTree.map((f: FolderTreeNode) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(blog.id); }}
                    className="text-[12px] hover:underline"
                    style={{ color: 'var(--accent-red)' }}
                  >
                    删除
                  </button>
                </div>
              </BlogCard>
            ))}
          </div>
        )}

        {/* T2302: Infinite scroll sentinel */}
        {total > pagination.limit && pagination.page < Math.ceil(total / pagination.limit) && (
          <div ref={scrollSentinelRef} className="h-4" />
        )}
        {loading && <p className="text-center py-4 text-[13px]" style={{ color: 'var(--text-secondary)' }}>加载更多...</p>}

        {/* T2302: memos-style infinite scroll — no pagination buttons */}

        {/* Hidden file input for web import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt,.html"
          multiple
          style={{ display: 'none' }}
          onChange={handleWebFileImport}
          aria-label="导入 Markdown 文件"
        />

        {/* Scrape modal */}
        {scrapeOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => dispatch({ type: 'SET_SCRAPE_OPEN', payload: false })}
          >
            <div
              className="w-full max-w-[560px] rounded-[8px] border p-6 shadow-2xl"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[16px] font-semibold text-primary">收藏网页</h3>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'BATCH_SET', payload: { scrapeOpen: false, scrapeResult: null, scrapeError: '', scrapeUrl: '' } });
                  }}
                  className="text-[14px] text-secondary"
                >
                  ✕
                </button>
              </div>
              {!scrapeResult ? (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={scrapeUrl}
                      onChange={(e) => dispatch({ type: 'SET_SCRAPE_URL', payload: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                      placeholder="粘贴网页 URL"
                      className="input-dark flex-1"
                    />
                    <button type="button" onClick={handleScrape} disabled={scrapeLoading} className="btn-primary">
                      {scrapeLoading ? '抓取中...' : '抓取'}
                    </button>
                  </div>
                  {scrapeError && (
                    <p className="mt-3 text-[13px]" style={{ color: 'var(--accent-red)' }}>
                      {scrapeError}
                    </p>
                  )}
                </>
              ) : (
                <div>
                  <div
                    className="rounded-[4px] border p-3 mb-3"
                    style={{ background: 'rgba(63,185,80,0.1)', borderColor: 'var(--accent-green)' }}
                  >
                    <p className="text-[15px] font-semibold" style={{ color: 'var(--accent-green)' }}>
                      ✓ {scrapeResult.title}
                    </p>
                    <p className="text-[12px] mt-0.5 text-secondary">{scrapeResult.siteName}</p>
                  </div>
                  <p
                    className="mb-4 line-clamp-4 rounded-[4px] p-3 text-[13px]"
                    style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                  >
                    {scrapeResult.excerpt}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!user) return;
                        try {
                          await window.api.blogCreate({
                            userId: user.id,
                            title: scrapeResult.title,
                            format: 'md',
                            content: scrapeResult.content,
                          });
                          loadBlogs();
                          dispatch({ type: 'BATCH_SET', payload: { scrapeOpen: false, scrapeUrl: '', scrapeResult: null } });
                        } catch {
                          dispatch({ type: 'SET_SCRAPE_ERROR', payload: '导入失败' });
                        }
                      }}
                      className="btn-primary"
                    >
                      导入为博客
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        dispatch({ type: 'SET_SCRAPE_RESULT', payload: null });
                        dispatch({ type: 'SET_SCRAPE_ERROR', payload: '' });
                      }}
                      className="btn-primary"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
        )}
      </div>
    </div>
  );
}
