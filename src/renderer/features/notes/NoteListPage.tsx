import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import type { Note } from '../../../shared/types';
import { useToast } from '../../components/common/Toast';
import { formatDate } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

export function NoteListPage() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortedRef = useRef(false);
  const [input, setInput] = useState('');
  const [viewModeIds, setViewModeIds] = useState<Set<number>>(new Set());

  const loadNotes = useCallback(async () => {
    if (!user) return;
    abortedRef.current = false;
    setLoading(true);
    try {
      const r = await window.api.noteList(user.id);
      if (r.success && r.data && !abortedRef.current) setNotes(r.data);
    } catch (e) {
      console.error('[NoteList] Failed to load:', e);
      setError('加载失败');
    } finally {
      if (!abortedRef.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotes();
    return () => { abortedRef.current = true; };
  }, [loadNotes, location.pathname]);

  useEffect(() => {
    const unsub = window.api.onNoteRefresh(() => loadNotes());
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
    await window.api.notePin({ userId: user.id, noteId });
    loadNotes();
  };

  const handleDelete = async (noteId: number) => {
    await window.api.noteDelete({ userId: user.id, noteId });
    loadNotes();
  };

  const handleClipboard = async () => {
    const r = await window.api.noteClipboard();
    if (r.success && r.data) {
      setInput((prev) => prev + r.data);
    }
  };

  // Show notes + simple quick notes, exclude todo/schedule (shown in Dashboard)
  const displayed = notes.filter((n) => n.memoType !== 'todo' && n.memoType !== 'schedule');
  const sorted = [...displayed].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
  });

  return (
    <div className="mx-auto max-w-[780px]">
      <h2 className="mb-6 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
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

      {/* Error state */}
      {error && (
        <div style={{ color: 'var(--accent-red)', textAlign: 'center', padding: '3rem' }}>
          <p>{error}</p>
          <button
            onClick={() => { setError(null); loadNotes(); }}
            style={{ color: 'var(--accent-blue)', marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
          >
            重试
          </button>
        </div>
      )}

      {/* Note list */}
      {loading ? (
        <p className="py-12 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>加载中...</p>
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
              <div className="flex-1 min-w-0">
                {/* Title — for memo-imported notes that have titles */}
                {note.title && (
                  <h4 className="mb-1 truncate text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {note.title}
                  </h4>
                )}
                {/* Content */}
                {viewModeIds.has(note.id) ? (
                  <div
                    className="select-text text-[14px] leading-relaxed break-words prose prose-sm max-w-none"
                    style={{ color: 'var(--text-primary)' }}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(md.render(note.content)),
                    }}
                  />
                ) : (
                  <p
                    className="select-text text-[14px] leading-relaxed whitespace-pre-wrap break-words"
                    style={{ color: note.title ? 'var(--text-secondary)' : 'var(--text-primary)' }}
                  >
                    {note.content}
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-2">
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(note.createdAt)}
                  </p>
                  {note.memoType === 'note' && (
                    <span className="rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                      笔记
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => {
                    setViewModeIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(note.id)) next.delete(note.id);
                      else next.add(note.id);
                      return next;
                    });
                  }}
                  title={viewModeIds.has(note.id) ? '显示纯文本' : '预览渲染'}
                  aria-label={viewModeIds.has(note.id) ? '显示纯文本' : '预览渲染'}
                  className="rounded-[4px] px-2 py-0.5 text-[12px] transition-colors hover:opacity-80"
                  style={{
                    background: viewModeIds.has(note.id) ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                    color: viewModeIds.has(note.id) ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {viewModeIds.has(note.id) ? '✎' : '👁'}
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePin(note.id)}
                  title={note.pinned ? '取消置顶' : '置顶'}
                  aria-label={note.pinned ? '取消置顶' : '置顶'}
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
                  onClick={() => handleDelete(note.id)}
                  title="删除"
                  aria-label="删除便签"
                  className="rounded-[4px] px-2 py-0.5 text-[12px] text-red-400 transition-colors hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
        便签是临时记录工具 · 非置顶便签 24 小时后自动清理 · 剪贴板内容可一键填入
      </p>
    </div>
  );
}
