import { useState, useRef, useEffect } from 'react';
import { Paperclip, Pencil, Trash2, FolderOpen, Plus, X } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  docx: 'Word 文档', xlsx: 'Excel 表格', pptx: 'PPT 演示',
  pdf: 'PDF 文档', txt: '纯文本', md: 'Markdown',
  png: 'PNG 图片', jpg: 'JPEG 图片', jpeg: 'JPEG 图片',
  gif: 'GIF 图片', webp: 'WebP 图片', svg: 'SVG 图片',
  html: 'HTML', css: 'CSS', js: 'JavaScript', ts: 'TypeScript',
  json: 'JSON', xml: 'XML', yaml: 'YAML', csv: 'CSV',
};

function typeLabel(ext: string): string {
  return TYPE_LABELS[ext.toLowerCase()] || ext.toUpperCase();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

interface KbFile {
  id: number;
  filename: string;
  fileType?: string;
  fileSize?: number;
  filePath?: string;
  createdAt: string;
  updatedAt: string;
  tags?: Array<{ id: number; name: string }>;
}

interface Props {
  file: KbFile;
  onOpen: (file: KbFile) => void;
  onRename: (file: KbFile) => void;
  onDelete: (file: KbFile) => void;
  onShowInFolder: (file: KbFile) => void;
  onTagClick?: (tagId: number) => void;
  onEditTags?: (file: KbFile) => void;
  onRemoveTag?: (fileId: number, tagId: number) => void;
}

export function KBCard({ file, onOpen, onRename, onDelete, onShowInFolder, onTagClick, onEditTags, onRemoveTag }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const ext = (file.filename || '').split('.').pop()?.toLowerCase() || '';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <div
      className="group rounded-[8px] border p-4 transition-colors duration-[0.15s] cursor-pointer"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
      onClick={() => onOpen(file)}
      onContextMenu={(e) => { e.preventDefault(); setMenuOpen(true); }}
    >
      {/* Right-click menu */}
      {menuOpen && (
        <div ref={menuRef} className="absolute right-3 top-3 z-10 rounded-[6px] border py-1 shadow-lg min-w-[140px]" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)' }} onClick={(e) => e.stopPropagation()}>
          <MenuBtn icon={<Pencil size={12} />} label="重命名" onClick={() => { setMenuOpen(false); onRename(file); }} />
          <MenuBtn icon={<FolderOpen size={12} />} label="在文件管理器中显示" onClick={() => { setMenuOpen(false); onShowInFolder(file); }} />
          <MenuBtn icon={<Trash2 size={12} />} label="删除" danger onClick={() => { setMenuOpen(false); onDelete(file); }} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Paperclip size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span className="text-[14px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {file.filename}
          </span>
        </div>
      </div>

      {/* File info */}
      <div className="space-y-0.5 mb-3">
        <InfoRow label="大小" value={formatSize(file.fileSize || 0)} />
        <InfoRow label="类型" value={typeLabel(ext)} />
        <InfoRow label="创建" value={file.createdAt?.slice(0, 10) || ''} />
        <InfoRow label="修改" value={file.updatedAt?.slice(0, 10) || ''} />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 items-center">
        {file.tags && file.tags.length > 0 && file.tags.map((t) => (
          <span
            key={t.id}
            className="note-actions inline-flex items-center rounded-[3px] px-1.5 py-0.5 text-[11px] cursor-pointer hover:opacity-80 group/kbtag"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
            onClick={(e) => { e.stopPropagation(); onTagClick?.(t.id); }}
          >
            {t.name}
            <X size={10} className="note-actions ml-0.5 opacity-0 group-hover/kbtag:opacity-100 hover:text-[var(--accent-red)]"
              onClick={async (e) => {
                e.stopPropagation();
                onRemoveTag?.(file.id, t.id);
              }} />
          </span>
        ))}
        <button type="button" aria-label="添加标签"
          className="note-actions inline-flex items-center rounded-[3px] px-1 py-0 text-[11px] cursor-pointer hover:opacity-80 opacity-0 group-hover:opacity-100"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
          onClick={(e) => { e.stopPropagation(); onEditTags?.(file); }}>
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex text-[12px]" style={{ color: 'var(--text-secondary)' }}>
      <span style={{ color: 'var(--text-muted)', minWidth: 36 }}>{label}:</span>
      <span className="truncate">{value}</span>
    </div>
  );
}

function MenuBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-[12px] hover:opacity-80"
      style={{ color: danger ? 'var(--accent-red)' : 'var(--text-primary)' }}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
