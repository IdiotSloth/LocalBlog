import type { Editor } from '@tiptap/core';
import { useCallback, useEffect, useRef, useState } from 'react';

// ==================== Command Definitions ====================

export interface SlashCommandDef {
  id: string;
  label: string;
  icon: string;
  hint?: string;
  keywords: string[];
  execute: (editor: Editor) => void;
}

export const SLASH_COMMANDS: SlashCommandDef[] = [
  {
    id: 'h1',
    label: '标题 1',
    icon: 'H1',
    keywords: ['h1', 'heading1', '标题1', '大标题', 'title'],
    execute: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    label: '标题 2',
    icon: 'H2',
    keywords: ['h2', 'heading2', '标题2', '标题'],
    execute: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: '标题 3',
    icon: 'H3',
    keywords: ['h3', 'heading3', '标题3', '小标题'],
    execute: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'h4',
    label: '标题 4',
    icon: 'H4',
    keywords: ['h4', 'heading4', '标题4'],
    execute: (ed) => ed.chain().focus().toggleHeading({ level: 4 }).run(),
  },
  {
    id: 'bullet',
    label: '无序列表',
    icon: '•',
    keywords: ['bullet', 'list', '无序', 'ul', '列表'],
    execute: (ed) => ed.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered',
    label: '有序列表',
    icon: '1.',
    keywords: ['ordered', 'numbered', '有序', 'ol', '编号'],
    execute: (ed) => ed.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'task',
    label: '任务列表',
    icon: '☐',
    keywords: ['task', 'todo', '任务', '待办', 'checkbox'],
    execute: (ed) => ed.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'quote',
    label: '引用块',
    icon: '"',
    keywords: ['quote', 'blockquote', '引用', '引述'],
    execute: (ed) => ed.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'code',
    label: '代码块',
    icon: '<>',
    keywords: ['code', '代码', 'codeblock', 'fence', '```'],
    execute: (ed) => ed.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'divider',
    label: '分隔线',
    icon: '—',
    keywords: ['divider', 'hr', '分隔', '分割线', 'horizontal', '---'],
    execute: (ed) => ed.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'paragraph',
    label: '正文',
    icon: '¶',
    keywords: ['paragraph', 'text', '正文', '段落', 'p'],
    execute: (ed) => ed.chain().focus().setParagraph().run(),
  },
  {
    id: 'image',
    label: '图片',
    icon: '🖼',
    keywords: ['image', '图片', 'img', '插图'],
    execute: (ed) => {
      ed.chain().focus().setImage({ src: '' }).run();
    },
  },
  {
    id: 'table',
    label: '表格',
    icon: '⊞',
    keywords: ['table', '表格', 'grid', '3x3'],
    execute: (ed) =>
      ed
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    id: 'callout-info',
    label: '提示框',
    icon: 'i',
    hint: 'info',
    keywords: ['callout', 'info', '提示', '信息', 'info', 'note'],
    execute: (ed) =>
      ed
        .chain()
        .focus()
        .insertContent(
          '<div class="callout callout-info" data-callout-type="info"><p>💡 提示内容</p></div><p></p>',
        )
        .run(),
  },
  {
    id: 'callout-success',
    label: '成功框',
    icon: '✓',
    hint: 'success',
    keywords: ['callout', 'success', '成功', 'check', 'done'],
    execute: (ed) =>
      ed
        .chain()
        .focus()
        .insertContent(
          '<div class="callout callout-success" data-callout-type="success"><p>✅ 成功内容</p></div><p></p>',
        )
        .run(),
  },
  {
    id: 'callout-warning',
    label: '警告框',
    icon: '!',
    hint: 'warning',
    keywords: ['callout', 'warning', '警告', '注意', 'warn'],
    execute: (ed) =>
      ed
        .chain()
        .focus()
        .insertContent(
          '<div class="callout callout-warning" data-callout-type="warning"><p>⚠️ 注意事项</p></div><p></p>',
        )
        .run(),
  },
  {
    id: 'callout-danger',
    label: '危险框',
    icon: '!!',
    hint: 'danger',
    keywords: ['callout', 'danger', '危险', '错误', 'error', 'red'],
    execute: (ed) =>
      ed
        .chain()
        .focus()
        .insertContent(
          '<div class="callout callout-danger" data-callout-type="danger"><p>🚫 危险内容</p></div><p></p>',
        )
        .run(),
  },
];

// ==================== Popup Component ====================

interface SlashCommandPopupProps {
  query: string;
  position: { x: number; y: number };
  onSelect: (cmd: SlashCommandDef) => void;
  onClose: () => void;
}

export function SlashCommandPopup({ query, position, onSelect, onClose }: SlashCommandPopupProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const q = query.toLowerCase();
  const filtered = q
    ? SLASH_COMMANDS.filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          c.keywords.some((k) => k.toLowerCase().includes(q)),
      )
    : SLASH_COMMANDS;

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filtered[selectedIdx];
        if (cmd) onSelect(cmd);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [filtered, selectedIdx, onSelect, onClose]);

  // Click handler
  const handleClick = useCallback(
    (cmd: SlashCommandDef) => {
      onSelect(cmd);
    },
    [onSelect],
  );

  if (filtered.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-[99] rounded-[8px] border border-[var(--border-default)] shadow-lg overflow-y-auto"
      style={{
        left: position.x,
        top: position.y + 8,
        maxHeight: 320,
        minWidth: 220,
        maxWidth: 280,
        background: 'var(--bg-primary)',
      }}
    >
      <div
        className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider border-b border-[var(--border-default)]"
        style={{ color: 'var(--text-muted)' }}
      >
        命令
      </div>
      {filtered.map((cmd, i) => (
        <button
          key={cmd.id}
          type="button"
          onClick={() => handleClick(cmd)}
          className={`w-full flex items-center gap-3 px-3 py-2 text-left text-[13px] transition-colors duration-[0.15s] ${
            i === selectedIdx ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-secondary)]'
          }`}
        >
          <span
            className="flex items-center justify-center w-6 h-6 rounded-[4px] text-[11px] font-semibold shrink-0"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-blue)' }}
          >
            {cmd.icon}
          </span>
          <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
            {cmd.label}
          </span>
          {cmd.hint && (
            <span className="text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}>
              {cmd.hint}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
