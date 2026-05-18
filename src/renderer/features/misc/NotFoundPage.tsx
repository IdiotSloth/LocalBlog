import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center" style={{ minHeight: '60vh' }}>
      <div className="rounded-full p-4" style={{ background: 'var(--bg-tertiary)' }}>
        <span style={{ fontSize: 40 }}>🔍</span>
      </div>
      <h2 className="text-[20px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        页面不存在
      </h2>
      <p className="max-w-sm text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        你访问的页面不存在或已被移除。
      </p>
      <Link
        to="/"
        className="no-underline rounded-[6px] px-5 py-2.5 text-[14px] font-medium transition-opacity hover:opacity-85"
        style={{ background: 'var(--accent-blue)', color: '#fff' }}
      >
        回到仪表盘
      </Link>
    </div>
  );
}
