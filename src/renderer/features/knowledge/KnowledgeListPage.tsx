import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FolderTree } from '../../components/common/FolderTree';
import { TagSelector } from '../../components/common/TagSelector';
import { useBatchSelect } from '../../hooks/useBatchSelect';
import { usePagination } from '../../hooks/usePagination';
import { KbContentEditor } from '../../components/knowledge/KbContentEditor';
import { KbFileDetail } from '../../components/knowledge/KbFileDetail';
import { KBCard } from '../../components/knowledge/KBCard';
import { useAuthStore } from '../../stores/auth-store';
import type { FolderTreeNode, KnowledgeFileWithTags, Reference, Tag } from '../../../shared/types';
import { File, FileCode, FileImage, FileSpreadsheet, FileText, Presentation } from 'lucide-react';

const TYPE_ICONS: Record<string, typeof File> = {
  md: FileCode, txt: FileText, csv: FileSpreadsheet,
  docx: FileText, xlsx: FileSpreadsheet, pptx: Presentation,
  pdf: File, image: FileImage, svg: FileImage,
  other: File,
};
const TYPE_COLORS: Record<string, string> = {
  md: 'var(--accent-blue)', txt: 'var(--text-secondary)',
  csv: 'var(--accent-green)', docx: 'var(--accent-blue)',
  xlsx: 'var(--accent-green)', pptx: 'var(--accent-blue)',
  pdf: 'var(--accent-red)', image: 'var(--accent-blue)',
  svg: 'var(--accent-blue)', other: 'var(--text-secondary)',
};
const TYPE_LABELS: Record<string, string> = {
  md: 'MD', txt: 'TXT', csv: 'CSV', docx: 'DOCX', xlsx: 'XLSX',
  pptx: 'PPTX', pdf: 'PDF', image: 'IMG', svg: 'SVG', other: 'FILE',
};

/*** R143 — 19 state flags collapsed into 1 useReducer ***/

export interface KnowledgeListState {
  files: KnowledgeFileWithTags[];
  total: number;
  loading: boolean;
  query: string;
  fileType: string;
  filterTagId: number | null;
  filterTagName: string;
  filterFolderId: number | null;
  showFolderSidebar: boolean;
  editingTagsFileId: number | null;
  editingTagIds: number[];
  previewHtml: string;
  previewTitle: string;
  previewing: boolean;
  previewFileId: number | null;
  previewFileType: string;
  backRefs: Reference[];
  dragOver: boolean;
  kbFolders: FolderTreeNode[];
}

export type KnowledgeListAction =
  | { type: 'SET_FILES'; files: KnowledgeFileWithTags[]; total: number }
  | { type: 'SET_LOADING'; v: boolean }
  | { type: 'SET_QUERY'; v: string }
  | { type: 'SET_FILE_TYPE'; v: string }
  | { type: 'SET_SORT_BY'; v: string }
  | { type: 'SET_TAG_FILTER'; id: number | null; name: string }
  | { type: 'SET_FOLDER_FILTER'; v: number | null }
  | { type: 'TOGGLE_SIDEBAR'; v: boolean }
  | { type: 'START_EDIT_TAGS'; fileId: number; tagIds: number[] }
  | { type: 'STOP_EDIT_TAGS' }
  | { type: 'SET_EDIT_TAG_IDS'; ids: number[] }
  | { type: 'PREVIEW_START'; title: string; fileId: number; fileType: string }
  | { type: 'PREVIEW_LOADING'; v: boolean }
  | { type: 'PREVIEW_HTML'; html: string }
  | { type: 'PREVIEW_CLOSE' }
  | { type: 'SET_BACKREFS'; refs: Reference[] }
  | { type: 'SET_DRAG_OVER'; v: boolean }
  | { type: 'SET_KB_FOLDERS'; v: FolderTreeNode[] };

export function knowledgeListReducer(state: KnowledgeListState, action: KnowledgeListAction): KnowledgeListState {
  switch (action.type) {
    case 'SET_FILES': return { ...state, files: action.files, total: action.total };
    case 'SET_LOADING': return { ...state, loading: action.v };
    case 'SET_QUERY': return { ...state, query: action.v };
    case 'SET_FILE_TYPE': return { ...state, fileType: action.v };
    case 'SET_SORT_BY': return { ...state, sortBy: action.v };
    case 'SET_TAG_FILTER': return { ...state, filterTagId: action.id, filterTagName: action.name };
    case 'SET_FOLDER_FILTER': return { ...state, filterFolderId: action.v };
    case 'TOGGLE_SIDEBAR': return { ...state, showFolderSidebar: action.v };
    case 'START_EDIT_TAGS': return { ...state, editingTagsFileId: action.fileId, editingTagIds: action.tagIds };
    case 'STOP_EDIT_TAGS': return { ...state, editingTagsFileId: null, editingTagIds: [] };
    case 'SET_EDIT_TAG_IDS': return { ...state, editingTagIds: action.ids };
    case 'PREVIEW_START': return { ...state, previewing: true, previewTitle: action.title, previewFileId: action.fileId, previewFileType: action.fileType, backRefs: [], previewHtml: '' };
    case 'PREVIEW_LOADING': return { ...state, previewing: action.v };
    case 'PREVIEW_HTML': return { ...state, previewHtml: action.html, previewing: false };
    case 'PREVIEW_CLOSE': return { ...state, previewHtml: '', previewTitle: '', previewFileId: null, previewFileType: '', backRefs: [] };
    case 'SET_BACKREFS': return { ...state, backRefs: action.refs };
    case 'SET_DRAG_OVER': return { ...state, dragOver: action.v };
    case 'SET_KB_FOLDERS': return { ...state, kbFolders: action.v };
    default: return state;
  }
}


/** T2112: Extract raw text from preview HTML for editing. Used to pre-fill TXT editors. */
function stripHtmlForEdit(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function KnowledgeListPage() {
  const user = useAuthStore((s) => s.user);
  const [editingFileId, setEditingFileId] = useState<number | null>(null);
  const [state, dispatch] = useReducer(knowledgeListReducer, {
    files: [],
    total: 0,
    loading: true,
    query: '',
    fileType: '',
    filterTagId: null,
    filterTagName: '',
    filterFolderId: null,
    showFolderSidebar: localStorage.getItem('sidebar_folder_knowledge') === '1',
    editingTagsFileId: null,
    editingTagIds: [],
    previewHtml: '',
    previewTitle: '',
    previewing: false,
    previewFileId: null,
    previewFileType: '',
    backRefs: [],
    dragOver: false,
    kbFolders: [],
  });
  const { query, fileType, filterTagId, filterTagName, filterFolderId, showFolderSidebar, editingTagsFileId, editingTagIds, previewHtml, previewTitle, previewing, previewFileId, previewFileType, backRefs, kbFolders, files, total, loading } = state;
  const setFilterFolderId = (v: number | null) => dispatch({ type: 'SET_FOLDER_FILTER', v });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batch = useBatchSelect(state.files as { id: number }[]);
  const pagination = usePagination(20, state.total);
  const [searchParams] = useSearchParams();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [conflictDialog, setConflictDialog] = useState<{ names: string; paths: string[]; dupes: string[]; dupeIds: number[] } | null>(null);
  const loadKbFolders = useCallback(async () => {
    if (!user) return;
    const r = await window.api.folderTree({ userId: user.id, type: 'knowledge' });
    if (r.success && r.data) dispatch({ type: 'SET_KB_FOLDERS', v: r.data });
  }, [user]);
  useEffect(() => {
    loadKbFolders();
  }, [loadKbFolders]);

  const loadFiles = useCallback(async () => {
    if (!user) return;
    dispatch({ type: 'SET_LOADING', v: true });
    try {
      const r = await window.api.kbList({
        userId: user.id,
        query: query || undefined,
        fileType: fileType || undefined,
        tagId: filterTagId || undefined,
        folderId: filterFolderId || undefined,
        sortBy: 'created_at',
        sortOrder: 'desc',
        offset: pagination.offset,
        limit: pagination.limit,
      });
      if (r.success && r.data) {
        dispatch({ type: 'SET_FILES', files: r.data.files, total: r.data.total });
      }
    } catch (e) {
      console.error(e);
      setError('加载失败');
    } finally {
      dispatch({ type: 'SET_LOADING', v: false });
    }
  }, [user, query, fileType, filterTagId, filterFolderId, pagination.offset, pagination.limit]);
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // T2305: ?select=<id> route param
  useEffect(() => {
    const selectId = searchParams.get('select');
    if (selectId && user && files.length > 0) {
      const fid = Number(selectId);
      const file = files.find((f: { id: number }) => f.id === fid);
      if (file && previewFileId !== fid) {
        const ft = (file as any).fileType || 'other';
        dispatch({ type: 'PREVIEW_START', title: (file as any).filename, fileId: fid, fileType: ft });
        window.api.kbPreview({ fileId: fid, userId: user.id }).then((r) => { if (r.success && r.data) dispatch({ type: 'PREVIEW_HTML', html: r.data.html }); }).catch(() => {});
      }
    }
  }, [searchParams, files, user]);

  const handleImport = async () => {
    if (!user) return;
    const s = await window.api.selectFiles([
      'docx',
      'doc',
      'xlsx',
      'xls',
      'pptx',
      'ppt',
      'pdf',
      'txt',
      'md',
      'png',
      'jpg',
      'jpeg',
      'gif',
      'webp',
      'svg',
    ]);
    if (s?.length) {
      try {
        await window.api.kbImport({ userId: user.id, filePaths: s, copyToWorkspace: true });
        loadFiles();
      } catch (e) {
        console.error(e);
      }
      return;
    }
    // Web fallback: use HTML file input
    fileInputRef.current?.click();
  };
  const handleWebFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.length) return;
    try {
      const paths: string[] = [];
      for (const file of Array.from(e.target.files)) {
        // In web mode, we pass filenames; the server stores them
        paths.push(file.name);
      }
      await window.api.kbImport({ userId: user.id, filePaths: paths, copyToWorkspace: false });
      loadFiles();
    } catch (e) {
      console.error(e);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className="flex h-full gap-4"
      style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dispatch({ type: 'SET_DRAG_OVER', v: true });
      }}
      onDragLeave={() => dispatch({ type: 'SET_DRAG_OVER', v: false })}
      onDrop={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        dispatch({ type: 'SET_DRAG_OVER', v: false });
        if (!user || !e.dataTransfer.files.length) return;
        // T2305: Big file warning (non-blocking toast)
        const BIG = 50 * 1024 * 1024;
        if (Array.from(e.dataTransfer.files).some(f => f.size > BIG)) {
          setToastMsg('部分文件超过 50MB，导入可能较慢');
          setTimeout(() => setToastMsg(null), 4000);
        }
        const paths: string[] = [];
        for (const file of Array.from(e.dataTransfer.files)) {
          if ('path' in file && file.path) paths.push(file.path as string);
        }
        if (paths.length) {
          // T2305: Conflict detection — 3-option (替换/保留两者/跳过)
          const existingNames = new Set(files.map((f: { filename: string }) => f.filename.toLowerCase()));
          const dupes = paths.filter(p => existingNames.has(p.split(/[/\\]/).pop()?.toLowerCase() || ''));
          if (dupes.length > 0) {
            const names = dupes.map(p => p.split(/[/\\]/).pop()).join(', ');
            const dupeIds = files
              .filter((f: { filename: string; id: number }) => dupes.some(d => d.split(/[/\\]/).pop()?.toLowerCase() === f.filename.toLowerCase()))
              .map((f: { id: number }) => f.id);
            setConflictDialog({ names, paths, dupes, dupeIds });
            return;
          }
          try {
            await window.api.kbImport({ userId: user.id, filePaths: paths, copyToWorkspace: true });
            loadFiles();
          } catch (e) { console.error(e); }
        }
      }}
    >
      {user && (
        <div className="hidden lg:block relative">
          <button
            type="button"
            onClick={() => {
              const v = !showFolderSidebar;
              dispatch({ type: 'TOGGLE_SIDEBAR', v });
              localStorage.setItem('sidebar_folder_knowledge', v ? '1' : '0');
            }}
            className="mb-2 rounded-[4px] px-2 py-1 text-[11px] hover:opacity-80 transition-opacity"
            style={{
              color: 'var(--text-secondary)',
              background: showFolderSidebar ? 'var(--bg-tertiary)' : 'transparent',
            }}
          >
            📂 {showFolderSidebar ? '收起' : '文件夹'}
          </button>
          {showFolderSidebar && (
            <div style={{ width: 170 }}>
              <FolderTree
                userId={user.id}
                type="knowledge"
                selectedFolderId={filterFolderId}
                onSelectFolder={setFilterFolderId}
              />
            </div>
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        {/* T2305: KbFileDetail — Pogget "click to open, no preview page" */}
        {previewFileId && user ? (
          <KbFileDetail
            fileId={previewFileId} fileType={previewFileType}
            previewHtml={previewHtml} previewTitle={previewTitle}
            previewing={previewing} userId={user.id}
            backRefs={backRefs}
            files={files as { id: number; properties?: Record<string, string> }[]}
            onBack={() => { dispatch({ type: 'PREVIEW_CLOSE' }); setEditingFileId(null); }}
            onSaved={() => { setEditingFileId(null); dispatch({ type: 'PREVIEW_CLOSE' }); }}
          />
        ) : (
        <>
        {/* Folder breadcrumb */}
        {filterFolderId !== null && kbFolders.length > 0 && (() => {
          const findPath = (tree: { id: number; name: string; children?: { id: number; name: string; children?: unknown[] }[] }[], targetId: number, path: { id: number | null; name: string }[] = []): { id: number | null; name: string }[] | null => {
            for (const node of tree) {
              const newPath = [...path, { id: node.id, name: node.name }];
              if (node.id === targetId) return newPath;
              if (node.children?.length) {
                const found = findPath(node.children, targetId, newPath);
                if (found) return found;
              }
            }
            return null;
          };
          const breadcrumb = [{ id: null as number | null, name: '全部' }, ...(findPath(kbFolders, filterFolderId!) || [])];
          return (
            <div className="mb-3 flex items-center gap-1 text-[13px]">
              {breadcrumb.map((crumb, i) => (
                <span key={crumb.id ?? 'all'} className="flex items-center gap-1">
                  {i > 0 && <span style={{ color: 'var(--text-muted)' }}>›</span>}
                  <button
                    type="button"
                    onClick={() => setFilterFolderId(crumb.id)}
                    className="hover:underline transition-colors"
                    style={{ color: i === breadcrumb.length - 1 ? 'var(--text-primary)' : 'var(--accent-blue)' }}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>
          );
        })()}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>资料库</p>
            </div>
            <h2 className="text-[24px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              知识库{' '}
              <span className="text-[14px] font-normal" style={{ color: 'var(--text-secondary)' }}>
                {total} 个文件
              </span>
            </h2>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.doc,.xlsx,.xls,.pdf,.txt,.md,.png,.jpg,.jpeg,.gif,.webp,.svg"
              multiple
              style={{ display: 'none' }}
              onChange={handleWebFileImport}
              aria-label="导入知识库文件"
            />
            <button type="button" onClick={handleImport} className="btn-primary !text-[13px]">
              导入文件
            </button>
            <button
              type="button"
              onClick={() => {
                batch.setIsBatchMode(!batch.isBatchMode);
              }}
              className="rounded-[4px] border px-2 py-1 text-[12px] hover:opacity-80 transition-opacity"
              style={{
                background: batch.isBatchMode ? 'var(--accent-blue)' : 'transparent',
                color: batch.isBatchMode ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                borderColor: 'var(--border-default)',
              }}
            >
              批量
            </button>
          </div>
        </div>
        <div className="mb-4 flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => dispatch({ type: 'SET_QUERY', v: e.target.value })}
            placeholder="搜索文件名..."
            className="max-w-xs rounded-[4px] border px-3 py-1.5 text-[13px] outline-none"
            style={{
              background: 'var(--bg-primary)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
          />
          <select
            value={fileType}
            onChange={(e) => dispatch({ type: 'SET_FILE_TYPE', v: e.target.value })}
            aria-label="筛选文件类型"
            title="筛选文件类型"
            className="max-w-[130px] rounded-[4px] border px-3 py-1.5 text-[13px] outline-none"
            style={{
              background: 'var(--bg-primary)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="">全部类型</option>
            <option value="docx">Word</option>
            <option value="xlsx">Excel</option>
            <option value="pdf">PDF</option>
            <option value="txt">文本</option>
            <option value="image">图片</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => dispatch({ type: 'SET_SORT_BY', v: e.target.value })}
            aria-label="排序方式"
            title="排序方式"
            className="max-w-[120px] rounded-[4px] border px-3 py-1.5 text-[13px] outline-none"
            style={{
              background: 'var(--bg-primary)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="updated_at">按日期</option>
            <option value="filename">按名称</option>
            <option value="file_size">按大小</option>
            <option value="file_type">按类型</option>
          </select>
          <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>共 {total} 个文件</span>
        </div>
        {error && (
          <div className="py-8 text-center">
            <p className="text-[14px]" style={{ color: 'var(--accent-red)' }}>{error}</p>
            <button type="button" onClick={() => { setError(null); loadFiles(); }} className="mt-3 text-[13px] hover:underline" style={{ color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>重试</button>
          </div>
        )}
        {!error && loading ? (
          <p className="py-12 text-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            加载中...
          </p>
        ) : files.length === 0 ? (
          <div
            className="rounded-[6px] border border-dashed p-12 text-center"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              {filterTagId ? '该标签下暂无文件' : '知识库为空'}
            </p>
            {!filterTagId && (
              <button
                onClick={handleImport}
                className="mt-3 text-[13px] hover:underline"
                style={{ color: 'var(--accent-blue)' }}
              >
                导入第一个文件
              </button>
            )}
          </div>
        ) : (
          <div>
            {filterTagId && (
              <div
                className="mb-3 flex items-center gap-2 rounded-[6px] border p-3"
                style={{ borderColor: 'var(--accent-blue)', background: 'var(--bg-secondary)' }}
              >
                <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  筛选标签:
                </span>
                <span className="tag !text-[13px]">{filterTagName}</span>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'SET_TAG_FILTER', id: null, name: '' });
                  }}
                  className="ml-auto text-[12px] hover:underline"
                  style={{ color: 'var(--accent-red)' }}
                >
                  清除筛选
                </button>
              </div>
            )}
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {batch.isBatchMode && files.length > 0 && (
                  <div className="col-span-full flex items-center gap-2 mb-1">
                    <span className="text-[13px]" style={{ color: 'var(--text-primary)' }}>已选 {batch.selectedCount} 项</span>
                    <button type="button" onClick={batch.selectAll} className="text-[12px] hover:underline" style={{ color: 'var(--accent-blue)' }}>全选</button>
                    <button type="button" onClick={async () => {
                      if (!confirm(`永久删除 ${batch.selectedCount} 个文件？`)) return;
                      try { await window.api.kbBatchDelete({ userId: user.id, fileIds: [...batch.selectedIds] }); batch.clearSelection(); loadFiles(); }
                      catch (e) { console.error(e); }
                    }} disabled={batch.selectedCount === 0} className="text-[12px] hover:underline disabled:opacity-40" style={{ color: 'var(--accent-red)' }}>删除所选</button>
                    <button type="button" onClick={batch.clearSelection} className="ml-auto text-[12px] hover:underline" style={{ color: 'var(--text-secondary)' }}>取消</button>
                  </div>
                )}
                {files.map((f: KnowledgeFileWithTags) => (
                  <KBCard
                    key={f.id}
                    file={f}
                    onOpen={(file) => window.api.kbOpenExternal({ fileId: file.id, userId: user.id })}
                    onRename={async (file) => {
                      const name = prompt('新文件名:', file.filename);
                      if (name?.trim()) {
                        await window.api.kbRename({ userId: user.id, fileId: file.id, newFilename: name.trim() });
                        loadFiles();
                      }
                    }}
                    onDelete={async (file) => {
                      if (!confirm('移至回收站？')) return;
                      await window.api.kbDelete({ userId: user.id, fileId: file.id, deletePhysicalFile: false });
                      loadFiles();
                    }}
                    onShowInFolder={(file) => window.api.kbOpenExternal({ fileId: file.id, userId: user.id, showInFolder: true })}
                    onTagClick={(tagId) => dispatch({ type: 'SET_TAG_FILTER', id: tagId, name: '' })}
                  />
                ))}
                {files.length === 0 && !loading && (
                  <div className="col-span-full text-center py-12 rounded-[8px] border border-dashed" style={{ borderColor: 'var(--border-default)' }}>
                    <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>暂无文件</p>
                  </div>
                )}
              </div>
          </div>
        )}

        {/* Pagination */}
        {total > pagination.limit && (
          <div className="mt-6 flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={pagination.prev}
              disabled={pagination.page === 1}
              className="rounded-[4px] border px-3 py-1.5 text-[13px] disabled:opacity-30 hover:opacity-80"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
            >
              ←
            </button>
            {Array.from({ length: Math.min(5, Math.ceil(total / pagination.limit)) }, (_, i) => {
              const totalPages = Math.ceil(total / pagination.limit);
              let p: number;
              if (totalPages <= 5) {
                p = i + 1;
              } else if (pagination.page <= 3) {
                p = i + 1;
              } else if (pagination.page >= totalPages - 2) {
                p = totalPages - 4 + i;
              } else {
                p = pagination.page - 2 + i;
              }
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => pagination.goTo(p)}
                  className="rounded-[4px] px-3 py-1.5 text-[13px]"
                  style={{
                    background: p === pagination.page ? 'var(--accent-blue)' : 'transparent',
                    color: p === pagination.page ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                  }}
                >
                  {p}
                </button>
              );
            })}
            <button
              type="button"
              onClick={pagination.next}
              disabled={pagination.page >= Math.ceil(total / pagination.limit)}
              className="rounded-[4px] border px-3 py-1.5 text-[13px] disabled:opacity-30 hover:opacity-80"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
            >
              →
            </button>
          </div>
        )}
        {/* Conflict dialog (replaces prompt()) */}
        {conflictDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div className="rounded-[8px] border p-6 shadow-xl min-w-[360px]" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
              <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>文件冲突</p>
              <p className="text-[12px] mb-4" style={{ color: 'var(--text-secondary)' }}>{conflictDialog.names}</p>
              <div className="flex gap-2">
                <button type="button" onClick={async () => {
                  const { paths, dupeIds } = conflictDialog;
                  setConflictDialog(null);
                  // R339: Delete existing files first, then import replacements
                  for (const fid of dupeIds) {
                    try { await window.api.kbDelete({ userId: user.id, fileId: fid, deletePhysicalFile: true }); } catch {}
                  }
                  try { await window.api.kbImport({ userId: user.id, filePaths: paths, copyToWorkspace: true }); loadFiles(); } catch (e) { console.error(e); }
                }} className="flex-1 rounded-[4px] px-3 py-2 text-[13px] font-medium transition-opacity hover:opacity-80" style={{ background: 'var(--accent-blue)', color: 'var(--text-on-accent)' }}>
                  替换
                </button>
                <button type="button" onClick={async () => {
                  const { paths } = conflictDialog;
                  setConflictDialog(null);
                  // R339: Import normally — backend auto-renames duplicates
                  try { await window.api.kbImport({ userId: user.id, filePaths: paths, copyToWorkspace: true }); loadFiles(); } catch (e) { console.error(e); }
                }} className="flex-1 rounded-[4px] px-3 py-2 text-[13px] font-medium transition-opacity hover:opacity-80" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                  保留两者
                </button>
                <button type="button" onClick={async () => {
                  const { paths, dupes } = conflictDialog;
                  setConflictDialog(null);
                  const rest = paths.filter(p => !dupes.includes(p));
                  if (rest.length === 0) return;
                  try { await window.api.kbImport({ userId: user.id, filePaths: rest, copyToWorkspace: true }); loadFiles(); } catch (e) { console.error(e); }
                }} className="flex-1 rounded-[4px] px-3 py-2 text-[13px] font-medium transition-opacity hover:opacity-80" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                  跳过
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Toast */}
        {toastMsg && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-[6px] px-4 py-2.5 text-[13px] shadow-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
            {toastMsg}
          </div>
        )}
        </>)}
      </div>
    </div>
  );
}

// NOTE: SimilarKbTab removed per T2406 Part 1 — similar/recommendation system deleted
