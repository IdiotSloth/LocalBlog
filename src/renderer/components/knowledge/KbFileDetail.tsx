import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KbContentEditor } from './KbContentEditor';
import type { Reference } from '../../../shared/types';

interface KbFileDetailProps {
  fileId: number;
  fileType: string;
  previewHtml: string;
  previewTitle: string;
  previewing: boolean;
  userId: number;
  backRefs: Reference[];
  files: { id: number; properties?: Record<string, string> }[];
  onBack: () => void;
  onSaved: () => void;
}

function stripHtmlForEdit(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

export function KbFileDetail({ fileId, fileType, previewHtml, previewTitle, previewing, userId, backRefs, files, onBack, onSaved }: KbFileDetailProps) {
  const [editing, setEditing] = useState(false);
  const isEditable = fileType === 'txt' || fileType === 'md';

  return (
    <div className="flex-1 min-w-0 flex flex-col rounded-[6px] border overflow-hidden"
      style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2.5 shrink-0"
        style={{ borderColor: 'var(--border-default)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={onBack}
            className="text-[13px] shrink-0 hover:underline"
            style={{ color: 'var(--accent-blue)' }}>
            ← 返回
          </button>
          <h3 className="truncate text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
            {previewTitle}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isEditable && (
            <button type="button" onClick={() => setEditing(true)}
              className="text-[12px] rounded-[4px] px-2 py-0.5 transition-opacity hover:opacity-85"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-blue)' }}>
              编辑
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {editing ? (
          <KbContentEditor
            fileId={fileId} userId={userId} fileType={fileType}
            initialContent={fileType === 'txt' ? stripHtmlForEdit(previewHtml) : ''}
            onClose={() => setEditing(false)}
            onSaved={() => { setEditing(false); onSaved(); }}
          />
        ) : previewing ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
            <div className="w-full max-w-[200px] rounded-full h-2 overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="h-full rounded-full animate-pulse" style={{ background: 'var(--accent-blue)', width: '60%' }} />
            </div>
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>正在解析文件...</p>
          </div>
        ) : fileType === 'pdf' ? (
          <webview src="about:blank" className="w-full h-full border-0" title="preview"
            {...{ partition: 'persist:pdfview' }}
            ref={(el) => {
              if (el) {
                window.api.kbGet({ fileId, userId }).then((r: { success?: boolean; data?: { filePath?: string } }) => {
                  if (r.success && r.data?.filePath) el.setAttribute('src', `file:///${r.data.filePath.replace(/\\/g, '/')}`);
                });
              }
            }}
          />
        ) : (
          <iframe srcDoc={previewHtml} className="w-full h-full border-0" title="preview" sandbox="allow-scripts" />
        )}
      </div>

      {/* Footer: Properties + Backrefs */}
      {(() => {
        const file = files.find(f => f.id === fileId);
        const props = file?.properties;
        const hasProps = props && Object.keys(props).length > 0;
        if (!hasProps && backRefs.length === 0) return null;
        return (
          <div className="border-t shrink-0" style={{ borderColor: 'var(--border-default)' }}>
            {hasProps && (
              <div className="px-4 py-3">
                <p className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>属性</p>
                <div className="space-y-1.5">
                  {Object.entries(props).map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-[12px]">
                      <span style={{ color: 'var(--text-muted)', minWidth: 48 }}>{k}</span>
                      <span style={{ color: 'var(--text-primary)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {backRefs.length > 0 && (
              <div className={`${hasProps ? 'border-t' : ''} px-4 py-3`} style={{ borderColor: 'var(--border-default)' }}>
                <p className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  引用了此文件的博客 ({backRefs.length})
                </p>
                {backRefs.map((ref) => (
                  <Link key={ref.id} to={`/blog/${ref.sourceId}`}
                    className="block text-[13px] no-underline hover:underline truncate"
                    style={{ color: 'var(--accent-blue)' }}>
                    {ref.sourceTitle || `博客 #${ref.sourceId}`}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
