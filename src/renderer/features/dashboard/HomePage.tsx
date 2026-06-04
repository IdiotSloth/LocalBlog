import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Search, StickyNote, PenLine, FolderOpen, Hash, ArrowRight, CheckSquare, Plus, Layout, Clock, FileText } from 'lucide-react';
import type { DraftItem, LastBlog, Note, RecentFile, UserStats } from '../../../shared/types';
import { getRecentBlogs, type RecentBlogEntry } from '../../hooks/useRecentHistory';
import { useSavedQueries } from '../../hooks/useSavedQueries';
import { useAuthStore } from '../../stores/auth-store';
import { CalendarView } from '../../components/CalendarView';

function fmt(bytes: number): string {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${u[i]}`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return '早上好';
  if (h < 18) return '下午好';
  return '晚上好';
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

type ContinueTab = 'drafts' | 'recent' | 'files';

function TodoItem({ todo, isCompleted, onToggle, onDelete }: { todo: Note; isCompleted: boolean; onToggle: () => void; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-2 py-1.5">
      <input type="checkbox" checked={isCompleted} onChange={onToggle} title={isCompleted ? '取消完成' : '标记完成'} aria-label={isCompleted ? '取消完成' : '标记完成'}
        className="shrink-0 rounded-sm" style={{ width: 14, height: 14, accentColor: 'var(--accent-blue)' }} />
      <div className="flex-1 min-w-0">
        <p className="truncate text-[13px]" style={{ color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isCompleted ? 'line-through' : 'none' }}>{todo.title || todo.content}</p>
      </div>
      <button type="button" onClick={onDelete} aria-label="删除待办"
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>✕</button>
    </div>
  );
}

function CompletedSection({ todos, onToggle, onDelete }: { todos: Note[]; onToggle: (t: Note) => void; onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setExpanded(false), 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [todos.length]);

  return (
    <div className="mt-2 border-t pt-2" style={{ borderColor: 'var(--border-default)' }}>
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[11px] hover:opacity-80"
        style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
        <span>{expanded ? '▾' : '▸'}</span>
        已完成 ({todos.length})
      </button>
      {expanded && (
        <div className="mt-1 space-y-1">
          {todos.map((t) => (
            <TodoItem key={t.id} todo={t} isCompleted={true} onToggle={() => onToggle(t)} onDelete={() => onDelete(t.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const abortedRef = useRef(false);

  // Stats
  const [ws, setWs] = useState<Record<string, number> | null>(null);
  const [wsLoading, setWsLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Continue panel
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [lastBlog, setLastBlog] = useState<LastBlog | null>(null);
  const [lastBlogLoading, setLastBlogLoading] = useState(true);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [recentFilesLoading, setRecentFilesLoading] = useState(true);
  const [recentBlogs, setRecentBlogs] = useState<RecentBlogEntry[]>([]);
  const [continueTab, setContinueTab] = useState<ContinueTab>('drafts');
  const { items: savedQueries } = useSavedQueries();

  // Todos
  const [todos, setTodos] = useState<Note[]>([]);
  const [todosLoading, setTodosLoading] = useState(true);
  const [todoInput, setTodoInput] = useState('');
  const [todoSaving, setTodoSaving] = useState(false);
  const [completedTodoIds, setCompletedTodoIds] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('home_completed_todos') || '[]')); }
    catch { return new Set<number>(); }
  });

  // Daily note
  const [dailyNote, setDailyNote] = useState<Note | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyInput, setDailyInput] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [dateSchedules, setDateSchedules] = useState<Note[]>([]);

  // Error
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    abortedRef.current = false;
    setLoadError(null);

    setWsLoading(true);
    window.api.workspaceGetInfo(user.id)
      .then((info) => { if (!abortedRef.current) setWs(info as unknown as Record<string, number>); })
      .catch((e) => { console.error('[Home] workspace:', e); if (!abortedRef.current) setLoadError('加载工作区数据失败'); })
      .finally(() => { if (!abortedRef.current) setWsLoading(false); });

    setStatsLoading(true);
    window.api.statsGet(user.id)
      .then((r) => { if (!abortedRef.current && r.success && r.data) setStats(r.data); })
      .catch((e) => { console.error('[Home] stats:', e); if (!abortedRef.current) setLoadError('加载统计数据失败'); })
      .finally(() => { if (!abortedRef.current) setStatsLoading(false); });

    setDraftsLoading(true);
    window.api.continueGetDrafts(user.id)
      .then((r) => { if (!abortedRef.current && r.success && r.data) setDrafts(r.data); })
      .catch((e) => { console.error('[Home] drafts:', e); })
      .finally(() => { if (!abortedRef.current) setDraftsLoading(false); });

    setLastBlogLoading(true);
    window.api.continueGetLastBlog(user.id)
      .then((r) => { if (!abortedRef.current && r.success && r.data) setLastBlog(r.data); })
      .catch((e) => { console.error('[Home] lastBlog:', e); })
      .finally(() => { if (!abortedRef.current) setLastBlogLoading(false); });

    setRecentFilesLoading(true);
    window.api.continueGetRecentFiles(user.id)
      .then((r) => { if (!abortedRef.current && r.success && r.data) setRecentFiles(r.data); })
      .catch((e) => { console.error('[Home] recentFiles:', e); })
      .finally(() => { if (!abortedRef.current) setRecentFilesLoading(false); });

    setRecentBlogs(getRecentBlogs());

    setTodosLoading(true);
    window.api.noteList(user.id, 'todo')
      .then((r) => { if (!abortedRef.current && r.success && r.data) setTodos(r.data); })
      .catch((e) => { console.error('[Home] todos:', e); if (!abortedRef.current) setLoadError('加载待办失败'); })
      .finally(() => { if (!abortedRef.current) setTodosLoading(false); });

    setDailyLoading(true);
    const today = todayStr();
    window.api.noteList(user.id, 'daily', today, today)
      .then((r) => {
        if (abortedRef.current) return;
        if (r.success && r.data && r.data.length > 0) {
          const note = r.data[0]!;
          setDailyNote(note);
          setDailyInput(note.content || '');
        } else {
          setDailyNote(null);
          setDailyInput('');
        }
      })
      .catch((e) => { console.error('[Home] dailyNote:', e); })
      .finally(() => { if (!abortedRef.current) setDailyLoading(false); });
  }, [user]);

  useEffect(() => {
    loadData();
    return () => { abortedRef.current = true; };
  }, [loadData]);

  useEffect(() => {
    const unsub = window.api.onNoteRefresh(() => loadData());
    return unsub;
  }, [loadData]);

  // ---- Todo handlers ----
  const handleAddTodo = async () => {
    if (!user || !todoInput.trim() || todoSaving) return;
    setTodoSaving(true);
    try {
      await window.api.noteCreate({ userId: user.id, content: todoInput.trim(), title: todoInput.trim(), memoType: 'todo' });
      setTodoInput('');
      loadData();
    } catch (e) { console.error('[Home] add todo:', e); }
    finally { setTodoSaving(false); }
  };

  const handleCompleteTodo = (todo: Note) => {
    const next = new Set(completedTodoIds);
    if (next.has(todo.id)) {
      next.delete(todo.id);
    } else {
      next.add(todo.id);
    }
    setCompletedTodoIds(next);
    localStorage.setItem('home_completed_todos', JSON.stringify([...next]));
  };

  const handleDeleteTodo = async (noteId: number) => {
    if (!user) return;
    try { await window.api.noteDelete({ userId: user.id, noteId }); loadData(); }
    catch (e) { console.error('[Home] delete todo:', e); }
  };

  const handleCalendarDateSelect = useCallback(async (dateStr: string) => {
    setSelectedDate(dateStr);
    if (!user) return;
    // R328: Load both daily notes and schedules for selected date
    const [dailyR, schedR] = await Promise.all([
      window.api.noteList(user.id, 'daily', dateStr, dateStr),
      window.api.noteList(user.id, 'schedule', dateStr, dateStr),
    ]);
    if (dailyR.success && dailyR.data && dailyR.data.length > 0) {
      const note = dailyR.data[0]!;
      setDailyNote(note);
      setDailyInput(note.content || '');
    } else {
      setDailyNote(null);
      setDailyInput('');
    }
    if (schedR.success && schedR.data) {
      setDateSchedules(schedR.data);
    } else {
      setDateSchedules([]);
    }
  }, [user]);

  // ---- Daily note handlers ----
  const handleSaveDaily = async () => {
    if (!user) return;
    try {
      if (dailyNote) {
        await window.api.noteCreate({ userId: user.id, noteId: dailyNote.id, content: dailyInput, title: selectedDate, memoType: 'daily', dueDate: selectedDate });
      } else {
        await window.api.noteCreate({ userId: user.id, content: dailyInput, title: selectedDate, memoType: 'daily', dueDate: selectedDate });
      }
      loadData();
    } catch (e) { console.error('[Home] save daily:', e); }
  };

  const hasStats = !wsLoading && !statsLoading && ws;

  const CONTINUE_TABS: { id: ContinueTab; label: string; icon: typeof Layout; count: number }[] = [
    { id: 'drafts', label: '草稿', icon: PenLine, count: drafts.length },
    { id: 'recent', label: '最近打开', icon: Clock, count: (lastBlog ? 1 : 0) + recentBlogs.length },
    { id: 'files', label: '最近素材', icon: FileText, count: recentFiles.length },
  ];

  return (
    <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      {/* ═══ Hero ═══ */}
      <div className="relative mb-4 overflow-hidden rounded-[16px] border p-5"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
        <div className="absolute -right-8 -top-8 h-[120px] w-[120px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, var(--accent-blue) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-6 -left-6 h-[100px] w-[100px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, var(--accent-green) 0%, transparent 70%)' }} />
        <div className="relative">
          <p className="text-[14px] tracking-wide" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{getGreeting()}，{user?.username || '...'}</p>
          <h1 className="mt-1 text-[38px] font-bold leading-tight tracking-tight" style={{ color: 'var(--text-primary)' }}>本地博客与知识库</h1>
          <p className="mt-2 text-[16px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>离线优先的个人知识中枢</p>
        </div>
        {statsLoading ? (
          <div className="relative mt-5 h-8 rounded-[6px] animate-pulse" style={{ background: 'var(--bg-tertiary)', width: 200 }} />
        ) : stats ? (
          <div className="relative mt-5 flex flex-wrap gap-2">
            {stats.currentStreak > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>连续 {stats.currentStreak} 天</span>
            )}
            {stats.totalWords > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>累计 {(stats.totalWords / 1000).toFixed(1)}k 字</span>
            )}
            {stats.totalBlogs > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{stats.totalBlogs} 篇文章</span>
            )}
          </div>
        ) : null}
      </div>

      {/* ═══ Error banner ═══ */}
      {loadError && (
        <div className="mb-6 rounded-[10px] border p-8 text-center" style={{ borderColor: 'var(--accent-red)', background: 'var(--bg-secondary)' }}>
          <p className="text-[14px]" style={{ color: 'var(--accent-red)' }}>{loadError}</p>
          <button type="button" onClick={loadData} className="mt-3 text-[13px] hover:underline" style={{ color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>重试</button>
        </div>
      )}

      {/* ═══ Quick actions bar ═══ */}
      <div className="mb-8 flex flex-wrap gap-3">
        {[
          { to: '/blog/new', label: '写博客', icon: PenLine, c: 'var(--accent-blue)' },
          { to: '/knowledge', label: '知识库', icon: FolderOpen, c: 'var(--accent-green)' },
          { to: '/tags', label: '标签', icon: Hash, c: 'var(--text-secondary)' },
          { to: '/blog', label: '浏览', icon: ArrowRight, c: 'var(--text-secondary)' },
        ].map((a) => (
          <Link key={a.to} to={a.to}
            className="inline-flex items-center gap-2 rounded-[8px] border px-4 py-2 text-[14px] font-medium no-underline transition-all duration-[0.15s] hover:border-[var(--accent-blue)]"
            style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)', color: a.c }}>
            <a.icon size={16} />
            {a.label}
          </Link>
        ))}
      </div>

      {/* ═══ Calendar + Detail Panel (D136=A — permanent split) ═══ */}
      <div className="mb-8 grid gap-6" style={{ gridTemplateColumns: 'minmax(420px, 3fr) 2fr' }}>
        {/* Calendar — large, dominant */}
        <section className="rounded-[14px] border p-6" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
          <CalendarView onDateSelect={handleCalendarDateSelect} />
          {dateSchedules.length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
              <p className="text-[12px] font-medium mb-1" style={{ color: 'var(--accent-green)' }}>
                {selectedDate} 行程 ({dateSchedules.length})
              </p>
              {dateSchedules.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-[13px] py-0.5" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block', flexShrink: 0 }} />
                  <span>{s.title || s.content?.slice(0, 60)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right detail panel — todos + notes for selected date */}
        <section className="rounded-[14px] border p-5" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
          <h3 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            {selectedDate === todayStr() ? '今日详情' : selectedDate}
          </h3>

          {/* Todos for selected date */}
          <div className="flex items-center gap-2 mb-2">
              <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: '#e08b4a' }} />
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>待办</span>
            </div>
            <div className="mb-2 flex gap-1.5">
              <input type="text" value={todoInput} onChange={(e) => setTodoInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                placeholder="添加待办..." aria-label="添加待办事项"
                className="flex-1 rounded-[4px] border px-2.5 py-1.5 text-[12px] outline-none"
                style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
              <button type="button" onClick={handleAddTodo} disabled={!todoInput.trim() || todoSaving}
                className="rounded-[4px] px-3 py-1.5 text-[12px] font-medium hover:opacity-90 disabled:opacity-40"
                style={{ background: 'var(--accent-blue)', color: '#fff' }}>
                {todoSaving ? '...' : '+'}
              </button>
            </div>
            {todosLoading ? (
              <p className="text-[12px] py-2" style={{ color: 'var(--text-secondary)' }}>加载中...</p>
            ) : todos.length === 0 ? (
              <p className="text-[12px] py-2" style={{ color: 'var(--text-muted)' }}>暂无待办</p>
            ) : (
            <>
              {/* Active todos */}
              <div className="space-y-1 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {todos.filter(t => !completedTodoIds.has(t.id)).map((todo) => (
                <TodoItem key={todo.id} todo={todo} isCompleted={false} onToggle={() => handleCompleteTodo(todo)} onDelete={() => handleDeleteTodo(todo.id)} />
                ))}
                {todos.filter(t => !completedTodoIds.has(t.id)).length === 0 && (
                  <p className="text-[12px] py-2" style={{ color: 'var(--text-muted)' }}>全部完成</p>
                )}
              </div>
              {/* Completed section with auto-collapse */}
              {todos.filter(t => completedTodoIds.has(t.id)).length > 0 && (
                <CompletedSection
                  todos={todos.filter(t => completedTodoIds.has(t.id))}
                  onToggle={handleCompleteTodo}
                  onDelete={(id) => handleDeleteTodo(id)}
                />
              )}
            </>
          )}
        </section>
      </div>

      {/* ═══ 继续... unified panel ═══ */}
      <div className="mb-8 rounded-[14px] border p-6" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
        <div className="mb-4 flex items-center gap-3">
          <Layout size={20} style={{ color: 'var(--text-secondary)' }} />
          <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>继续...</h2>
        </div>

        {/* Tab bar */}
        <div className="mb-4 flex border-b" style={{ borderColor: 'var(--border-default)' }}>
          {CONTINUE_TABS.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setContinueTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium transition-colors duration-[0.15s] border-b-2"
              style={{
                color: continueTab === tab.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                borderColor: continueTab === tab.id ? 'var(--accent-blue)' : 'transparent',
                background: 'transparent',
                cursor: 'pointer',
              }}>
              <tab.icon size={14} />
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 rounded-full px-1.5 text-[11px]" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {/* Drafts tab */}
          {continueTab === 'drafts' && (
            draftsLoading ? (
              <p className="text-[13px] py-4" style={{ color: 'var(--text-secondary)' }}>加载中...</p>
            ) : drafts.length === 0 ? (
              <div className="rounded-[8px] border border-dashed p-6 text-center" style={{ borderColor: 'var(--border-default)' }}>
                <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>暂无草稿 — 在编辑器中未保存的内容会自动保存为草稿</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[240px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {drafts.slice(0, 5).map((d) => (
                  <Link key={d.id} to={`/blog/${d.blogId}/edit`}
                    className="no-underline flex items-center gap-3 rounded-[6px] px-3 py-2.5 transition-all hover:bg-[var(--bg-primary)]"
                    style={{ color: 'var(--text-primary)' }}>
                    <PenLine size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span className="flex-1 truncate text-[13px] font-medium">{d.blogTitle}</span>
                    <span className="shrink-0 text-[11px]" style={{ color: 'var(--text-muted)' }}>{new Date(d.savedAt).toLocaleDateString('zh-CN')}</span>
                  </Link>
                ))}
              </div>
            )
          )}

          {/* Recent tab */}
          {continueTab === 'recent' && (
            <div className="space-y-1 max-h-[240px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {lastBlogLoading ? (
                <p className="text-[13px] py-4" style={{ color: 'var(--text-secondary)' }}>加载中...</p>
              ) : (
                <>
                  {lastBlog && (
                    <Link to={`/blog/${lastBlog.id}`}
                      className="no-underline flex items-center gap-3 rounded-[6px] px-3 py-2.5 transition-all hover:bg-[var(--bg-primary)]"
                      style={{ color: 'var(--text-primary)' }}>
                      <Clock size={14} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                      <span className="flex-1 truncate text-[13px] font-medium">{lastBlog.title}</span>
                      <span className="shrink-0 text-[11px]" style={{ color: 'var(--text-muted)' }}>{new Date(lastBlog.updatedAt).toLocaleDateString('zh-CN')}</span>
                      <span className="shrink-0 rounded-full px-1.5 text-[10px]" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>上次停留</span>
                    </Link>
                  )}
                  {recentBlogs.filter((b) => !lastBlog || b.id !== lastBlog.id).slice(0, 4).map((entry) => (
                    <Link key={entry.id} to={`/blog/${entry.id}`}
                      className="no-underline flex items-center gap-3 rounded-[6px] px-3 py-2.5 transition-all hover:bg-[var(--bg-primary)]"
                      style={{ color: 'var(--text-primary)' }}>
                      <Clock size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span className="flex-1 truncate text-[13px]">{entry.title}</span>
                      <span className="shrink-0 text-[11px]" style={{ color: 'var(--text-muted)' }}>{new Date(entry.timestamp).toLocaleDateString('zh-CN')}</span>
                    </Link>
                  ))}
                  {!lastBlog && recentBlogs.length === 0 && (
                    <div className="rounded-[8px] border border-dashed p-6 text-center" style={{ borderColor: 'var(--border-default)' }}>
                      <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>暂无最近浏览记录</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Files tab */}
          {continueTab === 'files' && (
            recentFilesLoading ? (
              <p className="text-[13px] py-4" style={{ color: 'var(--text-secondary)' }}>加载中...</p>
            ) : recentFiles.length === 0 ? (
              <div className="rounded-[8px] border border-dashed p-6 text-center" style={{ borderColor: 'var(--border-default)' }}>
                <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>暂无最近导入的文件</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[240px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {recentFiles.slice(0, 5).map((f) => (
                  <Link key={f.id} to="/knowledge"
                    className="no-underline flex items-center gap-3 rounded-[6px] px-3 py-2.5 transition-all hover:bg-[var(--bg-primary)]"
                    style={{ color: 'var(--text-primary)' }}>
                    <FileText size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span className="flex-1 truncate text-[13px]">{f.filename}</span>
                    <span className="shrink-0 text-[11px]" style={{ color: 'var(--text-muted)' }}>{new Date(f.createdAt).toLocaleDateString('zh-CN')}</span>
                  </Link>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Saved Queries (T2206) */}
      {savedQueries.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {savedQueries.slice(0, 6).map((sq, i) => (
            <Link key={i} to={`/blog?q=${encodeURIComponent(sq.query)}`}
              className="no-underline inline-flex items-center gap-1.5 rounded-[6px] border px-3 py-1.5 text-[12px] font-medium transition-colors hover:border-[var(--accent-blue)]"
              style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <Search size={12} />
              {sq.name}
            </Link>
          ))}
        </div>
      )}

    </div>
  );
}
