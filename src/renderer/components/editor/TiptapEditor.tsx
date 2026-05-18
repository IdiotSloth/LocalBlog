import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import DOMPurify from 'dompurify';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { WikiLinkSearchResult } from '../../../shared/types';
import { EditorToolbar } from './EditorToolbar';
import { WikilinkSuggestion } from './WikilinkSuggestion';

export type EditorMode = 'wysiwyg' | 'split' | 'source';

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function TiptapEditor({ content, onChange, placeholder = '开始写作...', readOnly = false }: TiptapEditorProps) {
  const [mode, setMode] = useState<EditorMode>('wysiwyg');
  const [sourceCode, setSourceCode] = useState(content);
  const isSettingRef = useRef(false);

  // R197: [[wikilink]] suggestion state
  const [wlQuery, setWlQuery] = useState<string>('');
  const [wlPos, setWlPos] = useState<{ x: number; y: number } | null>(null);
  const wlFromRef = useRef<number>(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: { openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } },
      }),
      Placeholder.configure({ placeholder }),
      Image.configure({ allowBase64: true, inline: true }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (isSettingRef.current) return;
      const html = editor.getHTML();
      onChange(html);
      if (mode === 'source') setSourceCode(html);

      // R197: Detect [[ for wikilink autocomplete
      if (readOnly) return;
      const { from } = editor.state.selection;
      const $from = editor.state.doc.resolve(from);
      // Get text from start of current block to cursor
      const blockStart = $from.start();
      const textBefore = editor.state.doc.textBetween(blockStart, from, '\n', '\0');
      const match = textBefore.match(/\[\[([^\[\]]*)$/);
      if (match) {
        const query = match[1] ?? '';
        wlFromRef.current = from - query.length;
        setWlQuery(query);
        try {
          const coords = editor.view.coordsAtPos(from);
          setWlPos({ x: coords.left, y: coords.bottom });
        } catch { /* cursor offscreen */ }
      } else {
        setWlQuery('');
        setWlPos(null);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-6 py-4',
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                editor?.chain().focus().setImage({ src: dataUrl }).run();
              };
              reader.readAsDataURL(file);
            }
            return true;
          }
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && mode === 'source') setSourceCode(editor.getHTML());
  }, [mode, editor]);
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      isSettingRef.current = true;
      editor.commands.setContent(content);
      isSettingRef.current = false;
    }
  }, [content, editor]);

  const handleSourceChange = useCallback(
    (value: string) => {
      setSourceCode(value);
      if (editor) {
        editor.commands.setContent(value);
        onChange(value);
      }
    },
    [editor, onChange],
  );

  // R197: Wikilink selection handler
  const handleWlSelect = useCallback(
    (item: WikiLinkSearchResult) => {
      if (!editor) return;
      const from = wlFromRef.current;
      const to = editor.state.selection.from;
      const display = item.title;
      const tag = `<a class="wiki-link" data-ref-type="${item.type}" data-ref-id="${item.id}" href="/${item.type}/${item.id}">${display}</a>`;
      isSettingRef.current = true;
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent(tag + ' ')
        .run();
      isSettingRef.current = false;
      setWlQuery('');
      setWlPos(null);
    },
    [editor],
  );

  const handleWlClose = useCallback(() => {
    setWlQuery('');
    setWlPos(null);
  }, []);

  if (!editor) {
    return (
      <div className="flex h-96 items-center justify-center text-sm text-[var(--color-text-muted)]">
        编辑器加载中...
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm overflow-hidden">
      {!readOnly && <EditorToolbar editor={editor} mode={mode} onModeChange={setMode} />}
      <div className="flex flex-1">
        <div className={`${mode === 'split' ? 'w-1/2 border-r border-[var(--color-border)]' : 'w-full'}`}>
          {mode === 'source' ? (
            <textarea
              value={sourceCode}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="h-full min-h-[400px] w-full resize-none bg-[var(--color-bg-base)] px-6 py-4 font-mono text-sm text-[var(--color-text-primary)] outline-none leading-relaxed"
              placeholder={placeholder}
            />
          ) : (
            <EditorContent editor={editor} />
          )}
        </div>
        {mode === 'split' && (
          <div className="w-1/2 overflow-auto bg-[var(--color-bg-base)] px-6 py-4">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editor.getHTML()) }}
            />
          </div>
        )}
      </div>
      {/* R197: [[wikilink]] autocomplete popup */}
      {wlQuery !== '' && wlPos && (
        <WikilinkSuggestion query={wlQuery} position={wlPos} onSelect={handleWlSelect} onClose={handleWlClose} />
      )}
    </div>
  );
}
