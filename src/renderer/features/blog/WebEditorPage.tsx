import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { useAuthStore } from '../../stores/auth-store';
import { useToast } from '../../components/common/Toast';

const DRAFT_KEY = 'web-editor-draft';

export function WebEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const loadedRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder: '开始写作...' }),
      Image.configure({ allowBase64: true, inline: true }),
    ],
    onUpdate: ({ editor }) => {
      if (loadedRef.current && !saving) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, content: editor.getHTML() }));
      }
    },
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-6 py-4' },
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

  // Load existing blog for editing
  useEffect(() => {
    if (!editor || !id) return;
    window.api.blogGet(Number(id)).then((r) => {
      if (r.success && r.data) {
        setTitle(r.data.title);
        editor.commands.setContent(r.data.content || '');
      }
      loadedRef.current = true;
      setReady(true);
    });
  }, [id, editor]);

  // Restore draft for new blog
  useEffect(() => {
    if (!editor || id || ready) return;
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const d = JSON.parse(draft);
        if (d.title) setTitle(d.title);
        if (d.content) editor.commands.setContent(d.content);
      } catch { /* ignore corrupt draft */ }
    }
    loadedRef.current = true;
    setReady(true);
  }, [id, editor, ready]);

  const handleSave = useCallback(async () => {
    if (!user || !title.trim()) {
      setError('请输入标题');
      return;
    }
    if (!editor) return;
    setSaving(true);
    setError('');
    try {
      const content = editor.getHTML();
      if (id) {
        const r = await window.api.blogUpdate({ blogId: Number(id), title: title.trim(), content });
        if (!r.success) {
          setError(r.error || '保存失败');
          toast(r.error || '保存失败', 'error');
          return;
        }
        toast('已保存', 'success');
      } else {
        const r = await window.api.blogCreate({ userId: user.id, title: title.trim(), format: 'html', content });
        if (r.success && r.data) {
          localStorage.removeItem(DRAFT_KEY);
          navigate(`/blog/${r.data.id}`, { replace: true });
        } else {
          setError(r.error || '创建失败');
          toast(r.error || '创建失败', 'error');
        }
      }
    } catch (e) {
      const msg = (e as Error).message || '保存失败';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }, [user, title, editor, id, navigate, toast]);

  // Ctrl+S to save
  useEffect(() => {
    if (!editor) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, editor]);

  if (!editor) {
    return (
      <div className="flex h-64 items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>
        编辑器加载中...
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}
    >
      <div className="mb-4 flex items-center gap-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="输入博客标题..."
          className="input-dark flex-1 !border-transparent !bg-transparent !text-xl !font-bold"
        />
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
      {error && (
        <div
          className="mb-3 rounded-[4px] px-3 py-2 text-[13px]"
          style={{ background: 'rgba(248,81,73,0.1)', color: 'var(--accent-red)' }}
        >
          {error}
        </div>
      )}
      <div className="flex-1">
        <EditorContent editor={editor} />
      </div>
      <div className="mt-2 flex justify-between text-[12px]" style={{ color: 'var(--text-secondary)' }}>
        <span>{id ? '编辑模式' : '新建博客'}</span>
        <span>Ctrl+S 保存</span>
      </div>
    </div>
  );
}
