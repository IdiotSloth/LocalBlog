import type { Editor } from '@tiptap/react';
import type { EditorMode } from './TiptapEditor';

interface EditorToolbarProps {
  editor: Editor;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}

interface ToolbarButton {
  label: string;
  icon: string;
  action: () => void;
  isActive: () => boolean;
  title: string;
}

export function EditorToolbar({ editor, mode, onModeChange }: EditorToolbarProps) {
  const buttons: ToolbarButton[] = [
    {
      label: 'B',
      icon: '',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
      title: '加粗 (Ctrl+B)',
    },
    {
      label: 'I',
      icon: '',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
      title: '斜体 (Ctrl+I)',
    },
    {
      label: 'U',
      icon: '',
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: () => editor.isActive('underline'),
      title: '下划线 (Ctrl+U)',
    },
    {
      label: 'S',
      icon: '',
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive('strike'),
      title: '删除线',
    },
    { type: 'separator' as const },
    {
      label: 'H1',
      icon: '',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive('heading', { level: 1 }),
      title: '标题 1',
    },
    {
      label: 'H2',
      icon: '',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
      title: '标题 2',
    },
    {
      label: 'H3',
      icon: '',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive('heading', { level: 3 }),
      title: '标题 3',
    },
    { type: 'separator' as const },
    {
      label: '•',
      icon: '',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
      title: '无序列表',
    },
    {
      label: '1.',
      icon: '',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
      title: '有序列表',
    },
    {
      label: '☑',
      icon: '',
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: () => editor.isActive('taskList'),
      title: '任务列表',
    },
    { type: 'separator' as const },
    {
      label: '"',
      icon: '',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive('blockquote'),
      title: '引用',
    },
    {
      label: '</>',
      icon: '',
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive('codeBlock'),
      title: '代码块',
    },
    {
      label: '—',
      icon: '',
      action: () => editor.chain().focus().setHorizontalRule().run(),
      isActive: () => false,
      title: '分隔线',
    },
    { type: 'separator' as const },
    {
      label: '↩',
      icon: '',
      action: () => editor.chain().focus().undo().run(),
      isActive: () => false,
      title: '撤销 (Ctrl+Z)',
    },
    {
      label: '↪',
      icon: '',
      action: () => editor.chain().focus().redo().run(),
      isActive: () => false,
      title: '重做 (Ctrl+Y)',
    },
  ];

  const modeButtons: { mode: EditorMode; label: string; title: string }[] = [
    { mode: 'wysiwyg', label: 'WYSIWYG', title: '所见即所得模式' },
    { mode: 'split', label: '分屏', title: '分屏预览模式' },
    { mode: 'source', label: '源码', title: 'HTML 源码模式' },
  ];

  return (
    <div className="flex items-center gap-0.5 border-b border-[var(--color-border)] px-2 py-1 flex-wrap">
      {/* Formatting buttons */}
      {buttons.map((btn, idx) => {
        if ('type' in btn && btn.type === 'separator') {
          return <div key={idx} className="mx-1 h-5 w-px bg-[var(--color-border)]" />;
        }
        const b = btn as ToolbarButton;
        return (
          <button
            key={idx}
            onClick={b.action}
            title={b.title}
            className={`min-w-[28px] rounded px-1.5 py-1 text-xs font-medium transition-colors ${
              b.isActive()
                ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] hover:bg-black/5'
            }`}
          >
            {b.label}
          </button>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Mode toggle */}
      <div className="flex items-center gap-0.5">
        {modeButtons.map((mb) => (
          <button
            key={mb.mode}
            onClick={() => onModeChange(mb.mode)}
            title={mb.title}
            className={`rounded px-2 py-1 text-[11px] transition-colors ${
              mode === mb.mode
                ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            {mb.label}
          </button>
        ))}
      </div>
    </div>
  );
}
