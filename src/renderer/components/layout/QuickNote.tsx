import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from '../common/Toast';

interface Props {
  userId: number;
}

export function QuickNote({ userId }: Props) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ blogId: number } | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const d = await window.api.blogQuickCreate({ userId, title: trimmed.substring(0, 50), content: trimmed });
      const r = d as any;
      if (r.success && r.data) {
        setToast({ blogId: r.data.id });
        setText('');
      }
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  return (
    <>
      <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border-default)' }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="快速便签..."
          disabled={saving}
          className="w-full rounded-[4px] border px-3 py-1.5 text-[13px] outline-none"
          style={{
            background: 'var(--bg-primary)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
      {toast && (
        <Toast
          message="已保存为快速便签"
          actionLabel="查看"
          onAction={() => navigate(`/blog/${toast.blogId}/edit`)}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
