import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MoreHorizontal, Pencil, Trash2, FileText, Layers, Plus, X } from 'lucide-react';
import { estimateReadingTime } from '../../lib/toc-parser';
import { stripMarkdown, formatDate } from '../../lib/markdown-utils';
import { TagSelector } from '../common/TagSelector';
import type { BlogWithTags } from '../../../shared/types';

interface Props {
  blog: BlogWithTags & { content?: string; refCount?: number };
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onExportPdf?: (id: number) => void;
  onAddToSeries?: (id: number) => void;
  onTagClick?: (tagId: number, tagName: string) => void;
  userId?: number;
  onTagsChanged?: () => void;
}

export function BlogCard({ blog, onEdit, onDelete, onExportPdf, onAddToSeries, onTagClick, userId, onTagsChanged }: Props) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tagSelRef = useRef<HTMLDivElement>(null);
  const progressKey = `blog-progress-${blog.id}`;
  const savedProgress = sessionStorage.getItem(progressKey);
  const hasProgress = savedProgress !== null;
  const progressPercent = hasProgress ? Number(savedProgress) : 0;
  const showProgressBar = hasProgress && progressPercent > 5 && progressPercent < 95;

  const excerpt = stripMarkdown(blog.content || '').slice(0, 200);
  const readingMin = estimateReadingTime(blog.content || '');
  const refCount = (blog as any).refCount ?? 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (tagSelRef.current && !tagSelRef.current.contains(e.target as Node)) setShowTagSelector(false);
    }
    if (menuOpen || showTagSelector) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen, showTagSelector]);

  return (
    <article
      className="group cursor-pointer relative rounded-[8px] border p-4 mb-3"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: showProgressBar ? 'var(--accent-blue)' : 'var(--border-default)',
        borderLeftWidth: showProgressBar ? '3px' : '1px',
        transition: 'border-color 150ms',
      }}
      onMouseEnter={(e) => { if (!showProgressBar) e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
      onMouseLeave={(e) => { if (!showProgressBar) e.currentTarget.style.borderColor = 'var(--border-default)'; }}
      onClick={() => navigate(`/blog/${blog.id}`)}
    >
      {/* [···] hover menu */}
      <div
        ref={menuRef}
        className="absolute top-3 right-3 z-10"
        style={{ opacity: menuOpen ? 1 : 0, transition: 'opacity 150ms' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="rounded-[4px] p-1 hover:opacity-80"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="操作菜单"
        >
          <MoreHorizontal size={14} />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 rounded-[6px] border py-1 shadow-lg min-w-[120px]"
            style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)' }}
          >
            {onEdit && (
              <MenuButton icon={<Pencil size={12} />} label="编辑" onClick={() => { setMenuOpen(false); onEdit(blog.id); }} />
            )}
            {onDelete && (
              <MenuButton icon={<Trash2 size={12} />} label="删除" onClick={() => { setMenuOpen(false); onDelete(blog.id); }} />
            )}
            {onExportPdf && (
              <MenuButton icon={<FileText size={12} />} label="导出 PDF" onClick={() => { setMenuOpen(false); onExportPdf(blog.id); }} />
            )}
            {onAddToSeries && (
              <MenuButton icon={<Layers size={12} />} label="添加到系列" onClick={() => { setMenuOpen(false); onAddToSeries(blog.id); }} />
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <div
        className="text-[14px] font-medium no-underline hover:underline mb-1 pr-8"
        style={{ color: 'var(--text-primary)' }}
        onClick={(e) => { e.stopPropagation(); navigate(`/blog/${blog.id}`); }}
      >
        {blog.isPinned ? <span className="mr-1.5" title="已置顶">📌</span> : null}
        {blog.color ? (
          <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
            style={{ background: COLOR_MAP[blog.color] || 'var(--accent-blue)' }} />
        ) : null}
        {blog.title || '无标题'}
      </div>

      {/* Meta line */}
      <div className="text-[12px] mb-2" style={{ color: 'var(--text-secondary)' }}>
        <span>{formatDate(blog.createdAt)}</span>
        <span className="mx-1">·</span>
        {blog.tags && blog.tags.length > 0 && (
          <>
            {(blog.tags.length > 5 ? blog.tags.slice(0, 5) : blog.tags).map((t: any) => (
              <span
                key={t.id}
                className="inline-flex items-center rounded-[3px] px-1.5 py-0.5 mr-1 cursor-pointer hover:opacity-80 group/tag"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                onClick={(e) => { e.stopPropagation(); onTagClick?.(t.id, t.name); }}
              >
                {t.name}
                {userId && (
                  <X size={10} className="ml-0.5 opacity-0 group-hover/tag:opacity-100 hover:text-[var(--accent-red)]"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const newTagIds = blog.tags!.filter((tg: any) => tg.id !== t.id).map((tg: any) => tg.id);
                      await window.api.tagSetBlog({ blogId: blog.id, tagIds: newTagIds });
                      onTagsChanged?.();
                    }} />
                )}
              </span>
            ))}
            {blog.tags.length > 5 && (
              <span className="text-[11px] mr-1" style={{ color: 'var(--text-muted)' }}
                title={blog.tags.slice(5).map((t: any) => t.name).join(', ')}>+{blog.tags.length - 5}</span>
            )}
            <span className="mx-1">·</span>
          </>
        )}
        {userId && (
          <span className="relative inline-flex items-center mr-1" ref={tagSelRef}>
            <button type="button" aria-label="添加标签" className="inline-flex items-center rounded-[3px] px-1 py-0 cursor-pointer hover:opacity-80 opacity-0 group-hover:opacity-100"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
              onClick={(e) => { e.stopPropagation(); setShowTagSelector(!showTagSelector); }}>
              <Plus size={12} />
            </button>
            {showTagSelector && (
              <div className="absolute left-0 top-full mt-1 z-50" onClick={(e) => e.stopPropagation()}>
                <TagSelector
                  userId={userId}
                  selectedTagIds={blog.tags?.map((t: any) => t.id) || []}
                  onChange={async (ids) => {
                    await window.api.tagSetBlog({ blogId: blog.id, tagIds: ids });
                    setShowTagSelector(false);
                    onTagsChanged?.();
                  }}
                />
              </div>
            )}
          </span>
        )}
        <span>{readingMin} 分钟阅读</span>
        {refCount > 0 && (
          <>
            <span className="mx-1">·</span>
            <span>{refCount} 引用</span>
          </>
        )}
      </div>

      {/* Excerpt */}
      {excerpt && (
        <p className="text-[13px] line-clamp-3 m-0" style={{ color: 'var(--text-muted)' }}>
          {excerpt}
        </p>
      )}
    </article>
  );
}

const COLOR_MAP: Record<string, string> = {
  blue: 'var(--accent-blue)', green: 'var(--accent-green)', red: 'var(--accent-red)',
  amber: 'var(--accent-yellow)', purple: 'var(--text-secondary)', gray: 'var(--text-muted)',
};

function MenuButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-[12px] hover:opacity-80"
      style={{ color: 'var(--text-primary)' }}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
