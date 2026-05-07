import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../../components/common/Toast';
import { formatDate } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';

interface Note {
  id: number;
  userId: number;
  content: string;
  pinned: boolean;
  source: string;
  createdAt: string;
}

export function NoteListPage() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');

  const loadNotes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const r = await window.api.noteList(user.id);
      if (r.success && r.data) setNotes(r.data);
    } catch (e) {
      console.error('[NoteList] Failed to load:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes, location.pathname]);

  // Listen for note:refresh from main process (e.g., quick note save)
  useEffect(() => {
    const unsub = window.api.onNoteRefresh(() => {
      loadNotes();
    });
    return unsub;
  }, [loadNotes]);

  const handleCreate = async () => {
    if (!user || !input.trim()) return;
    await window.api.noteCreate({ userId: user.id, content: input.trim() });
    setInput('');
    loadNotes();
    toast('便签已保存', 'success');
  };

  const handleTogglePin = async (noteId: number) => {
    await window.api.notePin(noteId);
    loadNotes();
  };

  const handleDelete = async (noteId: number) => {
    await window.api.noteDelete(noteId);
    loadNotes();
  };

  const handleClipboard = async () => {
    const r = await window.api.noteClipboard();
    if (r.success && r.data) {
      setInput((prev) => prev + r.data);
    }
  };

  const sorted = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h2
        className="mb-6 text-xl font-bold"
        style={{ color: 'var(--text-primary)' }}
      >
        便签
      </h2>

      {/* Input */}
      <div
        className="mb-6 flex gap-2 rounded-[8px] border p-3"
        style={{ borderColor: 'var(--border-default)', background: 'var(--color-bg-card)' }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
          }}
          placeholder="新便签... Enter 保存"
          className="flex-1 rounded-[4px] border px-3 py-1.5 text-[13px] outline-none"
          style={{
            background: 'var(--color-bg-base)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={!input.trim()}
          className="rounded-[4px] px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ background: 'var(--color-primary)' }}
        >
          保存
        </button>
        <button
          type="button"
          onClick={handleClipboard}
          title="从剪贴板粘贴"
          className="rounded-[4px] px-3 py-1.5 text-[13px] transition-opacity hover:opacity-80"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
        >
          📋
        </button>
      </div>

      {/* Note list */}
      {loading ? (
        <p
          className="py-12 text-center text-[13px]"
          style={{ color: 'var(--text-muted)' }}
        >
          加载中...
        </p>
      ) : sorted.length === 0 ? (
        <div
          className="rounded-[8px] border border-dashed p-12 text-center"
          style={{ borderColor: 'var(--border-default)', background: 'var(--color-bg-card)' }}
        >
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            暂无便签。输入内容后按 Enter 保存，或按 📋 从剪贴板粘贴。
          </p>
          <p className="mt-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            非置顶便签 24 小时后自动清理
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((note) => (
            <div
              key={note.id}
              className="group flex items-start gap-3 rounded-[8px] border p-4 transition-shadow hover:shadow-md"
              style={{
                borderColor: note.pinned ? 'var(--accent-amber)' : 'var(--border-default)',
                background: note.pinned ? 'var(--bg-secondary)' : 'var(--color-bg-card)',
              }}
            >
              <div className="flex-1">
                <p
                  className="select-text text-[14px] leading-relaxed whitespace-pre-wrap break-words"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {note.content}
                </p>
                <p
                  className="mt-1.5 text-[11px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {formatDate(note.createdAt)}
                </p>
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
                  {note.pinned ? '📌' : '📌'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  title="删除"
                  className="rounded-[4px] px-2 py-0.5 text-[12px] text-red-400 transition-colors hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p
        className="mt-6 text-center text-[12px]"
        style={{ color: 'var(--text-muted)' }}
      >
        便签是临时记录工具 · 非置顶便签 24 小时后自动清理 · 剪贴板内容可一键填入
      </p>
    </div>
  );
}
