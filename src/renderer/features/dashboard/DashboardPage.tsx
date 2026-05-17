import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Note, UserStats } from '../../../shared/types';
import { getRecentBlogs, type RecentBlogEntry } from '../../hooks/useRecentHistory';
import { useAuthStore } from '../../stores/auth-store';
import { CalendarView } from './CalendarView';

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

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [ws, setWs] = useState<Record<string, number> | null>(null);
  const [wsLoading, setWsLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentBlogs, setRecentBlogs] = useState<RecentBlogEntry[]>([]);
  const [todos, setTodos] = useState<Note[]>([]);
  const [todosLoading, setTodosLoading] = useState(true);
  const [todoInput, setTodoInput] = useState('');
  const [todoSaving, setTodoSaving] = useState(false);
  const abortedRef = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    abortedRef.current = false;
    setLoadError(null);

    // Workspace info
    setWsLoading(true);
    window.api
      .workspaceGetInfo(user.id)
      .then((info) => {
        if (!abortedRef.current) setWs(info as unknown as Record<string, number>);
      })
      .catch((e) => {
        console.error('[Dashboard] workspace:', e);
        if (!abortedRef.current) setLoadError('加载工作区数据失败');
      })
      .finally(() => {
        if (!abortedRef.current) setWsLoading(false);
      });

    // User stats
    setStatsLoading(true);
    window.api
      .statsGet(user.id)
      .then((r) => {
        if (!abortedRef.current && r.success && r.data) setStats(r.data);
      })
      .catch((e) => {
        console.error('[Dashboard] stats:', e);
        if (!abortedRef.current) setLoadError('加载统计数据失败');
      })
      .finally(() => {
        if (!abortedRef.current) setStatsLoading(false);
      });

    // Recent blogs
    setRecentBlogs(getRecentBlogs());

    // Todos
    setTodosLoading(true);
    window.api
      .noteList(user.id, 'todo')
      .then((r) => {
        if (!abortedRef.current && r.success && r.data) setTodos(r.data);
      })
      .catch((e) => {
        console.error('[Dashboard] todos:', e);
        if (!abortedRef.current) setLoadError('加载待办失败');
      })
      .finally(() => {
        if (!abortedRef.current) setTodosLoading(false);
      });
  }, [user]);

  useEffect(() => {
    loadData();
    return () => { abortedRef.current = true; };
  }, [loadData]);

  // Listen for note:refresh
  useEffect(() => {
    const unsub = window.api.onNoteRefresh(() => loadData());
    return unsub;
  }, [loadData]);

  const handleAddTodo = async () => {
    if (!user || !todoInput.trim() || todoSaving) return;
    setTodoSaving(true);
    try {
      await window.api.noteCreate({
        userId: user.id,
        content: todoInput.trim(),
        title: todoInput.trim(),
        memoType: 'todo',
      });
      setTodoInput('');
      loadData();
    } catch (e) {
      console.error('[Dashboard] add todo:', e);
    } finally {
      setTodoSaving(false);
    }
  };

  const handleDeleteTodo = async (noteId: number) => {
    if (!user) return;
    try {
      await window.api.noteDelete({ userId: user.id, noteId });
      loadData();
    } catch (e) {
      console.error('[Dashboard] delete todo:', e);
    }
  };

  const handleCompleteTodo = async (todo: Note) => {
    if (!user) return;
    try {
      await window.api.noteCreate({
        userId: user.id,
        noteId: todo.id,
        content: todo.content,
        title: todo.title,
        memoType: 'note',
        dueDate: todo.dueDate,
      });
      loadData();
    } catch (e) {
      console.error('[Dashboard] complete todo:', e);
    }
  };

  const hasStats = !wsLoading && !statsLoading && ws;
  const statCards = hasStats
    ? [
        { label: '博客', val: ws?.blogCount ?? 0, sub: stats?.monthlyCount ? `本月 +${stats.monthlyCount}` : '', icon: '✍', c: 'var(--accent-blue)' },
        { label: '知识库', val: ws?.knowledgeCount ?? 0, icon: '📁', c: 'var(--accent-green)' },
        { label: '标签', val: ws?.tagCount ?? 0, icon: '#', c: 'var(--accent-amber)' },
        { label: '存储', val: fmt(ws?.storageSize || 0), icon: '💾', c: 'var(--text-secondary)' },
      ]
    : [];

  return (
    <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      {/* ═══ Hero ═══ */}
      <div
        className="relative mb-8 overflow-hidden rounded-[16px] border p-8 md:p-10"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
      >
        {/* Subtle gradient blobs */}
        <div
          className="absolute -right-8 -top-8 h-[120px] w-[120px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, var(--accent-blue) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-6 -left-6 h-[100px] w-[100px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, var(--accent-green) 0%, transparent 70%)' }}
        />
        <div className="relative">
          <p className="text-[14px] tracking-wide" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {getGreeting()}
          </p>
          <h1 className="mt-1 text-[38px] font-bold leading-tight tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {user?.username || '...'}
          </h1>
          <p className="mt-2 text-[16px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            本地博客与知识库
          </p>
        </div>
        {statsLoading ? (
          <div className="relative mt-5 h-8 rounded-[6px] animate-pulse" style={{ background: 'var(--bg-tertiary)', width: 200 }} />
        ) : stats ? (
          <div className="relative mt-5 flex flex-wrap gap-2">
            {stats.currentStreak > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-amber)' }}>
                🔥 连续 {stats.currentStreak} 天
              </span>
            )}
            {stats.totalWords > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                累计 {(stats.totalWords / 1000).toFixed(1)}k 字
              </span>
            )}
            {stats.totalBlogs > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                {stats.totalBlogs} 篇文章
              </span>
            )}
          </div>
        ) : null}
      </div>

      {/* ═══ Stats + Recent + Actions ═══ */}
      {loadError && (
        <div className="mb-6 rounded-[10px] border p-8 text-center" style={{ borderColor: 'var(--accent-red)', background: 'var(--bg-secondary)' }}>
          <p className="text-[14px]" style={{ color: 'var(--accent-red)' }}>{loadError}</p>
          <button type="button" onClick={loadData} className="mt-3 text-[13px] hover:underline" style={{ color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>重试</button>
        </div>
      )}
      <div className="mb-8 grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Left: Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-[10px] border p-5 transition-all duration-[0.2s] hover:border-[var(--accent-blue)] hover:-translate-y-0.5"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
            >
              <div className="text-[20px]">{card.icon}</div>
              <div className="mt-2 text-[28px] font-bold" style={{ color: card.c }}>
                {card.val}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                {card.label}
                {card.sub && (
                  <span className="text-[11px]" style={{ color: 'var(--accent-green)' }}>{card.sub}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Quick actions */}
        <div className="flex flex-col gap-3">
          <div className="rounded-[10px] border p-5 flex-1" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
            <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              快捷操作
            </h3>
            <div className="space-y-2">
              {[
                { to: '/blog/new', label: '写博客', detail: '创建一篇新文章', icon: '✍', c: 'var(--accent-blue)' },
                { to: '/knowledge', label: '知识库', detail: '导入与管理文件', icon: '📁', c: 'var(--accent-green)' },
                { to: '/tags', label: '标签管理', detail: '整理分类标签', icon: '#', c: 'var(--accent-amber)' },
                { to: '/blog', label: '看博客', detail: '浏览全部文章', icon: '→', c: 'var(--text-secondary)' },
              ].map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-[14px] no-underline transition-all duration-[0.15s] hover:translate-x-1"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[16px]" style={{ background: 'var(--bg-tertiary)' }}>
                    {a.icon}
                  </span>
                  <div className="flex-1">
                    <span className="font-medium" style={{ color: a.c }}>{a.label}</span>
                    <span className="ml-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>{a.detail}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Mini recent blogs */}
          {recentBlogs.length > 0 && (
            <div className="rounded-[10px] border p-5" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
              <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                最近浏览
              </h3>
              <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                {recentBlogs.slice(0, 5).map((entry) => (
                  <Link
                    key={entry.id}
                    to={`/blog/${entry.id}`}
                    className="no-underline shrink-0 rounded-[6px] border px-3 py-2 text-[13px] font-medium transition-all hover:border-[var(--accent-blue)]"
                    style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)', maxWidth: 160 }}
                  >
                    <span className="line-clamp-2 block">{entry.title}</span>
                    <span className="mt-1 block text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {new Date(entry.timestamp).toLocaleDateString('zh-CN')}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Calendar ═══ */}
      <section
        className="mb-8 rounded-[14px] border p-6 md:p-8"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[20px]" style={{ background: 'var(--bg-tertiary)' }}>
            📅
          </span>
          <div>
            <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>日程</h2>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>点击日期添加日程安排</p>
          </div>
        </div>
        <CalendarView />
      </section>

      {/* ═══ Todos ═══ */}
      <section
        className="mb-8 rounded-[14px] border p-6 md:p-8"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[20px]" style={{ background: 'var(--bg-tertiary)' }}>
            ✅
          </span>
          <div>
            <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>待办</h2>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{todos.length > 0 ? `${todos.length} 项待完成` : '暂无待办事项'}</p>
          </div>
        </div>

        {/* Add todo input */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={todoInput}
            onChange={(e) => setTodoInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
            placeholder="添加待办事项..."
            aria-label="添加待办事项"
            className="flex-1 rounded-[6px] border px-4 py-2.5 text-[14px] outline-none transition-all focus:border-[var(--accent-blue)]"
            style={{
              background: 'var(--bg-primary)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="button"
            onClick={handleAddTodo}
            disabled={!todoInput.trim() || todoSaving}
            className="rounded-[6px] px-5 py-2.5 text-[14px] font-medium transition-opacity hover:opacity-85 disabled:opacity-40"
            style={{ background: 'var(--color-primary)', color: 'var(--text-on-accent)' }}
          >
            {todoSaving ? '...' : '添加'}
          </button>
        </div>

        {/* Todo list */}
        {todosLoading ? (
          <div className="flex justify-center py-8 text-[13px]" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
        ) : todos.length === 0 ? (
          <div
            className="rounded-[8px] border border-dashed p-8 text-center"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
              暂无待办事项 — 在上方输入框添加
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className="group flex items-center gap-3 rounded-[6px] px-4 py-3 transition-colors duration-[0.15s] hover:bg-[var(--bg-primary)]"
              >
                <button
                  type="button"
                  onClick={() => handleCompleteTodo(todo)}
                  title="标记为已完成"
                  aria-label="标记为已完成"
                  className="shrink-0 text-[18px] transition-all duration-[0.15s] hover:scale-125 hover:text-[var(--accent-green)]"
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
                >
                  ☐
                </button>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[14px]" style={{ color: 'var(--text-primary)' }}>
                    {todo.title || todo.content}
                  </p>
                  {todo.dueDate && (
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {todo.dueDate.slice(0, 10)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteTodo(todo.id)}
                  aria-label="删除待办"
                  className="shrink-0 rounded-[4px] px-2 py-1 text-[12px] opacity-0 group-hover:opacity-100 transition-all hover:bg-[var(--accent-red)] hover:text-white"
                  style={{ color: 'var(--text-muted)' }}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
