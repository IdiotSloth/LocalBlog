import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="flex h-full items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-[400px] rounded-[6px] border p-8" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
        <h1 className="mb-1 text-center text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
          ~/kb
        </h1>
        <p className="mb-6 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          本地博客与知识库
        </p>
        <Outlet />
      </div>
    </div>
  );
}
