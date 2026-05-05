import { useCallback, useEffect, useState } from 'react';

interface BackupInfo {
  name: string;
  size: number;
  createdAt: string;
}

function fmtSize(bytes: number): string {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${u[i]}`;
}

export function BackupSection() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const d = await window.api.backupList();
    const r = d as any;
    if (r.success && r.data) setBackups(r.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setMessage('');
    const d = await window.api.backupCreate();
    const r = d as any;
    if (r.success) {
      setMessage('备份创建成功');
      load();
    } else setMessage(r.error || '创建失败');
  };

  const handleRestore = async (filename: string) => {
    if (!confirm(`恢复备份 ${filename}？\n当前数据将被覆盖。建议先手动创建备份。`)) return;
    const d = await window.api.backupRestore(filename);
    const r = d as any;
    if (r.success) {
      alert('备份已恢复，请重启应用以加载数据。');
    } else {
      setMessage(r.error || '恢复失败');
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`永久删除备份 ${filename}？`)) return;
    const d = await window.api.backupDelete(filename);
    const r = d as any;
    if (r.success) {
      setMessage('备份已删除');
      load();
    } else setMessage(r.error || '删除失败');
  };

  return (
    <div>
      <h3 className="mb-4 text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        备份管理
      </h3>

      <div
        className="mb-4 rounded-[6px] border p-4"
        style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}
      >
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          自动备份: 每 24 小时一次，保留最近 7 份。应用启动时自动创建一份备份。
        </p>
      </div>

      {message && (
        <div
          className="mb-3 rounded-[4px] px-3 py-2 text-[13px]"
          style={{ background: 'rgba(63,185,80,0.1)', color: 'var(--accent-green)' }}
        >
          {message}
        </div>
      )}

      <button type="button" onClick={handleCreate} className="btn-primary mb-4">
        + 手动创建备份
      </button>

      {loading ? (
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          加载中...
        </p>
      ) : backups.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--text-placeholder)' }}>
          暂无备份
        </p>
      ) : (
        <div className="space-y-2">
          {backups.map((b) => (
            <div
              key={b.name}
              className="flex items-center gap-3 rounded-[4px] border px-4 py-2.5"
              style={{ borderColor: 'var(--border-default)' }}
            >
              <span className="text-[13px] flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                {b.name}
              </span>
              <span className="text-[12px]" style={{ color: 'var(--text-placeholder)' }}>
                {fmtSize(b.size)}
              </span>
              <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                {new Date(b.createdAt).toLocaleDateString('zh-CN')}
              </span>
              <button
                type="button"
                onClick={() => handleRestore(b.name)}
                className="text-[12px] hover:underline"
                style={{ color: 'var(--accent-blue)' }}
              >
                恢复
              </button>
              <button
                type="button"
                onClick={() => handleDelete(b.name)}
                className="text-[12px] hover:underline"
                style={{ color: 'var(--accent-red)' }}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
