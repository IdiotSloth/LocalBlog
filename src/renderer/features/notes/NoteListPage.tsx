import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Draggable, { type DraggableData, type DraggableEvent } from 'react-draggable';
import type { Note } from '../../../shared/types';
import { useToast } from '../../components/common/Toast';
import { NoteCard, randomNoteColor } from '../../components/notes/NoteCard';
import { useAuthStore } from '../../stores/auth-store';
import { Clipboard, Trash2 } from 'lucide-react';

interface ClipItem { text: string; time: number; hash?: string }
interface NotePositions { [id: number]: { x: number; y: number } }

const POS_KEY = 'lbkb_note_positions';

function loadPositions(): NotePositions {
  try { return JSON.parse(localStorage.getItem(POS_KEY) || '{}'); } catch { return {}; }
}
function savePositions(p: NotePositions) {
  localStorage.setItem(POS_KEY, JSON.stringify(p));
}

export function NoteListPage() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const [notes, setNotes] = useState<(Note & { color?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortedRef = useRef(false);
  const [input, setInput] = useState('');
  const [positions, setPositions] = useState<NotePositions>(loadPositions);
  const [viewModal, setViewModal] = useState<Note | null>(null);
  const [clipItems, setClipItems] = useState<ClipItem[]>([]);
  const [clipRunning, setClipRunning] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const loadNotes = useCallback(async () => {
    if (!user) return;
    abortedRef.current = false;
    setLoading(true);
    try {
      const r = await window.api.noteList(user.id);
      if (r.success && r.data && !abortedRef.current) {
        setNotes(r.data.filter((n: Note) => n.memoType !== 'todo' && n.memoType !== 'schedule'));
      }
    } catch (e) {
      console.error('[NoteList] Failed:', e);
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

  // Clipboard monitoring
  useEffect(() => {
    window.api.clipboardStatus().then((r: any) => { if (r.success) setClipRunning(r.data); });
    const loadClip = () => {
      window.api.clipboardHistory().then((r: any) => {
        if (r.success && r.data) setClipItems(r.data.slice(0, 20));
      });
    };
    loadClip();
    const iv = setInterval(loadClip, 2000);
    return () => clearInterval(iv);
  }, []);

  const toggleClipboard = async () => {
    if (clipRunning) {
      await window.api.clipboardToggle({});
      setClipRunning(false);
    } else {
      await window.api.clipboardToggle({ userId: user?.id });
      setClipRunning(true);
    }
  };

  const handleCreate = async (content: string, x?: number, y?: number) => {
    if (!user || !content.trim()) return;
    const r: any = await window.api.noteCreate({ userId: user.id, content: content.trim() });
    if (r.success && r.data) {
      const newId = r.data.id;
      if (x !== undefined && y !== undefined) {
        setPositions((prev) => { const n = { ...prev, [newId]: { x, y } }; savePositions(n); return n; });
      }
    }
    loadNotes();
  };

  const handleTogglePin = async (noteId: number) => {
    await window.api.notePin({ userId: user.id, noteId });
    loadNotes();
  };

  const handleDelete = async (noteId: number) => {
    await window.api.noteDelete({ userId: user.id, noteId });
    setPositions((prev) => { const n = { ...prev }; delete n[noteId]; savePositions(n); return n; });
    loadNotes();
  };

  const handleEdit = async (noteId: number, content: string) => {
    if (!user) return;
    await window.api.noteCreate({ userId: user.id, noteId, content });
    loadNotes();
    toast('已保存', 'success');
  };

  const handleCopy = async (note: Note) => {
    await navigator.clipboard.writeText(note.content);
    toast('已复制', 'success');
  };

  const handleDragStop = (noteId: number, _e: DraggableEvent, data: DraggableData) => {
    setPositions((prev) => {
      const n = { ...prev, [noteId]: { x: data.x, y: data.y } };
      savePositions(n);
      return n;
    });
  };

  const [createInput, setCreateInput] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [createPos, setCreatePos] = useState<{ x: number; y: number } | null>(null);

  const getNotePosition = (noteId: number): { x: number; y: number } => {
    if (positions[noteId]) return positions[noteId];
    const cx = 100 + Math.round(Math.random() * 120);
    const cy = 20 + Math.round(Math.random() * 80);
    return { x: cx, y: cy };
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('note-canvas')) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setCreatePos({ x: Math.max(0, e.clientX - rect.left - 90), y: Math.max(0, e.clientY - rect.top - 90) });
        setCreateInput('');
        setShowCreateInput(true);
      }
    }
  };

  const submitCreate = () => {
    if (createInput.trim()) handleCreate(createInput.trim(), createPos?.x, createPos?.y);
    setShowCreateInput(false);
    setCreateInput('');
    setCreatePos(null);
  };

  // Image paste/drop helpers
  const savePastedImage = async (file: File): Promise<string | null> => {
    if (!user || !file.type.startsWith('image/')) return null;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        window.api.noteImageSave({ userId: user.id, base64: reader.result as string }).then((r: any) => {
          resolve(r.success && r.data ? `![](${r.data})` : null);
        }).catch(() => resolve(null));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImagePaste = async (e: React.ClipboardEvent, appendToContent: (md: string) => void) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item?.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const md = await savePastedImage(file);
          if (md) appendToContent(md);
        }
        return;
      }
    }
  };

  const handleCanvasDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files?.length || !user) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    const x = rect ? e.clientX - rect.left - 90 : undefined;
    const y = rect ? e.clientY - rect.top - 90 : undefined;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file?.type.startsWith('image/')) {
        const md = await savePastedImage(file);
        if (md) handleCreate(md, x, y);
      } else if (file) {
        const text = await file.text();
        if (text) handleCreate(text.slice(0, 500), x, y);
      }
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      {/* Clipboard area */}
      <div className="mb-4 rounded-[8px] border p-3" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            <Clipboard size={14} />
            剪贴板 ({clipItems.length})
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={toggleClipboard} className="text-[12px] rounded-[3px] px-2 py-0.5 hover:opacity-80" style={{ background: clipRunning ? 'var(--accent-green)' : 'var(--bg-tertiary)', color: clipRunning ? '#fff' : 'var(--text-secondary)' }}>
              {clipRunning ? '收集中' : '开始收集'}
            </button>
            <button type="button" onClick={() => { window.api.clipboardClear(); setClipItems([]); }} className="text-[12px] rounded-[3px] px-2 py-0.5 hover:opacity-80" style={{ color: 'var(--accent-red)' }} aria-label="清空剪贴板">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {clipItems.length === 0 ? (
            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>暂无剪贴记录</span>
          ) : (
            clipItems.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleCreate(item.text)}
                className="shrink-0 rounded-[4px] border p-2 text-left text-[11px] hover:opacity-80"
                style={{ width: 120, height: 80, borderColor: 'var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}
              >
                {item.text.slice(0, 80)}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Create bar */}
      <div className="mb-4 flex gap-2">
        {!showCreateInput ? (
          <button
            type="button"
            onClick={() => { setCreatePos(null); setCreateInput(''); setShowCreateInput(true); }}
            className="rounded-[4px] px-4 py-1.5 text-[14px] font-medium hover:opacity-90"
            style={{ background: 'var(--accent-blue)', color: '#fff' }}
          >
            + 新建便签
          </button>
        ) : (
          <div className="flex gap-2 items-center">
            <textarea
              value={createInput}
              onChange={(e) => setCreateInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitCreate(); }
                if (e.key === 'Escape') { setShowCreateInput(false); setCreateInput(''); }
              }}
              placeholder="输入便签内容... Enter 保存, Esc 取消"
              className="rounded-[4px] border px-3 py-1.5 text-[13px] outline-none resize-none"
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)', width: 300, minHeight: 80 }}
              autoFocus
            />
            <button type="button" onClick={submitCreate} className="rounded-[4px] px-3 py-2 text-[13px] font-medium hover:opacity-90" style={{ background: 'var(--accent-blue)', color: '#fff' }}>保存</button>
            <button type="button" onClick={() => { setShowCreateInput(false); setCreateInput(''); }} className="text-[13px] hover:underline" style={{ color: 'var(--text-secondary)' }}>取消</button>
          </div>
        )}
      </div>

      {/* Error / Loading / Empty */}
      {error && (
        <div style={{ color: 'var(--accent-red)', textAlign: 'center', padding: '3rem' }}>
          <p>{error}</p>
          <button onClick={() => { setError(null); loadNotes(); }} style={{ color: 'var(--accent-blue)', marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>重试</button>
        </div>
      )}
      {loading ? (
        <p className="py-12 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>加载中...</p>
      ) : notes.length === 0 ? (
        <div className="rounded-[8px] border border-dashed p-12 text-center" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>暂无便签。点击"新建便签"或双击空白区域创建。</p>
        </div>
      ) : (
        <div
          ref={canvasRef}
          className="note-canvas flex-1 relative"
          style={{ minHeight: 600 }}
          onDoubleClick={handleDoubleClick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCanvasDrop}
        >
          {notes.map((note) => {
            const pos = getNotePosition(note.id);
            return (
              <Draggable
                key={note.id}
                defaultPosition={pos}
                onStop={(e, data) => handleDragStop(note.id, e, data)}
                bounds="parent"
                handle=".drag-handle"
              >
                <div className="absolute drag-handle" style={{ cursor: 'grab' }}>
                  <NoteCard
                    note={note}
                    onCopy={handleCopy}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onView={(n) => setViewModal(n)}
                    onImagePaste={handleImagePaste}
                  />
                </div>
              </Draggable>
            );
          })}
        </div>
      )}

      {/* Full-note modal */}
      {viewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setViewModal(null)}>
          <div className="rounded-[8px] border p-6 max-w-[500px] max-h-[80vh] overflow-y-auto w-full mx-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>便签全文</h3>
              <button type="button" onClick={() => setViewModal(null)} className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <pre className="text-[14px] whitespace-pre-wrap" style={{ color: 'var(--text-primary)', fontFamily: 'inherit' }}>{viewModal.content}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
