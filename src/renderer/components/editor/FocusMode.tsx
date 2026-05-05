import DOMPurify from 'dompurify';
import { useCallback, useEffect } from 'react';

interface Props {
  content: string;
  charCount: number;
  readingMinutes: number;
  onExit: () => void;
}

export function FocusMode({ content, charCount, readingMinutes, onExit }: Props) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    },
    [onExit],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  // Count words from content
  const wordCount =
    content
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(/\s+/).length || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
        fontFamily: 'var(--font-body)',
      }}
      onClick={(e) => {
        // Only exit if clicking the background, not the editor area
        if (e.target === e.currentTarget) onExit();
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-end px-6 py-3" style={{ height: 48 }}>
        <button
          type="button"
          onClick={onExit}
          className="rounded-[4px] px-3 py-1 text-[13px] transition-opacity hover:opacity-80"
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}
        >
          退出专注模式 (Esc)
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-6 pb-12">
        <div
          className="mx-auto"
          style={{
            maxWidth: 720,
            fontSize: 18,
            lineHeight: 2,
            color: 'var(--text-primary)',
          }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      </div>

      {/* Bottom status bar */}
      <div
        className="flex items-center justify-center gap-6 border-t px-6 py-3 text-[13px]"
        style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
      >
        <span>{wordCount.toLocaleString()} 词</span>
        <span style={{ color: 'var(--border-emphasis)' }}>·</span>
        <span>约 {readingMinutes} 分钟阅读</span>
        <span style={{ color: 'var(--border-emphasis)' }}>·</span>
        <span>专注模式中 · 按 Esc 退出</span>
      </div>
    </div>
  );
}
