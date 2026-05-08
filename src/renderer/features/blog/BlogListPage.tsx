import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { BlogWithTags, FolderTreeNode } from '../../../shared/types';
import { FolderTree } from '../../components/common/FolderTree';
import { useBatchSelect } from '../../hooks/useBatchSelect';
import { usePagination } from '../../hooks/usePagination';
import { formatDate } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';
import { ManualCollectTab } from './ManualCollectTab';
import { TimelineView } from './TimelineView';

export function BlogListPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [blogs, setBlogs] = useState<BlogWithTags[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [filterTagId, setFilterTagId] = useState<number | null>(null);
  const [filterTagName, setFilterTagName] = useState('');
  const [filterFolderId, setFilterFolderId] = useState<number | null>(null);
  const [showFolderSidebar, setShowFolderSidebar] = useState(() => localStorage.getItem('sidebar_folder_blog') === '1');
  const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards');
  const [importing, setImporting] = useState(false);
  const [scrapeOpen, setScrapeOpen] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<any>(null);
  const [scrapeError, setScrapeError] = useState('');
  const [activeTab, setActiveTab] = useState<'blogs' | 'manual'>(
    searchParams.get('tab') === 'manual' ? 'manual' : 'blogs',
  );
  const batch = useBatchSelect(blogs as { id: number }[]);
  const pagination = usePagination(20);
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const loadFolders = useCallback(async () => {
    if (!user) return;
    const r = await window.api.folderTree({ userId: user.id, type: 'blog' });
    if (r.success && r.data) setFolderTree(r.data);
  }, [user]);
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Listen for main-process navigate events (e.g., tray → manual collect)
  useEffect(() => {
    const unsub = window.api.onNavigate?.((path: string) => {
      if (path.includes('tab=manual')) setActiveTab('manual');
    });
    return unsub?.();
  }, []);

  const loadBlogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
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
      });
      if (r.success && r.data) {
        setBlogs(r.data.blogs);
        setTotal(r.data.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, query, sortBy, filterTagId, filterFolderId, pagination.offset, pagination.limit]);
  useEffect(() => {
    const tagId = searchParams.get('tagId');
    const tagName = searchParams.get('tagName');
    if (tagId) {
      setFilterTagId(Number(tagId));
      setFilterTagName(tagName || '');
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

  const handleDelete = async (id: number) => {
    if (!confirm('移至回收站？')) return;
    try {
      await window.api.blogDelete(id);
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
        setImporting(true);
        try {
          const r = await window.api.blogImportMd({ userId: user.id, filePaths: files });
          if (r?.success === false) {
            alert(`导入失败: ${r.error || '未知错误'}`);
          } else loadBlogs();
        } catch {
          alert('导入失败');
        } finally {
          setImporting(false);
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
    setImporting(true);
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
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const handleScrape = async () => {
    if (!scrapeUrl.trim() || !user) return;
    setScrapeLoading(true);
    setScrapeError('');
    setScrapeResult(null);
    try {
      const r = await window.api.scrapeWebpage(scrapeUrl.trim());
      if (r.success) setScrapeResult(r.data);
      else setScrapeError(r.error);
    } catch {
      setScrapeError('抓取失败');
    } finally {
      setScrapeLoading(false);
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
              setShowFolderSidebar(v);
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
                onSelectFolder={setFilterFolderId}
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
            onClick={() => setActiveTab('blogs')}
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
            onClick={() => setActiveTab('manual')}
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
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-[24px] font-semibold text-primary">
              博客 <span className="text-[14px] font-normal text-secondary">{total} 篇</span>
            </h2>
            <div className="flex gap-1 rounded-[4px] border p-0.5 section-border">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className="rounded-[3px] px-2 py-1 text-[12px] text-secondary transition-colors"
                style={{ background: viewMode === 'cards' ? 'var(--bg-tertiary)' : 'transparent' }}
              >
                卡片
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className="rounded-[3px] px-2 py-1 text-[12px] text-secondary transition-colors"
                style={{ background: viewMode === 'timeline' ? 'var(--bg-tertiary)' : 'transparent' }}
              >
                时间线
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setScrapeOpen(true)} className="btn-primary !text-[13px]">
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
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索博客标题..."
            className="max-w-xs surface-input px-3 py-1.5 text-[13px]"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            title="排序方式"
            className="max-w-[140px] surface-input px-3 py-1.5 text-[13px]"
          >
            <option value="updated_at">最近修改</option>
            <option value="created_at">创建时间</option>
            <option value="title">标题</option>
          </select>
        </div>

        {viewMode === 'timeline' && user ? (
          <TimelineView userId={user.id} />
        ) : loading ? (
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
                      await window.api.blogBatchDelete([...batch.selectedIds]);
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
                    setFilterTagId(null);
                    setFilterTagName('');
                  }}
                  className="ml-auto text-[12px] hover:underline"
                  style={{ color: 'var(--accent-red)' }}
                >
                  清除筛选
                </button>
              </div>
            )}
            {blogs.map((blog: any) => (
              <article
                key={blog.id}
                className="card cursor-pointer group relative"
                title={blog.title || ''}
                onClick={() => {
                  if (batch.isBatchMode) {
                    batch.toggleSelect(blog.id);
                    return;
                  }
                  navigate(`/blog/${blog.id}`);
                }}
              >
                {batch.isBatchMode && (
                  <input
                    type="checkbox"
                    checked={batch.selectedIds.has(blog.id)}
                    onChange={() => batch.toggleSelect(blog.id)}
                    className="absolute top-3 left-3 z-10"
                    aria-label={`选择 ${blog.title || '无标题'}`}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                {batch.isBatchMode ? (
                  <span className={'text-[20px] font-semibold ml-8 text-primary'}>{blog.title || '无标题'}</span>
                ) : (
                  <Link
                    to={`/blog/${blog.id}`}
                    className="text-[20px] font-semibold no-underline hover:underline text-primary"
                  >
                    {blog.title || '无标题'}
                  </Link>
                )}
                <p className="mt-2 text-[15px] line-clamp-2 text-secondary">点击查看全文</p>
                <div className="mt-3 flex items-center gap-3 text-[13px] text-secondary">
                  <span
                    className="rounded-[3px] px-1.5 py-0.5 font-mono text-[11px] uppercase"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    {blog.format}
                  </span>
                  <span>{formatDate(blog.updatedAt)}</span>
                  {blog.tags?.length > 0 && <span>·</span>}
                  {blog.tags?.map((t: any) => (
                    <button
                      key={t.id}
                      type="button"
                      className="tag cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setFilterTagId(t.id);
                        setFilterTagName(t.name);
                      }}
                      title={`筛选标签: ${t.name}`}
                    >
                      {t.name}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <select
                    value=""
                    onChange={async (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const fid = e.target.value ? Number(e.target.value) : null;
                      try {
                        await window.api.folderMoveItem({ itemType: 'blog', itemId: blog.id, folderId: fid });
                        loadBlogs();
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-[0.15s] rounded-[3px] border px-1 py-0.5 outline-none"
                    style={{
                      borderColor: 'var(--border-default)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      maxWidth: 60,
                    }}
                    title="移至文件夹"
                  >
                    <option value="">移至</option>
                    <option value="0">根目录</option>
                    {folderTree.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDelete(blog.id);
                    }}
                    className="text-[12px] opacity-0 group-hover:opacity-100 transition-opacity duration-[0.15s]"
                    style={{ color: 'var(--accent-red)' }}
                  >
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > pagination.limit && (
          <div className="mt-6 flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={pagination.prev}
              disabled={pagination.page === 1}
              className="rounded-[4px] border px-3 py-1.5 text-[13px] disabled:opacity-30 hover:opacity-80"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
            >
              ←
            </button>
            {Array.from({ length: Math.min(5, Math.ceil(total / pagination.limit)) }, (_, i) => {
              const totalPages = Math.ceil(total / pagination.limit);
              let p: number;
              if (totalPages <= 5) {
                p = i + 1;
              } else if (pagination.page <= 3) {
                p = i + 1;
              } else if (pagination.page >= totalPages - 2) {
                p = totalPages - 4 + i;
              } else {
                p = pagination.page - 2 + i;
              }
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => pagination.goTo(p)}
                  className="rounded-[4px] px-3 py-1.5 text-[13px]"
                  style={{
                    background: p === pagination.page ? 'var(--accent-blue)' : 'transparent',
                    color: p === pagination.page ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                  }}
                >
                  {p}
                </button>
              );
            })}
            <button
              type="button"
              onClick={pagination.next}
              disabled={pagination.page >= Math.ceil(total / pagination.limit)}
              className="rounded-[4px] border px-3 py-1.5 text-[13px] disabled:opacity-30 hover:opacity-80"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
            >
              →
            </button>
          </div>
        )}

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
            onClick={() => setScrapeOpen(false)}
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
                    setScrapeOpen(false);
                    setScrapeResult(null);
                    setScrapeError('');
                    setScrapeUrl('');
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
                      onChange={(e) => setScrapeUrl(e.target.value)}
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
                          setScrapeOpen(false);
                          setScrapeUrl('');
                          setScrapeResult(null);
                        } catch {
                          setScrapeError('导入失败');
                        }
                      }}
                      className="btn-primary"
                    >
                      导入为博客
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScrapeResult(null);
                        setScrapeError('');
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
