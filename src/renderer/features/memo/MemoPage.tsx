import { useCallback, useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import type { Note } from '../../../shared/types';
import { useToast } from '../../components/common/Toast';
import { formatDate } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

const FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'note', label: '笔记' },
  { id: 'schedule', label: '日程' },
  { id: 'todo', label: '待办' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

export function MemoPage() {
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState<'note' | 'schedule' | 'todo'>('note');
  const [saving, setSaving] = useState(false);

  const loadNotes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const r = await window.api.noteList(user.id);
      if (r.success && r.data) setNotes(r.data);
    } catch (e) {
      console.error('[MemoPage] Failed to load:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    const unsub = window.api.onNoteRefresh(() => loadNotes());
    return unsub;
  }, [loadNotes]);

  const filteredNotes = useMemo(() => {
    if (filter === 'all') return notes;
    return notes.filter((n) => n.memoType === filter);
  }, [notes, filter]);

  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [filteredNotes]);

  const handleCreate = () => {
    setEditNote(null);
    setFormTitle('');
    setFormContent('');
    setFormType('note');
    setShowEditor(true);
  };

  const handleEdit = (note: Note) => {
    setEditNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormType(note.memoType);
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (editNote) {
        // Update via note:create with noteId
        await window.api.noteCreate({
          userId: user.id,
          noteId: editNote.id,
          title: formTitle,
          content: formContent,
          memoType: formType,
        });
        toast('已更新', 'success');
      } else {
        await window.api.noteCreate({
          userId: user.id,
          title: formTitle,
          content: formContent,
          memoType: formType,
        });
        toast('已创建', 'success');
      }
      setShowEditor(false);
      loadNotes();
    } catch (e) {
      console.error('[MemoPage] Failed to save:', e);
      toast('保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async (noteId: number) => {
    if (!user) return;
    await window.api.notePin({ userId: user.id, noteId });
    loadNotes();
  };

  const handleDelete = async (noteId: number) => {
    if (!user) return;
    await window.api.noteDelete({ userId: user.id, noteId });
    toast('已删除', 'success');
    loadNotes();
  };

  const handleCancel = () => {
    setShowEditor(false);
    setEditNote(null);
  };

  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--content-max)' }}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          备忘录
        </h2>
        <button
          type="button"
          onClick={handleCreate}
          className="rounded-[4px] px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-80"
          style={{ background: 'var(--color-primary)' }}
        >
          + 新建
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1 border-b" style={{ borderColor: 'var(--border-default)' }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className="px-4 py-2 text-[13px] font-medium transition-colors"
            style={{
              color: filter === f.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
              borderBottom: filter === f.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Editor overlay */}
      {showEditor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={handleCancel}
        >
          <div
            className="w-[540px] rounded-[8px] border p-5 shadow-lg"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {editNote ? '编辑备忘录' : '新建备忘录'}
            </h3>

            <div className="mb-3">
              <label className="mb-1 block text-[12px]" style={{ color: 'var(--text-secondary)' }}>类型</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as 'note' | 'schedule' | 'todo')}
                className="w-full rounded-[4px] border px-3 py-1.5 text-[13px] outline-none"
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="note">笔记</option>
                <option value="schedule">日程</option>
                <option value="todo">待办</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-[12px]" style={{ color: 'var(--text-secondary)' }}>标题</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="标题（可选）"
                className="w-full rounded-[4px] border px-3 py-1.5 text-[13px] outline-none"
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-[12px]" style={{ color: 'var(--text-secondary)' }}>内容</label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="支持 Markdown 格式"
                rows={8}
                className="w-full resize-y rounded-[4px] border px-3 py-2 text-[13px] outline-none"
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>

            {/* Live preview */}
            {formContent.trim() && (
              <div
                className="mb-4 rounded-[4px] border p-3 text-[13px] leading-relaxed prose max-h-[200px] overflow-y-auto"
                style={{
                  borderColor: 'var(--border-default)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(md.render(formContent)) }}
              />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || (!formTitle.trim() && !formContent.trim())}
                className="flex-1 rounded-[4px] px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: 'var(--color-primary)' }}
              >
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-[4px] px-4 py-1.5 text-[13px] transition-opacity hover:opacity-80"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note list */}
      {loading ? (
        <div className="flex justify-center py-12 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          加载中...
        </div>
      ) : sortedNotes.length === 0 ? (
        <div
          className="rounded-[8px] border border-dashed p-12 text-center"
          style={{ borderColor: 'var(--border-default)', background: 'var(--color-bg-card)' }}
        >
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {filter === 'all' ? '暂无备忘录。点击"新建"创建第一条。' : '此分类下暂无内容。'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedNotes.map((note) => (
            <div
              key={note.id}
              className="group flex items-start gap-4 rounded-[8px] border p-4 transition-shadow hover:shadow-md"
              style={{
                borderColor: note.pinned ? 'var(--accent-amber)' : 'var(--border-default)',
                background: note.pinned ? 'var(--bg-secondary)' : 'var(--color-bg-card)',
              }}
            >
              <div className="flex-1 min-w-0">
                {note.title && (
                  <div
                    className="mb-1 cursor-pointer text-[15px] font-semibold leading-snug hover:underline"
                    style={{ color: 'var(--text-primary)' }}
                    onClick={() => handleEdit(note)}
                  >
                    {note.title}
                  </div>
                )}
                {note.content ? (
                  <div
                    className="cursor-pointer select-text text-[13px] leading-relaxed prose line-clamp-3"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={() => handleEdit(note)}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(md.render(note.content.slice(0, 500))),
                    }}
                  />
                ) : note.title ? null : (
                  <div
                    className="cursor-pointer select-text text-[13px] leading-relaxed"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={() => handleEdit(note)}
                  >
                    (无内容)
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  <span
                    className="rounded-[3px] px-1.5 py-0.5 font-mono text-[10px]"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    {note.memoType === 'note' ? '笔记' : note.memoType === 'schedule' ? '日程' : '待办'}
                  </span>
                  <span>{formatDate(note.createdAt)}</span>
                  {note.dueDate && <span>· 截止: {formatDate(note.dueDate)}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleTogglePin(note.id)}
                  title={note.pinned ? '取消置顶' : '置顶'}
                  className="rounded-[4px] px-2 py-0.5 text-[12px] transition-colors hover:opacity-80"
                  style={{
                    background: note.pinned ? 'var(--accent-amber)' : 'var(--bg-tertiary)',
                    color: note.pinned ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                  }}
                >
                  📌
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(note)}
                  title="编辑"
                  className="rounded-[4px] px-2 py-0.5 text-[12px] transition-colors hover:opacity-80"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  title="删除"
                  className="rounded-[4px] px-2 py-0.5 text-[12px] transition-colors hover:opacity-80"
                  style={{ color: 'var(--accent-red)' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
