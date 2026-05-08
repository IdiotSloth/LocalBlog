import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password, rememberMe);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || '用户名或密码错误');
      }
    } catch (err) {
      setError(`请求失败: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="flex items-center gap-2 rounded-[4px] border px-3 py-2.5 text-[14px]"
          style={{ background: 'rgba(248,81,73,0.1)', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
        >
          ⚠ {error}
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          用户名
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="输入用户名"
          className="input-dark"
          required
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          密码
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="输入密码"
          className="input-dark"
          required
        />
      </div>
      <label
        className="flex cursor-pointer items-center gap-2 text-[13px] transition-colors duration-[0.15s]"
        style={{ color: 'var(--text-secondary)' }}
      >
        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /> 记住我
        (30天免登录)
      </label>
      <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-[15px]">
        {loading ? '登录中...' : '登录'}
      </button>
      <p className="text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        还没有账户？{' '}
        <Link to="/register" style={{ color: 'var(--accent-blue)' }} className="hover:underline">
          立即注册
        </Link>
      </p>
      {/* Web version feature notice */}
      <div
        className="mt-4 rounded-[6px] border p-3 text-center text-[11px]"
        style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
      >
        网页版暂不支持：便签 · 桌面宠物 · 托盘菜单 · 全局快捷键 · 独立浮窗 · PDF 导出 · 导入 Markdown 文件。
        请使用桌面客户端获取完整体验。
      </div>
    </form>
  );
}
