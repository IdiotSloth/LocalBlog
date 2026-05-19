/**
 * T2109: Skeleton loading placeholders for the "Cozy Study" design language.
 * Used during async data loading to avoid layout shifts.
 */

interface SkeletonProps {
  lines?: number;
  width?: string;
}

export function TextSkeleton({ lines = 3, width }: SkeletonProps) {
  const widths = width ? [width] : ['100%', '80%', '60%'];
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded animate-pulse"
          style={{
            width: width || widths[i % widths.length],
            background: 'var(--bg-tertiary)',
          }}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-[8px] p-5 animate-pulse" style={{ background: 'var(--bg-secondary)' }}>
      <div className="h-5 w-2/3 rounded mb-3" style={{ background: 'var(--bg-tertiary)' }} />
      <TextSkeleton lines={3} />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-[8px] animate-pulse"
          style={{ background: 'var(--bg-secondary)' }}
        >
          <div className="w-8 h-8 rounded-full shrink-0" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="h-3 w-2/3 rounded" style={{ background: 'var(--bg-tertiary)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
