/**
 * T2112: Code syntax preview — uses shiki for syntax highlighting.
 * Renders code files (.ts/.js/.py/.json/.html/.css etc.) with token-coloring.
 */

import { useEffect, useState } from 'react';

interface CodePreviewProps {
  content: string;
  language?: string;
  onClose?: () => void;
}

const LANG_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
  json: 'json', html: 'html', css: 'css', scss: 'scss',
  py: 'python', sql: 'sql', sh: 'bash', bash: 'bash',
  yaml: 'yaml', yml: 'yaml', xml: 'xml', md: 'markdown',
  rs: 'rust', go: 'go', java: 'java', cpp: 'cpp', c: 'c',
};

export function CodePreview({ content, language, onClose }: CodePreviewProps) {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const lang = language ? (LANG_MAP[language] || language) : 'text';

  useEffect(() => {
    let aborted = false;
    setLoading(true);
    import('shiki').then(async (shiki) => {
      if (aborted) return;
      try {
        const result = await shiki.codeToHtml(content, {
          lang,
          theme: 'dark-plus',
        });
        if (!aborted) { setHtml(result); setLoading(false); }
      } catch {
        // Fallback: plain text with line numbers (R300: escape user content)
        if (!aborted) {
          const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          const lines = content.split('\n');
          setHtml(
            `<pre style="font-family:var(--font-mono);font-size:13px;line-height:1.6;color:var(--text-primary)">${
              lines.map((l, i) => `<span style="color:var(--text-muted);user-select:none">${String(i + 1).padStart(4, ' ')} </span>${esc(l)}`).join('\n')
            }</pre>`,
          );
          setLoading(false);
        }
      }
    }).catch(() => { if (!aborted) setLoading(false); });
    return () => { aborted = true; };
  }, [content, lang]);

  return (
    <div className="flex flex-col h-full">
      {onClose && (
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            {language || 'code'} — 代码预览 (只读)
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
      )}
      {loading ? (
        <div className="flex items-center justify-center h-full text-[12px]" style={{ color: 'var(--text-muted)' }}>
          语法高亮加载中...
        </div>
      ) : (
        <div
          className="flex-1 overflow-auto"
          style={{ background: '#1e1e1e' }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
