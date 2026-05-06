import { useEffect, useState } from 'react';

interface DayStat {
  date: string;
  blogCount: number;
  wordCount: number;
}

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const DAY_LABELS = ['', '一', '', '三', '', '五', '日'];

function getColor(count: number, words: number): string {
  const weight = count * 3 + Math.min(words / 500, 10);
  if (weight <= 0) return 'var(--bg-tertiary)';
  if (weight <= 2) return '#9be9a8';
  if (weight <= 5) return '#40c463';
  if (weight <= 10) return '#30a14e';
  return '#216e39';
}

interface Props {
  userId: number;
}

export function Heatmap({ userId }: Props) {
  const [data, setData] = useState<DayStat[]>([]);
  const [tooltip, setTooltip] = useState<{ date: string; count: number; words: number; x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    window.api.statsDaily(userId).then((r) => {
      if (r.success && r.data) setData(r.data);
    }).catch((e) => {
      console.error('[Heatmap] Failed to load daily stats:', e);
    });
  }, [userId]);

  // Build 365-day grid
  const today = new Date();
  const cells: { date: string; dayOfWeek: number; count: number; words: number }[] = [];
  const dayMap = new Map(data.map((d) => [d.date, d]));

  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().substring(0, 10);
    const stat = dayMap.get(key);
    cells.push({
      date: key,
      dayOfWeek: d.getDay() === 0 ? 6 : d.getDay() - 1, // Mon=0..Sun=6
      count: stat?.blogCount || 0,
      words: stat?.wordCount || 0,
    });
  }

  // Group into weeks (columns)
  const weeks: (typeof cells)[] = [];
  let week: typeof cells = [];
  for (const cell of cells) {
    week.push(cell);
    if (cell.dayOfWeek === 6 || cells.indexOf(cell) === cells.length - 1) {
      weeks.push(week);
      week = [];
    }
  }

  // Month labels
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((w, i) => {
    if (w.length > 0) {
      const m = new Date(w[0].date).getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ label: MONTHS[m], col: i });
        lastMonth = m;
      }
    }
  });

  return (
    <div
      className="rounded-[6px] border p-4"
      style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}
    >
      <h3 className="mb-3 text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
        写作热力图
      </h3>
      <div className="overflow-x-auto">
        {/* Month labels */}
        <div className="flex mb-1 ml-7">
          {monthLabels.map((m, i) => (
            <span
              key={i}
              className="text-[10px]"
              style={{
                color: 'var(--text-secondary)',
                width: `${weeks.slice(m.col, i + 1 < monthLabels.length ? monthLabels[i + 1].col : weeks.length).length * 14}px`,
                minWidth: 28,
                textAlign: 'left',
              }}
            >
              {m.label}
            </span>
          ))}
        </div>
        <div className="flex">
          {/* Day labels */}
          <div className="flex flex-col mr-1 gap-[2px]">
            {DAY_LABELS.map((l, i) => (
              <span key={i} className="text-[9px] leading-[12px] h-[12px]" style={{ color: 'var(--text-secondary)' }}>
                {l}
              </span>
            ))}
          </div>
          {/* Grid */}
          <div className="flex gap-[2px]">
            {weeks.map((w, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {Array.from({ length: 7 }).map((_, di) => {
                  const cell = w.find((c) => c.dayOfWeek === di);
                  if (!cell) return <div key={di} className="w-[12px] h-[12px]" />;
                  return (
                    <div
                      key={di}
                      className="w-[12px] h-[12px] rounded-[2px] cursor-pointer transition-opacity hover:opacity-70"
                      style={{ background: getColor(cell.count, cell.words) }}
                      onMouseEnter={(e) => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        setTooltip({
                          date: cell.date,
                          count: cell.count,
                          words: cell.words,
                          x: rect.left,
                          y: rect.top - 28,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="mt-2 flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          <span>Less</span>
          {['var(--bg-tertiary)', '#9be9a8', '#40c463', '#30a14e', '#216e39'].map((c) => (
            <div key={c} className="w-[12px] h-[12px] rounded-[2px]" style={{ background: c }} />
          ))}
          <span>More</span>
        </div>
      </div>
      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 rounded-[4px] border px-2 py-1 text-[11px] pointer-events-none whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            borderColor: 'var(--border-default)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
          }}
        >
          {tooltip.date}: {tooltip.count} 篇博客, {tooltip.words.toLocaleString()} 字
        </div>
      )}
    </div>
  );
}
