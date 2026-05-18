import { useCallback, useEffect, useState } from 'react';

interface Attachment {
  filename: string;
  size: number;
  usedInBlog: boolean;
}

interface Props {
  blogId: number;
}

function fmtSize(bytes: number): string {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${u[i]}`;
}

export function AttachmentPanel({ blogId }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await window.api.blogListAttachments(blogId);
    if (r.success && r.data) setAttachments(r.data);
    setLoading(false);
  }, [blogId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (filename: string) => {
    if (!confirm(`删除附件 ${filename}？`)) return;
    await window.api.blogDeleteAttachment({ blogId, filename });
    load();
  };

  const handleCleanup = async () => {
    const unused = attachments.filter((a) => !a.usedInBlog);
    if (unused.length === 0) return;
    if (!confirm(`清理 ${unused.length} 个未引用附件，释放 ${fmtSize(unused.reduce((s, a) => s + a.size, 0))}？`))
      return;
    await window.api.blogCleanupAttachments(blogId);
    load();
  };

  const unusedCount = attachments.filter((a) => !a.usedInBlog).length;
  const unusedSize = attachments.filter((a) => !a.usedInBlog).reduce((s, a) => s + a.size, 0);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          附件 ({attachments.length})
        </span>
        {unusedCount > 0 && (
          <button
            type="button"
            onClick={handleCleanup}
            className="text-[11px] hover:underline"
            style={{ color: 'var(--accent-red)' }}
          >
            清理 ({fmtSize(unusedSize)})
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          加载中...
        </p>
      ) : attachments.length === 0 ? (
        <p className="text-[12px]" style={{ color: 'var(--text-placeholder)' }}>
          暂无附件
        </p>
      ) : (
        <div className="space-y-1">
          {attachments.map((a) => (
            <div
              key={a.filename}
              className="flex items-center gap-2 rounded-[3px] px-2 py-1 text-[12px]"
              style={{ background: 'var(--bg-primary)' }}
            >
              <span className="truncate flex-1" style={{ color: 'var(--text-primary)' }} title={a.filename}>
                {a.filename}
              </span>
              <span style={{ color: 'var(--text-placeholder)', fontSize: 11 }}>{fmtSize(a.size)}</span>
              {a.usedInBlog ? (
                <span style={{ color: 'var(--accent-green)', fontSize: 10 }}>已引用</span>
              ) : (
                <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>未引用</span>
              )}
              <button
                type="button"
                onClick={() => handleDelete(a.filename)}
                className="text-[11px] hover:underline shrink-0"
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
