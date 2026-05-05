import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TagSelector } from '../../components/common/TagSelector';
import { TiptapEditor } from '../../components/editor/TiptapEditor';
import { useAuthStore } from '../../stores/auth-store';
import type { BlogTemplate } from '../../../shared/templates';
import { AttachmentPanel } from './AttachmentPanel';
import { ReferencePicker } from '../../components/common/ReferencePicker';
import { TemplateSelector } from './TemplateSelector';
import { FocusMode } from '../../components/editor/FocusMode';
import { estimateReadingTime, countChars } from '../../lib/toc-parser';
import MarkdownIt from 'markdown-it';
import TurndownService from 'turndown';

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', emDelimiter: '*' });

export function BlogEditorPage() {
  const { id } = useParams<{ id: string }>(); const navigate = useNavigate();
  const user = useAuthStore((s) => s.user); const isNew = !id;
  const [title, setTitle] = useState(''); const [content, setContent] = useState('');
  const [format, setFormat] = useState<'md' | 'html'>('md');
  const [saving, setSaving] = useState(false); const [draftStatus, setDraftStatus] = useState('');
  const [error, setError] = useState(''); const [showHistory, setShowHistory] = useState(false);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [pendingTagIds, setPendingTagIds] = useState<number[] | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<BlogTemplate | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [seriesName, setSeriesName] = useState('');
  const [seriesList, setSeriesList] = useState<{ seriesId: string; seriesName: string }[]>([]);
  const [newSeries, setNewSeries] = useState('');
  const blogIdRef = useRef<number | null>(id ? Number(id) : null);
  const contentRef = useRef(content); contentRef.current = content;
  const draftTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Apply template on selection
  const handleTemplateSelect = useCallback((tpl: BlogTemplate) => {
    setSelectedTemplate(tpl);
    if (tpl.content) setContent(tpl.format === 'md' ? md.render(tpl.content) : tpl.content);
    setFormat(tpl.format);
    if (tpl.tags.length > 0) setPendingTagIds(null); // tags will be set after blog creation via pendingTagIds
  }, []);

  useEffect(() => {
    if (id && user) {
      window.api.blogGet(Number(id)).then((d: unknown) => {
        const r = d as any;
        if (r.success && r.data) {
          setTitle(r.data.title); setFormat(r.data.format);
          const c = r.data.content || '';
          setContent(r.data.format === 'md' ? md.render(c) : c);
          setSelectedTagIds((r.data.tags || []).map((t: any) => t.id));
          setSeriesId(r.data.seriesId || null);
          setSeriesName(r.data.seriesName || '');
        }
      });
      window.api.blogSeriesList(user.id).then((d: unknown) => {
        const r = d as any;
        if (r.success && r.data) setSeriesList(r.data);
      });
    }
  }, [id, user]);

  const saveTags = useCallback(async (blogId: number, tagIds: number[]) => {
    try { await window.api.tagSetBlog({ blogId, tagIds }); } catch (e) { console.error(e); }
  }, []);

  const handleTagChange = useCallback((tagIds: number[]) => {
    setSelectedTagIds(tagIds);
    if (blogIdRef.current) {
      saveTags(blogIdRef.current, tagIds);
    } else {
      setPendingTagIds(tagIds);
    }
  }, [saveTags]);
  useEffect(() => { draftTimerRef.current = setInterval(() => { if (contentRef.current && blogIdRef.current) window.api.blogSaveDraft({ blogId: blogIdRef.current, content: contentRef.current }); }, 30000); return () => { if (draftTimerRef.current) clearInterval(draftTimerRef.current); }; }, []);

  const loadHistory = useCallback(async () => { if (!blogIdRef.current) return; const d = await window.api.blogGetHistory(blogIdRef.current); const r = d as any; if (r.success) setDrafts(r.data); }, []);

  const handleSave = useCallback(async () => {
    if (!user || !title.trim()) { setError('请输入标题'); return; } setSaving(true); setError('');
    const contentToSave = format === 'md' ? turndown.turndown(content) : content;
    try {
      if (isNew) {
        const d = await window.api.blogCreate({ userId: user.id, title: title.trim(), format, content: contentToSave }); const r = d as any;
        if (r.success && r.data) { blogIdRef.current = r.data.id; const pt = pendingTagIds; setPendingTagIds(null); if (pt && pt.length > 0) await saveTags(r.data.id, pt); navigate(`/blog/${r.data.id}/edit`, { replace: true }); } else setError(r.error || '创建失败');
      } else {
        const d = await window.api.blogUpdate({ blogId: Number(id), title: title.trim(), content: contentToSave }); const r = d as any;
        if (r.success) { setDraftStatus('已保存'); setTimeout(() => setDraftStatus(''), 2000); } else setError(r.error || '保存失败');
      }
    } catch { setError('保存失败'); } finally { setSaving(false); }
  }, [user, title, format, content, isNew, id, navigate, pendingTagIds, saveTags]);

  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [handleSave]);

  // Show template selector for new blog
  if (isNew && !selectedTemplate) {
    return <TemplateSelector onSelect={handleTemplateSelect} />;
  }

  return (
    <div className="flex h-full gap-0" style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <div className={`flex flex-1 flex-col min-w-0 ${showHistory ? 'mr-0' : ''}`}>
        <div className="mb-4 flex items-center gap-4">
          <Link to="/blog" className="shrink-0 text-[14px] no-underline hover:underline" style={{ color: 'var(--text-secondary)' }}>← 返回</Link>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="输入博客标题..." className="input-dark flex-1 !border-transparent !bg-transparent !text-xl !font-bold" />
          {!isNew && <button type="button" onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory(); }} className="text-[12px] rounded-[4px] px-3 py-1" style={{ color: 'var(--text-secondary)', background: showHistory ? 'var(--bg-tertiary)' : 'transparent' }}>历史版本</button>}
          <button type="button" onClick={() => setFocusMode(true)} className="text-[12px] rounded-[4px] px-3 py-1" style={{ color: 'var(--text-secondary)' }} title="专注模式">🎯</button>
          {!isNew && blogIdRef.current && (
            <>
              <button type="button" onClick={async () => {
                try { const r = await window.api.blogExportDocx(blogIdRef.current!) as any; if (r?.success) alert('已导出为 Word'); else if (r?.error !== '已取消') alert('导出失败: ' + (r?.error || '')); } catch { alert('导出失败'); }
              }} className="text-[12px] rounded-[4px] px-3 py-1 hover:opacity-80" style={{ color: 'var(--text-secondary)' }} title="导出为 Word">📄 </button>
              <button type="button" onClick={async () => {
                try { const r = await window.api.blogExportPdf(blogIdRef.current!) as any; if (r?.success) alert('已导出为 PDF'); else if (r?.error !== '已取消') alert('导出失败: ' + (r?.error || '')); } catch { alert('导出失败'); }
              }} className="text-[12px] rounded-[4px] px-3 py-1 hover:opacity-80" style={{ color: 'var(--text-secondary)' }} title="导出为 PDF">📑 </button>
            </>
          )}
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">{saving ? '保存中...' : '保存'}</button>
        </div>
        {error && <div className="mb-3 rounded-[4px] px-3 py-2 text-[13px]" style={{ background: 'rgba(248,81,73,0.1)', color: 'var(--accent-red)' }}>{error}</div>}
        <div className="flex-1"><TiptapEditor content={content} onChange={setContent} /></div>
        {user && <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border-default)' }}><TagSelector userId={user.id} selectedTagIds={selectedTagIds} onChange={handleTagChange} /></div>}
        {blogIdRef.current && <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border-default)' }}><AttachmentPanel blogId={blogIdRef.current} /></div>}
        {user && blogIdRef.current && <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border-default)' }}><ReferencePicker userId={user.id} sourceType="blog" sourceId={blogIdRef.current} /></div>}
        {!isNew && user && (
          <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex items-center gap-3">
              <span className="text-[13px] shrink-0" style={{ color: 'var(--text-secondary)' }}>系列:</span>
              <select value={seriesId || ''} aria-label="选择系列" onChange={async (e) => {
                const val = e.target.value;
                if (!val) { setSeriesId(null); setSeriesName(''); if (blogIdRef.current) await window.api.blogSeriesSet({ blogId: blogIdRef.current, seriesId: null, seriesName: null }); return; }
                const item = seriesList.find((s) => s.seriesId === val);
                if (item) { setSeriesId(item.seriesId); setSeriesName(item.seriesName); if (blogIdRef.current) await window.api.blogSeriesSet({ blogId: blogIdRef.current, seriesId: item.seriesId, seriesName: item.seriesName }); }
              }} className="rounded-[4px] border px-2 py-1 text-[13px] outline-none" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                <option value="">(无)</option>
                {seriesList.map((s) => <option key={s.seriesId} value={s.seriesId}>{s.seriesName}</option>)}
              </select>
              <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>或</span>
              <input type="text" value={newSeries} onChange={(e) => setNewSeries(e.target.value)} placeholder="新建系列名..." onKeyDown={async (e) => {
                if (e.key === 'Enter' && newSeries.trim() && blogIdRef.current) {
                  const uuid = crypto.randomUUID();
                  setSeriesId(uuid); setSeriesName(newSeries.trim());
                  await window.api.blogSeriesSet({ blogId: blogIdRef.current, seriesId: uuid, seriesName: newSeries.trim() });
                  setNewSeries(''); setSeriesList((prev) => [...prev, { seriesId: uuid, seriesName: newSeries.trim() }]);
                }
              }} className="rounded-[4px] border px-2 py-1 text-[13px] outline-none" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)', width: 160 }} />
            </div>
          </div>
        )}
        <div className="mt-2 flex justify-between text-[12px]" style={{ color: 'var(--text-secondary)' }}><span>{draftStatus || (isNew ? '新建博客' : '编辑模式')}</span><span>Ctrl+S 保存</span></div>
      </div>
      {focusMode && <FocusMode content={content} charCount={countChars(content)} readingMinutes={estimateReadingTime(content)} onExit={() => setFocusMode(false)} />}

      {showHistory && <div className="w-[300px] shrink-0 border-l overflow-y-auto" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
        <div className="sticky top-0 flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border-default)' }}>
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>历史版本</h3>
          <button type="button" onClick={() => setShowHistory(false)} className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>✕</button>
        </div>
        {drafts.length === 0 ? <p className="p-4 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>暂无历史版本</p>
        : drafts.map((d: any, i: number) => (
          <div key={d.id} className="border-b px-4 py-3" style={{ borderColor: 'var(--border-default)' }}>
            <div className="mb-1 flex items-center justify-between"><span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>版本 {drafts.length - i} · {new Date(d.saved_at).toLocaleString('zh-CN')}</span>
              <button type="button" onClick={async () => { if (!blogIdRef.current || !confirm('恢复到该版本？')) return; try { await window.api.blogRollback({ blogId: blogIdRef.current, draftId: d.id }); setContent(d.content); setShowHistory(false); } catch { setError('回滚失败'); } }} className="rounded-[3px] px-2 py-0.5 text-[10px] font-medium" style={{ color: 'var(--accent-blue)' }}>恢复</button>
            </div>
            <p className="line-clamp-3 whitespace-pre-wrap text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>{d.content?.substring(0, 200)}</p>
          </div>))}
      </div>}
    </div>
  );
}
