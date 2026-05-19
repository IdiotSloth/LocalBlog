import { useState } from 'react';

interface KbContentEditorProps {
  fileId: number;
  userId: number;
  fileType: string;
  initialContent: string;
  onClose: () => void;
  onSaved: () => void;
}

/** T2112: Inline content editor for TXT/MD files + code viewer */
export function KbContentEditor({ fileId, userId, fileType, initialContent, onClose, onSaved }: KbContentEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditable = fileType === 'txt' || fileType === 'md';
  const isCode = ['ts', 'js', 'py', 'json', 'html', 'css', 'xml', 'yaml', 'yml', 'sh', 'bash', 'sql'].includes(fileType);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await window.api.kbUpdateContent({ fileId, userId, content });
      if (r.success) {
        onSaved();
      } else {
        setError(r.error ?? '保存失败');
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setSaving(false);
  };

  // Code file — read-only syntax view
  if (isCode || (!isEditable && !isCode)) {
    const lines = content.split('\n');
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            {isCode ? '代码预览' : '文件预览'} (只读)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] rounded-[3px] px-2 py-0.5 hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            返回
          </button>
        </div>
        <div className="flex-1 overflow-auto" style={{ background: 'var(--bg-code)' }}>
          <pre className="p-4 m-0 text-[13px] leading-relaxed" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="select-none text-right mr-4 w-8 shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {i + 1}
                </span>
                <span>{line}</span>
              </div>
            ))}
          </pre>
        </div>
      </div>
    );
  }

  // TXT/MD — editable
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border-default)' }}>
        <span className="text-[12px]" style={{ color: 'var(--accent-blue)' }}>
          编辑中
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-[4px] px-3 py-1 text-[12px] font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
            style={{ background: 'var(--accent-blue)', color: '#fff' }}
          >
            {saving ? '保存中...' : '保存'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] rounded-[3px] px-2 py-0.5 hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            取消
          </button>
        </div>
      </div>
      {error && (
        <div className="px-3 py-2 text-[12px]" style={{ color: 'var(--accent-red)', background: 'rgba(239,68,68,0.08)' }}>
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-2 underline">关闭</button>
        </div>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 w-full resize-none p-4 text-[14px] leading-relaxed outline-none border-0"
        style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: fileType === 'md' ? 'var(--font-mono)' : 'inherit' }}
        placeholder="输入内容..."
        spellCheck={false}
      />
    </div>
  );
}
