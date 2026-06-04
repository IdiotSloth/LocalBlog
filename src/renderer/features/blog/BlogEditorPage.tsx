import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import { renderWikilinks } from '../../../shared/wikilink';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { AtSign, List } from 'lucide-react';
import TurndownService from 'turndown';
import type { DraftItem, Tag } from '../../../shared/types';
import type { BlogTemplate } from '../../../shared/templates';
import { expandTemplateVars } from '../../../shared/template-vars';
import { parseToc, type TocItem } from '../../lib/toc-parser';
import { ReferencePicker } from '../../components/common/ReferencePicker';
import { TagSelector } from '../../components/common/TagSelector';
import { useSplit } from '../../components/layout/SplitPane';
import { useToast } from '../../components/common/Toast';
import { searchDirect, searchSimilarDocs } from '../../lib/use-search';
import { useAiSettings } from '../../stores/ai-settings';
import { FocusMode } from '../../components/editor/FocusMode';
import { TiptapEditor } from '../../components/editor/TiptapEditor';
import { countChars, estimateReadingTime } from '../../lib/toc-parser';
import { useAuthStore } from '../../stores/auth-store';
import { TemplateSelector } from './TemplateSelector';

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', emDelimiter: '*' });

// Preserve wikilink <a> tags as [[Title]] syntax instead of [Title](url)
turndown.addRule('wikilink', {
  filter: (node) => node instanceof HTMLElement && node.classList.contains('wiki-link'),
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    const title = el.textContent || '';
    return `[[${title}]]`;
  },
});

// ── Editor state machine ──

interface EditorState {
  title: string;
  content: string;
  format: 'md' | 'html';
  saving: boolean;
  isDirty: boolean;
  error: string;
  showHistory: boolean;
  drafts: DraftItem[];
  selectedTagIds: number[];
  pendingTagIds: number[] | null;
  selectedTemplate: BlogTemplate | null;
  focusMode: boolean;
  loading: boolean;
  seriesId: string | null;
  seriesName: string;
  seriesList: { seriesId: string; seriesName: string }[];
  newSeries: string;
}

const initialState: EditorState = {
  title: '',
  content: '',
  format: 'md',
  saving: false,
  isDirty: false,
  error: '',
  showHistory: false,
  drafts: [],
  selectedTagIds: [],
  pendingTagIds: null,
  selectedTemplate: null,
  focusMode: false,
  loading: true,
  seriesId: null,
  seriesName: '',
  seriesList: [],
  newSeries: '',
};

type EditorAction =
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SET_CONTENT'; payload: string }
  | { type: 'SET_FORMAT'; payload: 'md' | 'html' }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'TOGGLE_HISTORY' }
  | { type: 'SET_DRAFTS'; payload: DraftItem[] }
  | { type: 'SET_SELECTED_TAGS'; payload: number[] }
  | { type: 'SET_PENDING_TAGS'; payload: number[] | null }
  | { type: 'SET_TEMPLATE'; payload: BlogTemplate | null }
  | { type: 'SET_FOCUS'; payload: boolean }
  | { type: 'SET_SERIES_ID'; payload: string | null }
  | { type: 'SET_SERIES_NAME'; payload: string }
  | { type: 'SET_SERIES_LIST'; payload: { seriesId: string; seriesName: string }[] }
  | { type: 'SET_NEW_SERIES'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOAD_BLOG'; payload: Partial<EditorState> }
  | { type: 'RESET_SAVE_STATE' };

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_TITLE':
      return { ...state, title: action.payload };
    case 'SET_CONTENT':
      return { ...state, content: action.payload };
    case 'SET_FORMAT':
      return { ...state, format: action.payload };
    case 'SET_SAVING':
      return { ...state, saving: action.payload };
    case 'SET_DIRTY':
      return { ...state, isDirty: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'TOGGLE_HISTORY':
      return { ...state, showHistory: !state.showHistory };
    case 'SET_DRAFTS':
      return { ...state, drafts: action.payload };
    case 'SET_SELECTED_TAGS':
      return { ...state, selectedTagIds: action.payload };
    case 'SET_PENDING_TAGS':
      return { ...state, pendingTagIds: action.payload };
    case 'SET_TEMPLATE':
      return { ...state, selectedTemplate: action.payload };
    case 'SET_FOCUS':
      return { ...state, focusMode: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_SERIES_ID':
      return { ...state, seriesId: action.payload };
    case 'SET_SERIES_NAME':
      return { ...state, seriesName: action.payload };
    case 'SET_SERIES_LIST':
      return { ...state, seriesList: action.payload };
    case 'SET_NEW_SERIES':
      return { ...state, newSeries: action.payload };
    case 'LOAD_BLOG':
      return { ...state, ...action.payload };
    case 'RESET_SAVE_STATE':
      return { ...state, saving: false, isDirty: false, error: '' };
    default:
      return state;
  }
}

export { editorReducer }; // exported for testing

// ── Component ──

export function BlogEditorPage({ variant }: { variant?: 'full' | 'inline' | 'frameless' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const { openSplit, closeSplit, isSplit } = useSplit();
  const isNew = !id;
  const [state, dispatch] = useReducer(editorReducer, initialState);

  const blogIdRef = useRef<number | null>(id ? Number(id) : null);
  const contentRef = useRef(state.content);
  contentRef.current = state.content;
  const draftTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // T1916: Draft restore and auto-save indicator
  const [restoreDraft, setRestoreDraft] = useState<{ content: string; savedAt: string } | null>(null);
  const [draftSavedIndicator, setDraftSavedIndicator] = useState(false);
  const draftIndicatorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // T2108: Pin and color label state
  const [isPinned, setIsPinned] = useState(0);
  const [colorLabel, setColorLabel] = useState<string | null>(null);
  const COLORS = ['blue', 'green', 'amber', 'red', 'purple', 'gray'] as const;
  const COLOR_MAP_EDITOR: Record<string, string> = { blue: '#3b82f6', green: '#22c55e', amber: '#f59e0b', red: '#ef4444', purple: '#a855f7', gray: '#6b7280' };

  // T2202: [@] reference picker
  const [showAtPicker, setShowAtPicker] = useState(false);

  // T2406: TOC toolbar dropdown
  const [showToc, setShowToc] = useState(false);
  // §3.3: Series inline input
  const [showNewSeriesInput, setShowNewSeriesInput] = useState(false);
  const tocHeadings = (state.format === 'md' || state.format === 'html')
    ? parseToc(state.content, state.format) : [];

  // T2204: Editor AI
  const { settings: aiSettings, effectiveModel, effectiveBaseUrl } = useAiSettings();
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({ type: 'SET_TITLE', payload: e.target.value });
      if (blogIdRef.current) dispatch({ type: 'SET_DIRTY', payload: true });
    },
    [],
  );
  const handleContentChange = useCallback((val: string) => {
    dispatch({ type: 'SET_CONTENT', payload: val });
    if (blogIdRef.current) dispatch({ type: 'SET_DIRTY', payload: true });
  }, []);

  // Gentle close: block navigation when dirty, auto-save draft
  const blocker = useBlocker(state.isDirty);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (blogIdRef.current && contentRef.current) {
        window.api
          .blogSaveDraft({ blogId: blogIdRef.current, content: contentRef.current })
          .then(() => toast('草稿已保存', 'success'))
          .catch(() => toast('草稿保存失败', 'error'))
          .finally(() => blocker.proceed());
      } else {
        blocker.proceed();
      }
    }
  }, [blocker, toast]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.isDirty]);

  // Apply template on selection (T2109: expand {{date}} etc.)
  const handleTemplateSelect = useCallback((tpl: BlogTemplate) => {
    dispatch({ type: 'SET_TEMPLATE', payload: tpl });
    if (tpl.content) {
      const expanded = expandTemplateVars(tpl.content, { title: state.title });
      dispatch({ type: 'SET_CONTENT', payload: tpl.format === 'md' ? DOMPurify.sanitize(md.render(expanded)) : expanded });
    }
    dispatch({ type: 'SET_FORMAT', payload: tpl.format });
    if (tpl.tags.length > 0) dispatch({ type: 'SET_PENDING_TAGS', payload: null });
  }, [state.title]);

  // T2204: Editor AI action handler
  const handleAiAction = async (action: string) => {
    if (!aiSettings.enabled || !aiSettings.apiKey) {
      setAiError('请在设置中配置 AI (API Key)');
      return;
    }
    setShowAiMenu(false);
    setAiLoading(true);
    setAiError(null);

    const sel = window.getSelection()?.toString()?.trim();
    const prompts: Record<string, string> = {
      continue: `请续写以下内容，保持风格一致。直接输出续写内容，不要解释:\n\n${sel || state.content.slice(-500)}`,
      summarize: `请用一段话总结以下内容:\n\n${sel || state.content.slice(0, 3000)}`,
      polish: `请润色以下文字，使其更流畅清晰。直接输出润色后的内容:\n\n${sel || state.content.slice(0, 3000)}`,
      translate: `请将以下内容翻译为中文。直接输出译文:\n\n${sel || state.content.slice(0, 3000)}`,
    };

    try {
      const resp = await window.api.aiChat({
        settings: { ...aiSettings, model: effectiveModel, baseUrl: effectiveBaseUrl },
        request: { messages: [{ role: 'user', content: prompts[action] || '' }] },
      });
      if (resp.success && resp.data) {
        const result = resp.data.content;
        if (sel) {
          // Replace first occurrence of selection with result
          const idx = state.content.indexOf(sel);
          if (idx >= 0) {
            dispatch({ type: 'SET_CONTENT', payload: state.content.slice(0, idx) + result + state.content.slice(idx + sel.length) });
          } else {
            dispatch({ type: 'SET_CONTENT', payload: state.content + '\n\n' + result });
          }
        } else {
          dispatch({ type: 'SET_CONTENT', payload: state.content + (action === 'continue' ? '' : '\n\n') + result });
        }
        dispatch({ type: 'SET_DIRTY', payload: true });
      } else {
        setAiError(resp.error || 'AI 请求失败');
      }
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (!id) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    window.api.blogGet(Number(id)).then((r) => {
      if (r.success && r.data) {
        const c = (r.data as any).content || '';
        dispatch({
          type: 'LOAD_BLOG',
          payload: {
            title: r.data.title,
            format: r.data.format,
            content: r.data.format === 'md' ? DOMPurify.sanitize(md.render(c)) : c,
            selectedTagIds: (r.data.tags || []).map((t: Tag) => t.id),
            seriesId: r.data.seriesId || null,
            seriesName: r.data.seriesName || '',
          },
        });
        // T2108: Sync pin/color from loaded blog
        setIsPinned(r.data.isPinned ?? 0);
        setColorLabel(r.data.color ?? null);
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    }).catch(() => dispatch({ type: 'SET_LOADING', payload: false }));
    window.api.blogSeriesList(user.id).then((r) => {
      if (r.success && r.data) dispatch({ type: 'SET_SERIES_LIST', payload: r.data });
    });
    // Check for recent draft to offer restore
    if (Number(id)) {
      window.api.blogGetHistory(Number(id)).then((r) => {
        if (r.success && r.data && r.data.length > 0) {
          const latest = r.data[0] as { content: string; savedAt: string } | undefined;
          if (latest?.savedAt) {
            setRestoreDraft({ content: latest.content, savedAt: latest.savedAt });
          }
        }
      }).catch(() => { /* draft check best-effort */ });
    }
  }, [id, user]);

  const saveTags = useCallback(async (blogId: number, tagIds: number[]) => {
    try {
      await window.api.tagSetBlog({ blogId, tagIds });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleTagChange = useCallback(
    (tagIds: number[]) => {
      dispatch({ type: 'SET_SELECTED_TAGS', payload: tagIds });
      if (blogIdRef.current) {
        saveTags(blogIdRef.current, tagIds);
      } else {
        dispatch({ type: 'SET_PENDING_TAGS', payload: tagIds });
      }
    },
    [saveTags],
  );
  // T1916: Auto-save draft every 30 seconds
  useEffect(() => {
    draftTimerRef.current = setInterval(() => {
      if (contentRef.current && blogIdRef.current) {
        window.api.blogSaveDraft({ blogId: blogIdRef.current, content: contentRef.current }).then(() => {
          // Show subtle draft saved indicator
          setDraftSavedIndicator(true);
          if (draftIndicatorTimer.current) clearTimeout(draftIndicatorTimer.current);
          draftIndicatorTimer.current = setTimeout(() => setDraftSavedIndicator(false), 2000);
        }).catch(() => { /* auto-save failure is non-critical */ });
      }
    }, 30000);
    return () => {
      if (draftTimerRef.current) clearInterval(draftTimerRef.current);
      if (draftIndicatorTimer.current) clearTimeout(draftIndicatorTimer.current);
    };
  }, []);

  const loadHistory = useCallback(async () => {
    if (!blogIdRef.current) return;
    const r = await window.api.blogGetHistory(blogIdRef.current);
    if (r.success && r.data) dispatch({ type: 'SET_DRAFTS', payload: r.data });
  }, []);

  const handleSave = useCallback(async () => {
    if (!user || !state.title.trim()) {
      dispatch({ type: 'SET_ERROR', payload: '请输入标题' });
      return;
    }
    dispatch({ type: 'SET_SAVING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: '' });
    const contentToSave = state.format === 'md' ? turndown.turndown(state.content) : state.content;
    try {
      if (isNew) {
        const r = await window.api.blogCreate({
          userId: user.id,
          title: state.title.trim(),
          format: state.format,
          content: contentToSave,
          seriesId: state.seriesId || undefined,
          seriesName: state.seriesName || undefined,
        });

        if (r.success && r.data) {
          blogIdRef.current = r.data.id;
          const pt = state.pendingTagIds;
          dispatch({ type: 'SET_PENDING_TAGS', payload: null });
          if (pt && pt.length > 0) await saveTags(r.data.id, pt);
          setRestoreDraft(null);
          navigate(`/blog/${r.data.id}`, { replace: true });
          // R284: Trigger passive discovery after save
          searchSimilarDocs(r.data.id, 'blog', 5).catch(() => {});
          // R285: Trigger auto-tag suggestions if AI enabled
          if (aiSettings.enabled && aiSettings.apiKey) {
            window.api.aiTagSuggest({
              settings: { ...aiSettings, model: effectiveModel, baseUrl: effectiveBaseUrl },
              request: { title: state.title.trim(), content: contentToSave },
              existingTags: [],
            }).then((tr) => {
              if (tr.success && tr.data?.tags?.length) {
                toast(`建议标签: ${tr.data.tags.join(', ')}`, 'success');
              }
            }).catch(() => {});
          }
        } else {
          dispatch({ type: 'SET_ERROR', payload: r.error || '创建失败' });
          toast(r.error || '创建失败', 'error');
        }
      } else {
        toast(`✓ 已保存 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`, 'success');
        const r = await window.api.blogUpdate({
          userId: user.id,
          blogId: Number(id),
          title: state.title.trim(),
          content: contentToSave,
          seriesId: state.seriesId || undefined,
          seriesName: state.seriesName || undefined,
        });

        if (!r.success) {
          dispatch({ type: 'SET_ERROR', payload: r.error || '保存失败' });
          toast(r.error || '保存失败', 'error');
        } else {
          dispatch({ type: 'SET_DIRTY', payload: false });
          setRestoreDraft(null);
          // R284+R285: Trigger passive discovery + auto-tag after update
          const blogId = Number(id);
          searchSimilarDocs(blogId, 'blog', 5).catch(() => {});
          if (aiSettings.enabled && aiSettings.apiKey) {
            window.api.aiTagSuggest({
              settings: { ...aiSettings, model: effectiveModel, baseUrl: effectiveBaseUrl },
              request: { title: state.title.trim(), content: contentToSave },
              existingTags: [],
            }).then((tr) => {
              if (tr.success && tr.data?.tags?.length) {
                toast(`建议标签: ${tr.data.tags.join(', ')}`, 'success');
              }
            }).catch(() => {});
          }
        }
      }
    } catch (e) {
      const msg = (e as Error).message || '保存失败';
      dispatch({ type: 'SET_ERROR', payload: msg });
      toast(msg, 'error');
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [user, state.title, state.format, state.content, state.pendingTagIds, isNew, id, navigate, saveTags, toast, aiSettings.enabled, aiSettings.apiKey, effectiveModel, effectiveBaseUrl]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // R291: Ctrl+J opens AI command menu
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        setShowAiMenu((v) => !v);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleSave]);

  // T2101: Ctrl+\ toggles MD split preview
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === '\\' && e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (isSplit) {
          closeSplit();
        } else {
          const rendered = state.format === 'md'
            ? DOMPurify.sanitize(md.render(state.content || ''))
            : DOMPurify.sanitize(state.content || '');
          openSplit(
            <div className="overflow-auto p-6" style={{ background: 'var(--bg-primary)' }}>
              <h2 className="text-[20px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                {state.title || '预览'}
              </h2>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: rendered }}
              />
            </div>,
          );
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isSplit, closeSplit, openSplit, state.content, state.format, state.title]);

  // Loading state for existing blog
  if (!isNew && state.loading) {
    return (
      <div className="flex justify-center py-8" style={{ color: 'var(--text-secondary)' }}>
        加载中...
      </div>
    );
  }

  // Show template selector for new blog
  if (isNew && !state.selectedTemplate) {
    return <TemplateSelector onSelect={handleTemplateSelect} />;
  }

  return (
    <div className="flex h-full gap-0" style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <div className={`flex flex-1 flex-col min-w-0 ${state.showHistory ? 'mr-0' : ''}`}>
        <div className="mb-4 flex items-center gap-4">
          <Link
            to="/blog"
            className="shrink-0 text-[14px] no-underline hover:underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            ← 返回
          </Link>
          <input
            type="text"
            value={state.title}
            onChange={handleTitleChange}
            placeholder="输入博客标题..."
            className="input-dark flex-1 !border-transparent !bg-transparent !text-xl !font-bold"
          />
          {!isNew && (
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'TOGGLE_HISTORY' });
                if (!state.showHistory) loadHistory();
              }}
              className="text-[12px] rounded-[4px] px-3 py-1"
              style={{ color: 'var(--text-secondary)', background: state.showHistory ? 'var(--bg-tertiary)' : 'transparent' }}
            >
              历史版本
            </button>
          )}
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_FOCUS', payload: true })}
            className="text-[12px] rounded-[4px] px-3 py-1"
            style={{ color: 'var(--text-secondary)' }}
            title="专注模式"
          >
            🎯
          </button>
          {!isNew && blogIdRef.current && (
            <>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const r = await window.api.blogExportDocx(blogIdRef.current!);
                    if (r.success) alert('已导出为 Word');
                    else if (r.error !== '已取消') alert(`导出失败: ${r.error || ''}`);
                  } catch {
                    alert('导出失败');
                  }
                }}
                className="text-[12px] rounded-[4px] px-3 py-1 hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}
                title="导出为 Word"
              >
                📄{' '}
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const r = await window.api.blogExportPdf(blogIdRef.current!);
                    if (r.success) alert('已导出为 PDF');
                    else if (r.error !== '已取消') alert(`导出失败: ${r.error || ''}`);
                  } catch {
                    alert('导出失败');
                  }
                }}
                className="text-[12px] rounded-[4px] px-3 py-1 hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}
                title="导出为 PDF"
              >
                📑{' '}
              </button>
            </>
          )}
          <button type="button" onClick={handleSave} disabled={state.saving} className="btn-primary">
            {state.saving ? '保存中...' : '保存'}
          </button>
        </div>
        {state.error && (
          <div
            className="mb-3 rounded-[4px] px-3 py-2 text-[13px]"
            style={{ background: 'rgba(248,81,73,0.1)', color: 'var(--accent-red)' }}
          >
            {state.error}
          </div>
        )}
        {/* T1916: Draft restore prompt */}
        {restoreDraft && (
          <div
            className="mb-3 flex items-center gap-3 rounded-[4px] border px-4 py-2.5 text-[13px]"
            style={{ borderColor: 'var(--border-default)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            <span>📝 检测到未保存的草稿 ({new Date(restoreDraft.savedAt).toLocaleString('zh-CN')})</span>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'SET_CONTENT', payload: restoreDraft.content });
                setRestoreDraft(null);
                toast('已恢复草稿', 'success');
              }}
              className="ml-auto rounded-[3px] px-3 py-0.5 text-[12px] font-medium"
              style={{ background: 'var(--accent-blue)', color: 'var(--text-on-accent)' }}
            >
              恢复
            </button>
            <button
              type="button"
              onClick={() => setRestoreDraft(null)}
              className="text-[12px] hover:underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              忽略
            </button>
          </div>
        )}
        {/* T2108: Pin + Color metadata bar */}
        {!isNew && user && (
          <div className="flex items-center gap-4 py-2 px-1">
            {/* §3.3 Series selector */}
            <div className="flex items-center gap-1.5">
              <label className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>系列:</label>
              <select
                value={state.seriesId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const selected = state.seriesList.find((s: any) => s.seriesId === val);
                  dispatch({ type: 'SET_SERIES_ID', payload: val || null });
                  dispatch({ type: 'SET_SERIES_NAME', payload: selected?.seriesName || '' });
                  if (blogIdRef.current) {
                    window.api.blogSeriesSet({
                      userId: user.id,
                      blogId: blogIdRef.current,
                      seriesId: val || null,
                      seriesName: selected?.seriesName || null,
                    });
                  }
                }}
                className="rounded-[4px] border px-2 py-1 text-[12px]"
                style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                title="选择系列"
                aria-label="选择系列"
              >
                <option value="">无系列</option>
                {state.seriesList.map((s: any) => (
                  <option key={s.seriesId} value={s.seriesId}>
                    {s.seriesName} ({s.count} 篇)
                  </option>
                ))}
              </select>
              {!showNewSeriesInput ? (
                <button
                  type="button"
                  onClick={() => setShowNewSeriesInput(true)}
                  className="text-[12px] rounded-[3px] px-1.5 py-0.5 hover:opacity-80"
                  style={{ color: 'var(--accent-blue)' }}
                >
                  + 新建
                </button>
              ) : (
                <input
                  type="text"
                  value={state.newSeries}
                  onChange={(e) => dispatch({ type: 'SET_NEW_SERIES', payload: e.target.value })}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && state.newSeries.trim()) {
                      const newId = crypto.randomUUID();
                      await window.api.blogSeriesSet({
                        userId: user.id,
                        blogId: blogIdRef.current,
                        seriesId: newId,
                        seriesName: state.newSeries.trim(),
                      });
                      const r = await window.api.blogSeriesList(user.id);
                      if (r.success && r.data) dispatch({ type: 'SET_SERIES_LIST', payload: r.data });
                      dispatch({ type: 'SET_SERIES_ID', payload: newId });
                      dispatch({ type: 'SET_SERIES_NAME', payload: state.newSeries.trim() });
                      dispatch({ type: 'SET_NEW_SERIES', payload: '' });
                      setShowNewSeriesInput(false);
                    } else if (e.key === 'Escape') {
                      dispatch({ type: 'SET_NEW_SERIES', payload: '' });
                      setShowNewSeriesInput(false);
                    }
                  }}
                  placeholder="新系列名"
                  className="rounded-[4px] border px-2 py-1 text-[12px] w-[100px]"
                  style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  autoFocus
                />
              )}
            </div>

            {/* T2202: [@] quick reference button */}
            <button
              type="button"
              onClick={() => setShowAtPicker((v) => !v)}
              className="text-[12px] rounded-[4px] px-2 py-1 transition-colors"
              style={{ color: showAtPicker ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
              title="引用知识库文件 (插入 [[wikilink]])"
            >
              <AtSign size={14} /> 引用
            </button>
            {/* T2204: AI menu button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { setShowAiMenu((v) => !v); setAiError(null); }}
                disabled={aiLoading}
                className="text-[12px] rounded-[4px] px-2 py-1 transition-colors disabled:opacity-40"
                style={{ color: showAiMenu ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
                title="AI 辅助写作">
                ✦ AI {aiLoading ? '...' : ''}
              </button>
              {showAiMenu && (
                <div className="absolute top-full left-0 mt-1 z-50 rounded-[6px] border py-1 shadow-lg min-w-[140px]"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
                  {[
                    { id: 'continue', label: '续写', desc: '继续写作' },
                    { id: 'summarize', label: '摘要', desc: '生成摘要' },
                    { id: 'polish', label: '润色', desc: '优化表达' },
                    { id: 'translate', label: '翻译', desc: '译为中文' },
                  ].map((item) => (
                    <button key={item.id} type="button" onClick={() => handleAiAction(item.id)}
                      className="w-full text-left px-3 py-1.5 text-[12px] transition-colors hover:bg-[var(--bg-primary)]"
                      style={{ color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      <span className="font-medium">{item.label}</span>
                      <span className="ml-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>{item.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {aiError && (
              <span className="text-[11px]" style={{ color: 'var(--accent-red)' }}>{aiError}</span>
            )}
            {/* T2406: TOC toolbar button — instant dropdown, no persistent state */}
            {tocHeadings.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowToc((v) => !v)}
                  className="text-[12px] rounded-[4px] px-2 py-1 transition-colors"
                  style={{ color: showToc ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
                  title="大纲 (目录)">
                  <List size={14} /> 大纲
                </button>
                {showToc && (
                  <div className="absolute top-full left-0 mt-1 z-50 rounded-[6px] border py-1 shadow-lg min-w-[200px] max-h-[320px] overflow-y-auto"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
                    {tocHeadings.map((h, i) => (
                      <button key={i} type="button"
                        onClick={() => {
                          const el = document.getElementById(h.id);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          setShowToc(false);
                        }}
                        className="w-full text-left px-3 py-1 text-[12px] transition-colors hover:bg-[var(--bg-primary)]"
                        style={{
                          color: 'var(--text-primary)',
                          paddingLeft: `${8 + h.level * 12}px`,
                          background: 'transparent', border: 'none', cursor: 'pointer'
                        }}>
                        {h.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={async () => {
                if (!blogIdRef.current) return;
                const v = isPinned ? 0 : 1;
                await window.api.blogSetPinned({ id: blogIdRef.current, userId: user.id, isPinned: v });
                setIsPinned(v);
              }}
              className={`text-[12px] rounded-[4px] px-2 py-1 transition-colors ${isPinned ? 'font-semibold' : ''}`}
              style={{ color: isPinned ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
              title={isPinned ? '取消置顶' : '置顶'}
            >
              📌 {isPinned ? '已置顶' : '置顶'}
            </button>
            <div className="flex items-center gap-1.5" title="颜色标记">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={async () => {
                    if (!blogIdRef.current) return;
                    const v = colorLabel === c ? null : c;
                    await window.api.blogSetColor({ id: blogIdRef.current, userId: user.id, color: v });
                    setColorLabel(v);
                  }}
                  className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-125"
                  style={{
                    background: COLOR_MAP_EDITOR[c],
                    borderColor: colorLabel === c ? 'var(--text-primary)' : 'transparent',
                    transform: colorLabel === c ? 'scale(1.25)' : undefined,
                  }}
                  aria-label={`颜色: ${c}`}
                />
              ))}
            </div>
          </div>
        )}
        {/* T2202: [@] AtPicker floating popup */}
        {showAtPicker && user && blogIdRef.current && (
          <AtPickerPopup
            userId={user.id}
            sourceId={blogIdRef.current}
            onClose={() => setShowAtPicker(false)}
          />
        )}
        <div className="flex-1" onContextMenu={(e) => {
          const sel = window.getSelection()?.toString()?.trim();
          if (sel && aiSettings.enabled) {
            e.preventDefault();
            setShowAiMenu(true);
          }
        }}>
          <TiptapEditor content={state.content} onChange={handleContentChange} variant={variant} />
        </div>
        {/* T2406: Inline chips — tags + related links only (attachments pending-ruling, series moved out of editor) */}
        {user && (
          <div className="mt-3 border-t pt-2" style={{ borderColor: 'var(--border-default)' }}>
            <TagSelector userId={user.id} selectedTagIds={state.selectedTagIds} onChange={handleTagChange} />
            {blogIdRef.current && (
              <div className="mt-1">
                <ReferencePicker userId={user.id} sourceType="blog" sourceId={blogIdRef.current} readOnly />
              </div>
            )}
          </div>
        )}
        <div className="mt-2 flex justify-between text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          <span>{isNew ? '新建博客' : '编辑模式'}</span>
          <span className="flex items-center gap-3">
            {draftSavedIndicator && (
              <span style={{ color: 'var(--accent-green)' }}>草稿已保存</span>
            )}
            <span title="字数">{countChars(state.content)} 字</span>
            <span title="预计阅读时间">~{estimateReadingTime(state.content)} 分钟</span>
            <span>Ctrl+S 保存 · Ctrl+J AI</span>
          </span>
        </div>
        {/* §3.3: Frameless variant — exit/cancel buttons */}
        {variant === 'frameless' && (
          <div className="mt-3 pt-3 border-t flex gap-2" style={{ borderColor: 'var(--border-default)' }}>
            <button
              type="button"
              onClick={async () => {
                await handleSave();
                navigate(`/blog/${id}`, { replace: true });
              }}
              className="rounded-[4px] px-3 py-1.5 text-[13px] font-medium hover:opacity-90"
              style={{ background: 'var(--accent-blue)', color: '#fff' }}
            >
              退出编辑
            </button>
            <button
              type="button"
              onClick={() => navigate(`/blog/${id}`, { replace: true })}
              className="rounded-[4px] px-3 py-1.5 text-[13px] hover:opacity-80"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              取消
            </button>
          </div>
        )}
      </div>
      {state.focusMode && (
        <FocusMode
          content={state.content}
          charCount={countChars(state.content)}
          readingMinutes={estimateReadingTime(state.content)}
          onExit={() => dispatch({ type: 'SET_FOCUS', payload: false })}
        />
      )}

      {state.showHistory && (
        <div
          className="w-[300px] shrink-0 border-l overflow-y-auto"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}
        >
          <div
            className="sticky top-0 flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              历史版本
            </h3>
            <button
              type="button"
              onClick={() => dispatch({ type: 'TOGGLE_HISTORY' })}
              className="text-[13px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              ✕
            </button>
          </div>
          {state.drafts.length === 0 ? (
            <p className="p-4 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              暂无历史版本
            </p>
          ) : (
            state.drafts.map((d, i) => (
              <div key={d.id} className="border-b px-4 py-3" style={{ borderColor: 'var(--border-default)' }}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    版本 {state.drafts.length - i} · {new Date(d.savedAt).toLocaleString('zh-CN')}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!blogIdRef.current || !user || !confirm('恢复到该版本？')) return;
                      try {
                        await window.api.blogRollback({ userId: user.id, blogId: blogIdRef.current, draftId: d.id });
                        dispatch({ type: 'SET_CONTENT', payload: d.content });
                        dispatch({ type: 'TOGGLE_HISTORY' });
                      } catch {
                        dispatch({ type: 'SET_ERROR', payload: '回滚失败' });
                      }
                    }}
                    className="rounded-[3px] px-2 py-0.5 text-[10px] font-medium"
                    style={{ color: 'var(--accent-blue)' }}
                  >
                    恢复
                  </button>
                </div>
                <p
                  className="line-clamp-3 whitespace-pre-wrap text-[12px] font-mono"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {d.content?.substring(0, 200)}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── T2202: AtPickerPopup — floating reference picker triggered by [@] button ──

function AtPickerPopup({ userId, sourceId, onClose }: { userId: number; sourceId: number; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: number; title: string; type: string; excerpt: string }>>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      searchDirect(query, userId)
        .then((r) => {
          if (cancelled) return;
          setResults(r.slice(0, 8).map((item) => ({ id: item.id, title: item.title, type: item.type, excerpt: item.snippet || '' })));
          setLoading(false);
        })
        .catch(() => { if (!cancelled) setLoading(false); });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, userId]);

  const typeLabel = (t: string) => t === 'blog' ? '博客' : t === 'knowledge' ? '知识库' : t === 'note' ? '便签' : t;
  const typeColor = (t: string) => t === 'blog' ? 'var(--accent-blue)' : t === 'knowledge' ? 'var(--accent-green)' : 'var(--text-secondary)';

  return (
    <div className="mb-3 rounded-[8px] border p-3" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
      <div className="flex items-center gap-2 mb-2">
        <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索博客/知识库/便签..."
          className="flex-1 rounded-[4px] border px-3 py-1.5 text-[13px] outline-none"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
        <button type="button" onClick={onClose}
          className="text-[18px] hover:opacity-70"
          style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
      </div>
      {loading && <p className="text-[12px] py-2" style={{ color: 'var(--text-muted)' }}>搜索中...</p>}
      {!loading && query.trim() && results.length === 0 && (
        <p className="text-[12px] py-2" style={{ color: 'var(--text-muted)' }}>无结果</p>
      )}
      {results.length > 0 && (
        <div className="max-h-[240px] overflow-y-auto space-y-0.5" style={{ scrollbarWidth: 'thin' }}>
          {results.map((item) => (
            <button key={`${item.type}-${item.id}`} type="button"
              onClick={async () => {
                await window.api.refAdd({ sourceType: 'blog', sourceId, targetType: item.type as 'blog' | 'knowledge' | 'note', targetId: item.id, userId });
                onClose();
              }}
              className="w-full text-left flex items-center gap-2 rounded-[4px] px-2 py-1.5 transition-colors hover:bg-[var(--bg-primary)]"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <span className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'var(--bg-tertiary)', color: typeColor(item.type) }}>{typeLabel(item.type)}</span>
              <span className="flex-1 truncate text-[13px]" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
