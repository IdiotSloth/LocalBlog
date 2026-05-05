interface Props {
  minutes: number;
  charCount: number;
}

export function ReadingTime({ minutes, charCount }: Props) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
      <span>约 {minutes} 分钟阅读</span>
      <span style={{ color: 'var(--border-emphasis)' }}>·</span>
      <span>{charCount.toLocaleString()} 字</span>
    </span>
  );
}
