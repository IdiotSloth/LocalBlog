import { useCallback, useEffect, useRef, useState } from 'react';

interface DayStat {
  date: string;
  blogCount: number;
  wordCount: number;
}

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const DAY_LABELS = ['', '一', '', '三', '', '五', '日'];
const CELL = 12;
const GAP = 2;
const CELL_STEP = CELL + GAP;

function getColor(count: number, words: number): string {
  const weight = count * 3 + Math.min(words / 500, 10);
  if (weight <= 0) return 'var(--heatmap-0)';
  if (weight <= 2) return 'var(--heatmap-1)';
  if (weight <= 5) return 'var(--heatmap-2)';
  if (weight <= 10) return 'var(--heatmap-3)';
  return 'var(--heatmap-4)';
}

function resolveColor(c: string, style: CSSStyleDeclaration): string {
  return c.startsWith('var(') ? style.getPropertyValue(c.slice(4, -1)).trim() : c;
}

interface Props {
  userId: number;
}

export function Heatmap({ userId }: Props) {
  const [data, setData] = useState<DayStat[]>([]);
  const [tooltip, setTooltip] = useState<{ date: string; count: number; words: number; x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    window.api.statsDaily(userId).then((r) => {
      if (r.success && r.data) setData(r.data);
    }).catch((e) => {
      console.error('[Heatmap] Failed to load daily stats:', e);
    });
  }, [userId]);

  // Build cell data
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
      dayOfWeek: d.getDay() === 0 ? 6 : d.getDay() - 1,
      count: stat?.blogCount || 0,
      words: stat?.wordCount || 0,
    });
  }

  // Group into weeks
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
      const m = new Date(w[0]!.date).getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ label: MONTHS[m], col: i });
        lastMonth = m;
      }
    }
  });

  // Canvas drawing
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const style = getComputedStyle(canvas);
    const W = weeks.length * CELL_STEP;
    const H = 7 * CELL_STEP;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    ctx.clearRect(0, 0, W, H);

    for (let wi = 0; wi < weeks.length; wi++) {
      for (let di = 0; di < 7; di++) {
        const cell = weeks[wi]?.find((c) => c.dayOfWeek === di);
        if (!cell) continue;
        const x = wi * CELL_STEP;
        const y = di * CELL_STEP;
        ctx.fillStyle = resolveColor(getColor(cell.count, cell.words), style);
        ctx.beginPath();
        ctx.roundRect(x, y, CELL, CELL, 2);
        ctx.fill();
      }
    }
  }, [weeks]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const wi = Math.floor(mx / CELL_STEP);
      const di = Math.floor(my / CELL_STEP);
      const cell = weeks[wi]?.find((c) => c.dayOfWeek === di);
      if (cell) {
        setTooltip({
          date: cell.date,
          count: cell.count,
          words: cell.words,
          x: e.clientX,
          y: e.clientY - 36,
        });
      } else {
        setTooltip(null);
      }
    },
    [weeks],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

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
                width: `${weeks.slice(m.col, i + 1 < monthLabels.length ? monthLabels[i + 1]!.col : weeks.length).length * CELL_STEP}px`,
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
          <div className="flex flex-col mr-1" style={{ gap: GAP }}>
            {DAY_LABELS.map((l, i) => (
              <span key={i} className="text-[9px] leading-[12px]" style={{ color: 'var(--text-secondary)', height: CELL, lineHeight: `${CELL}px` }}>
                {l}
              </span>
            ))}
          </div>
          {/* Canvas grid */}
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: 'pointer' }}
          />
        </div>
        {/* Legend */}
        <div className="mt-2 flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          <span>Less</span>
          {['var(--heatmap-0)', 'var(--heatmap-1)', 'var(--heatmap-2)', 'var(--heatmap-3)', 'var(--heatmap-4)'].map((c) => (
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

export default Heatmap;
