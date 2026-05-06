import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [workspacePath, setWorkspacePath] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }
    if (!workspacePath) {
      setError('请选择工作区目录');
      return;
    }
    if (password.length < 4) {
      setError('密码至少需要4个字符');
      return;
    }
    setLoading(true);
    try {
      const result = await register(username, password, workspacePath);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || '注册失败');
      }
    } catch (err) {
      setError(`请求失败: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
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
          placeholder="至少2个字符"
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
          placeholder="至少4个字符"
          className="input-dark"
          required
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          确认密码
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="再次输入密码"
          className="input-dark"
          required
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          工作区目录
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={workspacePath}
            readOnly
            className="input-dark flex-1 cursor-default opacity-60"
            placeholder="请选择存储博客和知识库的文件夹"
          />
          <button
            type="button"
            onClick={async () => {
              const d = await window.api.selectDir();
              if (d) setWorkspacePath(d);
            }}
            className="btn-primary shrink-0 !px-4 !text-[13px]"
          >
            选择目录
          </button>
        </div>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-[15px]">
        {loading ? '注册中...' : '创建账户'}
      </button>
      <p className="text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        已有账户？{' '}
        <Link to="/login" style={{ color: 'var(--accent-blue)' }} className="hover:underline">
          立即登录
        </Link>
      </p>
    </form>
  );
}
