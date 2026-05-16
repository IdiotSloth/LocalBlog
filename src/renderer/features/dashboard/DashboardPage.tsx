import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ACHIEVEMENTS } from '../../../shared/achievements';
import type { UserStats } from '../../../shared/types';
import { getRecentBlogs, type RecentBlogEntry } from '../../hooks/useRecentHistory';
import { useAuthStore } from '../../stores/auth-store';

const Heatmap = lazy(() => import('./Heatmap'));

const TABS = [
  { id: 'overview', label: '概览' },
  { id: 'heatmap', label: '热力图' },
  { id: 'achievements', label: '成就' },
] as const;

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const [ws, setWs] = useState<Record<string, number> | null>(null);
  const [wsLoading, setWsLoading] = useState(true);
  const [wsError, setWsError] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [recentBlogs, setRecentBlogs] = useState<RecentBlogEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    let aborted = false;

    setWsLoading(true);
    setWsError(null);
    window.api
      .workspaceGetInfo(user.id)
      .then((info) => {
        if (!aborted) setWs(info as unknown as Record<string, number>);
      })
      .catch((e) => {
        console.error('[Dashboard] Failed to get workspace info:', e);
        if (!aborted) setWsError('加载失败');
      })
      .finally(() => {
        if (!aborted) setWsLoading(false);
      });

    setStatsLoading(true);
    setStatsError(null);
    window.api
      .statsGet(user.id)
      .then((r) => {
        if (aborted) return;
        if (r.success && r.data) {
          setStats(r.data);
          setAchievements(ACHIEVEMENTS.filter((a) => a.condition(r.data)).map((a) => a.id));
        }
      })
      .catch((e) => {
        console.error('[Dashboard] Failed to get stats:', e);
        if (!aborted) setStatsError('加载失败');
      })
      .finally(() => {
        if (!aborted) setStatsLoading(false);
      });

    // T1917: Load recent browsing history
    setRecentBlogs(getRecentBlogs());

    return () => {
      aborted = true;
    };
  }, [user]);

  const allAchievements = ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: achievements.includes(a.id),
  }));

  return (
    <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      {/* Hero — overview tab only */}
      {activeTab === 'overview' && (
        <div className="mb-8" style={{ fontFamily: 'var(--font-mono)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>&gt; whoami</p>
          <h1 className="mt-1 text-[40px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {user?.username || '...'}
          </h1>
          <p className="mt-1 text-[18px]" style={{ color: 'var(--text-secondary)' }}>
            本地博客与知识库
          </p>
          {statsLoading ? (
            <div className="mt-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
          ) : statsError ? (
            <div className="mt-3 text-[13px]" style={{ color: 'var(--accent-red)' }}>加载失败</div>
          ) : stats && (stats.currentStreak > 0 || stats.totalWords > 0) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {stats.currentStreak > 0 && (
                <span
                  className="rounded-[12px] px-3 py-1 text-[12px]"
                  style={{ background: 'rgba(211,153,34,0.15)', color: 'var(--accent-amber)' }}
                >
                  🔥 连续 {stats.currentStreak} 天
                </span>
              )}
              {stats.totalWords > 0 && (
                <span
                  className="rounded-[12px] px-3 py-1 text-[12px]"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  累计 {(stats.totalWords / 1000).toFixed(1)}k 字
                </span>
              )}
              {stats.totalBlogs > 0 && (
                <span
                  className="rounded-[12px] px-3 py-1 text-[12px]"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  {stats.totalBlogs} 篇文章
                </span>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b" style={{ borderColor: 'var(--border-default)' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSearchParams({ tab: t.id })}
            className="px-4 py-2 text-[13px] font-medium transition-colors"
            style={{
              color: activeTab === t.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
              borderBottom: activeTab === t.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <>
          {wsLoading ? (
            <div className="flex justify-center py-8" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
          ) : wsError ? (
            <div className="flex justify-center py-8" style={{ color: 'var(--accent-red)' }}>加载失败，请刷新重试</div>
          ) : (
            <div className="mb-8 grid grid-cols-4 gap-3">
              {[
                { label: '博客', val: ws?.blogCount ?? 0, sub: stats ? `本月 +${stats.monthlyCount}` : '', c: '--accent-blue' },
                { label: '知识库', val: ws?.knowledgeCount ?? 0, c: '--accent-green' },
                { label: '标签', val: ws?.tagCount ?? 0, c: '--accent-amber' },
                { label: '存储占用', val: ws ? fmt(ws.storageSize || 0) : '0 B', c: '--text-secondary' },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-[6px] border p-4"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
                >
                  <div className="text-[28px] font-bold" style={{ color: `var(${card.c})` }}>
                    {card.val}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    {card.label}
                    {card.sub && (
                      <span className="text-[11px]" style={{ color: 'var(--accent-green)' }}>{card.sub}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* T1917: Recent browsing history */}
          {recentBlogs.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-[14px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                最近浏览
              </h3>
              <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                {recentBlogs.slice(0, 5).map((entry) => (
                  <Link
                    key={entry.id}
                    to={`/blog/${entry.id}`}
                    className="no-underline shrink-0 rounded-[6px] border p-3 transition-all hover:border-[var(--accent-blue)]"
                    style={{
                      width: 180,
                      borderColor: 'var(--border-default)',
                      background: 'var(--bg-secondary)',
                    }}
                  >
                    <div
                      className="truncate text-[13px] font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {entry.title}
                    </div>
                    <div
                      className="mt-1 text-[11px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {new Date(entry.timestamp).toLocaleDateString('zh-CN')}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <h3 className="mb-3 text-[14px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            快捷操作
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { to: '/blog/new', label: '写博客', k: '✍', desc: '创建一篇新文章' },
              { to: '/knowledge', label: '知识库', k: '📁', desc: '导入与管理文件' },
              { to: '/tags', label: '标签', k: '#', desc: '整理分类标签' },
              { to: '/blog', label: '看博客', k: '→', desc: '浏览全部文章' },
            ].map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="rounded-[6px] border p-4 transition-all duration-[0.2s]"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-blue)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                  e.currentTarget.style.transform = '';
                }}
              >
                <div className="text-xl">{a.k}</div>
                <div className="mt-2 text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>{a.label}</div>
                <div className="mt-0.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>{a.desc}</div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Tab: Achievements */}
      {activeTab === 'achievements' && (
        <>
          {statsLoading ? (
            <div className="flex justify-center py-8" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
          ) : statsError ? (
            <div className="flex justify-center py-8" style={{ color: 'var(--accent-red)' }}>加载失败，请刷新重试</div>
          ) : (
            <>
              <h3 className="mb-3 text-[14px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                成就 ({achievements.length}/{ACHIEVEMENTS.length})
              </h3>
              <div className="mb-8 grid grid-cols-3 gap-2">
                {allAchievements.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col items-center rounded-[6px] border p-2 text-center transition-opacity"
                    style={{
                      background: a.unlocked ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                      borderColor: a.unlocked ? 'var(--accent-amber)' : 'var(--border-default)',
                      opacity: a.unlocked ? 1 : 0.4,
                    }}
                    title={a.unlocked ? `${a.name}: ${a.description}` : '???'}
                  >
                    <span className="text-[20px]">{a.unlocked ? a.emoji : '🔒'}</span>
                    <span className="mt-0.5 text-[10px] truncate w-full" style={{ color: a.unlocked ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>
                      {a.name}
                </span>
              </div>
            ))}
          </div>
            </>
          )}
        </>
      )}

      {/* Tab: Heatmap */}
      {activeTab === 'heatmap' && user && (
        <Suspense fallback={<div className="h-[140px] rounded-[6px]" style={{ background: 'var(--bg-secondary)' }} />}>
          <Heatmap userId={user.id} />
        </Suspense>
      )}
    </div>
  );
}

function fmt(bytes: number): string {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${u[i]}`;
}
