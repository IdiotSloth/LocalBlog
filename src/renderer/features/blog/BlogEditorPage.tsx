import MarkdownIt from 'markdown-it';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import TurndownService from 'turndown';
import type { DraftItem, Tag } from '../../../shared/types';
import type { BlogTemplate } from '../../../shared/templates';
import { ReferencePicker } from '../../components/common/ReferencePicker';
import { TagSelector } from '../../components/common/TagSelector';
import { useToast } from '../../components/common/Toast';
import { FocusMode } from '../../components/editor/FocusMode';
import { TiptapEditor } from '../../components/editor/TiptapEditor';
import { countChars, estimateReadingTime } from '../../lib/toc-parser';
import { useAuthStore } from '../../stores/auth-store';
import { AttachmentPanel } from './AttachmentPanel';
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

export function BlogEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const isNew = !id;
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const [bottomTab, setBottomTab] = useState<string>('tags');

  const blogIdRef = useRef<number | null>(id ? Number(id) : null);
  const contentRef = useRef(state.content);
  contentRef.current = state.content;
  const draftTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // T1916: Draft restore and auto-save indicator
  const [restoreDraft, setRestoreDraft] = useState<{ content: string; savedAt: string } | null>(null);
  const [draftSavedIndicator, setDraftSavedIndicator] = useState(false);
  const draftIndicatorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Apply template on selection
  const handleTemplateSelect = useCallback((tpl: BlogTemplate) => {
    dispatch({ type: 'SET_TEMPLATE', payload: tpl });
    if (tpl.content) dispatch({ type: 'SET_CONTENT', payload: tpl.format === 'md' ? md.render(tpl.content) : tpl.content });
    dispatch({ type: 'SET_FORMAT', payload: tpl.format });
    if (tpl.tags.length > 0) dispatch({ type: 'SET_PENDING_TAGS', payload: null });
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!id) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    window.api.blogGet(Number(id)).then((r) => {
      if (r.success && r.data) {
        const c = r.data.content || '';
        dispatch({
          type: 'LOAD_BLOG',
          payload: {
            title: r.data.title,
            format: r.data.format,
            content: r.data.format === 'md' ? md.render(c) : c,
            selectedTagIds: (r.data.tags || []).map((t: Tag) => t.id),
            seriesId: r.data.seriesId || null,
            seriesName: r.data.seriesName || '',
          },
        });
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
          const latest = r.data[0] as { content: string; saved_at: string };
          if (latest?.saved_at) {
            setRestoreDraft({ content: latest.content, savedAt: latest.saved_at });
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
    if (r.success) dispatch({ type: 'SET_DRAFTS', payload: r.data });
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
        });

        if (r.success && r.data) {
          blogIdRef.current = r.data.id;
          const pt = state.pendingTagIds;
          dispatch({ type: 'SET_PENDING_TAGS', payload: null });
          if (pt && pt.length > 0) await saveTags(r.data.id, pt);
          setRestoreDraft(null);
          navigate(`/blog/${r.data.id}`, { replace: true });
        } else {
          dispatch({ type: 'SET_ERROR', payload: r.error || '创建失败' });
          toast(r.error || '创建失败', 'error');
        }
      } else {
        toast('已保存', 'success');
        const r = await window.api.blogUpdate({
          userId: user.id,
          blogId: Number(id),
          title: state.title.trim(),
          content: contentToSave,
        });

        if (!r.success) {
          dispatch({ type: 'SET_ERROR', payload: r.error || '保存失败' });
          toast(r.error || '保存失败', 'error');
        } else {
          dispatch({ type: 'SET_DIRTY', payload: false });
          setRestoreDraft(null);
        }
      }
    } catch (e) {
      const msg = (e as Error).message || '保存失败';
      dispatch({ type: 'SET_ERROR', payload: msg });
      toast(msg, 'error');
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [user, state.title, state.format, state.content, state.pendingTagIds, isNew, id, navigate, saveTags, toast]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleSave]);

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
        <div className="flex-1">
          <TiptapEditor content={state.content} onChange={handleContentChange} />
        </div>
        {/* T2010: Bottom panel — horizontal tab switcher (was vertical stack) */}
        {user && blogIdRef.current && (
          <div className="mt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex gap-0 border-b" style={{ borderColor: 'var(--border-default)' }}>
              {[
                { id: 'tags', label: '标签' },
                { id: 'attachments', label: '附件' },
                { id: 'refs', label: '引用' },
                ...(!isNew ? [{ id: 'series' as const, label: '系列' }] : []),
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBottomTab(tab.id)}
                  className="px-3 py-2 text-[12px] font-medium transition-colors duration-[0.15s] border-b-2"
                  style={{
                    color: bottomTab === tab.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    borderColor: bottomTab === tab.id ? 'var(--accent-blue)' : 'transparent',
                    background: 'transparent',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="pt-3">
              {bottomTab === 'tags' && (
                <TagSelector userId={user.id} selectedTagIds={state.selectedTagIds} onChange={handleTagChange} />
              )}
              {bottomTab === 'attachments' && (
                <AttachmentPanel blogId={blogIdRef.current} />
              )}
              {bottomTab === 'refs' && (
                <ReferencePicker userId={user.id} sourceType="blog" sourceId={blogIdRef.current} />
              )}
              {bottomTab === 'series' && (
                <div className="flex items-center gap-3">
                  <span className="text-[13px] shrink-0" style={{ color: 'var(--text-secondary)' }}>系列:</span>
                  <select
                    value={state.seriesId || ''}
                    aria-label="选择系列"
                    onChange={async (e) => {
                      const val = e.target.value;
                      if (!val) {
                        dispatch({ type: 'SET_SERIES_ID', payload: null });
                        dispatch({ type: 'SET_SERIES_NAME', payload: '' });
                        if (blogIdRef.current)
                          await window.api.blogSeriesSet({ userId: user.id, blogId: blogIdRef.current, seriesId: null, seriesName: null });
                        return;
                      }
                      const item = state.seriesList.find((s) => s.seriesId === val);
                      if (item) {
                        dispatch({ type: 'SET_SERIES_ID', payload: item.seriesId });
                        dispatch({ type: 'SET_SERIES_NAME', payload: item.seriesName });
                        if (blogIdRef.current)
                          await window.api.blogSeriesSet({ userId: user.id, blogId: blogIdRef.current, seriesId: item.seriesId, seriesName: item.seriesName });
                      }
                    }}
                    className="rounded-[4px] border px-2 py-1 text-[13px] outline-none"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                  >
                    <option value="">(无)</option>
                    {state.seriesList.map((s) => (
                      <option key={s.seriesId} value={s.seriesId}>{s.seriesName}</option>
                    ))}
                  </select>
                  <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>或</span>
                  <input
                    type="text" value={state.newSeries}
                    onChange={(e) => dispatch({ type: 'SET_NEW_SERIES', payload: e.target.value })}
                    placeholder="新建系列名..."
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && state.newSeries.trim() && blogIdRef.current) {
                        const uuid = crypto.randomUUID();
                        dispatch({ type: 'SET_SERIES_ID', payload: uuid });
                        dispatch({ type: 'SET_SERIES_NAME', payload: state.newSeries.trim() });
                        await window.api.blogSeriesSet({ userId: user.id, blogId: blogIdRef.current, seriesId: uuid, seriesName: state.newSeries.trim() });
                        dispatch({ type: 'SET_NEW_SERIES', payload: '' });
                        dispatch({ type: 'SET_SERIES_LIST', payload: [...state.seriesList, { seriesId: uuid, seriesName: state.newSeries.trim() }] });
                      }
                    }}
                    className="rounded-[4px] border px-2 py-1 text-[13px] outline-none"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)', width: 160 }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
        {/* For new blogs without blogId yet, still show tags */}
        {user && !blogIdRef.current && (
          <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border-default)' }}>
            <TagSelector userId={user.id} selectedTagIds={state.selectedTagIds} onChange={handleTagChange} />
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
            <span>Ctrl+S 保存</span>
          </span>
        </div>
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
                    版本 {state.drafts.length - i} · {new Date(d.saved_at).toLocaleString('zh-CN')}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!blogIdRef.current || !confirm('恢复到该版本？')) return;
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
