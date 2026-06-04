import { useState, useRef, useEffect } from 'react';
import { Copy, Pencil, Eye } from 'lucide-react';

const NOTE_COLORS = ['#fefdf7', '#fef9e4', '#f0f4f8', '#f2f7f1', '#fdf2f5', '#f5f2f9'];

export function randomNoteColor(): string {
  return NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]!;
}

interface Note {
  id: number;
  title?: string;
  content: string;
  createdAt: string;
  color?: string;
}

interface Props {
  note: Note;
  onCopy: (note: Note) => void;
  onEdit: (id: number, content: string) => void;
  onDelete: (id: number) => void;
  onView: (note: Note) => void;
  onImagePaste?: (e: React.ClipboardEvent, append: (md: string) => void) => void;
  style?: React.CSSProperties;
  onDragStart?: (e: React.MouseEvent) => void;
  onDragEnd?: (e: React.MouseEvent) => void;
}

export function NoteCard({ note, onCopy, onEdit, onDelete, onView, onImagePaste, style, onDragStart, onDragEnd }: Props) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(note.content);
  const bg = note.color || randomNoteColor();

  useEffect(() => {
    if (editing) setEditText(note.content);
  }, [editing, note.content]);

  const handleSave = () => {
    if (editText.trim()) onEdit(note.id, editText.trim());
    setEditing(false);
  };

  return (
    <div
      className="group relative rounded-[4px] flex flex-col"
      style={{
        width: 180,
        height: 180,
        background: bg,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'box-shadow 150ms, transform 150ms',
        cursor: onDragStart ? 'grab' : 'default',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.zIndex = '10';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
        e.currentTarget.style.transform = '';
        e.currentTarget.style.zIndex = '';
      }}
    >
      {/* Hover action buttons */}
      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <ActionBtn icon={<Copy size={12} />} title="复制" onClick={() => onCopy(note)} />
        <ActionBtn icon={<Pencil size={12} />} title="编辑" onClick={() => setEditing(true)} />
        <ActionBtn icon={<Eye size={12} />} title="全文" onClick={() => onView(note)} />
      </div>

      {/* Content */}
      {editing ? (
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) handleSave();
            if (e.key === 'Escape') setEditing(false);
          }}
          onPaste={(e) => onImagePaste?.(e, (md) => setEditText((prev) => prev + md))}
          className="flex-1 w-full resize-none border-0 bg-transparent p-2 text-[13px] outline-none"
          style={{ color: '#2c2c2c' }}
          autoFocus
        />
      ) : (
        <p
          className="flex-1 p-2 text-[13px] line-clamp-4 whitespace-pre-wrap overflow-hidden"
          style={{ color: '#2c2c2c' }}
        >
          {note.content}
        </p>
      )}

      {/* Footer */}
      <div className="px-2 pb-1.5 text-[11px]" style={{ color: 'rgba(0,0,0,0.35)' }}>
        {note.createdAt ? new Date(note.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' : ''}
        {note.createdAt ? new Date(note.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}
      </div>
    </div>
  );
}

function ActionBtn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="rounded-[2px] p-0.5 hover:opacity-70"
      style={{ background: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.5)' }}
      title={title}
    >
      {icon}
    </button>
  );
}
