import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderTree } from '../../components/common/FolderTree';
import { TagSelector } from '../../components/common/TagSelector';
import { useBatchSelect } from '../../hooks/useBatchSelect';
import { usePagination } from '../../hooks/usePagination';
import { KbContentEditor } from '../../components/knowledge/KbContentEditor';
import { formatDate, formatFileSize } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';
import type { FolderTreeNode, KnowledgeFileWithTags, Reference, Tag } from '../../../shared/types';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  docx: { label: 'DOCX', color: 'var(--accent-blue)' },
  xlsx: { label: 'XLSX', color: 'var(--accent-green)' },
  pptx: { label: 'PPTX', color: 'var(--text-secondary)' },
  pdf: { label: 'PDF', color: 'var(--accent-red)' },
  txt: { label: 'TXT', color: 'var(--text-secondary)' },
  image: { label: 'IMG', color: 'var(--accent-blue)' },
  other: { label: 'FILE', color: 'var(--text-secondary)' },
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
        const paths: string[] = [];
        for (const file of Array.from(e.dataTransfer.files)) {
          if ('path' in file && file.path) paths.push(file.path as string);
        }
        if (paths.length) {
          try {
            await window.api.kbImport({ userId: user.id, filePaths: paths, copyToWorkspace: true });
            loadFiles();
          } catch (e) {
            console.error(e);
          }
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
            <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>资料库</p>
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
        </div>
        {batch.isBatchMode && files.length > 0 && (
          <div
            className="mb-3 flex items-center gap-3 rounded-[6px] border p-2.5"
            style={{ borderColor: 'var(--accent-blue)', background: 'var(--bg-secondary)' }}
          >
            <span className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
              已选 {batch.selectedCount} 项
            </span>
            <button
              type="button"
              onClick={batch.selectAll}
              className="text-[12px] hover:underline"
              style={{ color: 'var(--accent-blue)' }}
            >
              全选
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!confirm(`永久删除 ${batch.selectedCount} 个文件？`)) return;
                try {
                  await window.api.kbBatchDelete({ userId: user.id, fileIds: [...batch.selectedIds] });
                  batch.clearSelection();
                  loadFiles();
                } catch (e) {
                  console.error(e);
                }
              }}
              disabled={batch.selectedCount === 0}
              className="text-[12px] hover:underline disabled:opacity-40"
              style={{ color: 'var(--accent-red)' }}
            >
              删除所选
            </button>
            <button
              type="button"
              onClick={batch.clearSelection}
              className="ml-auto text-[12px] hover:underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              取消
            </button>
          </div>
        )}
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
            <div className="rounded-[6px] border" style={{ borderColor: 'var(--border-default)', overflowX: 'auto' }}>
              <table className="w-full text-[14px]">
                <thead style={{ background: 'var(--bg-tertiary)' }}>
                  <tr>
                    {batch.isBatchMode && <th className="px-3 py-2.5 w-10" />}
                    <th className="px-4 py-2.5 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>
                      文件名
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>
                      类型
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>
                      大小
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>
                      添加日期
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f: KnowledgeFileWithTags) => {
                    const t = TYPE_LABELS[f.fileType] || TYPE_LABELS.other;
                    const isEditing = editingTagsFileId === f.id;
                    return (
                      <tr
                        key={f.id}
                        tabIndex={0}
                        className="border-t transition-colors duration-[0.15s] focus:bg-[var(--bg-tertiary)] outline-none"
                        style={{ borderColor: 'var(--border-default)' }}
                        onKeyDown={(e) => {
                          if (e.key === ' ' && !(e.target instanceof HTMLInputElement)) {
                            e.preventDefault();
                            dispatch({ type: 'PREVIEW_START', title: f.filename, fileId: f.id, fileType: f.fileType || '' });
                            window.api.refGetTo({ targetType: 'knowledge', targetId: f.id })
                              .then((r) => { if (r.success && r.data) dispatch({ type: 'SET_BACKREFS', refs: r.data.filter((ref: Reference) => ref.sourceType === 'blog') }); })
                              .catch(() => dispatch({ type: 'SET_BACKREFS', refs: [] }));
                            window.api.kbPreview({ fileId: f.id, userId: user.id })
                              .then((r: any) => { const html = (r.success !== false ? r.data?.html || r.html : '') || '<p style=color:var(--text-secondary)>无法预览</p>'; dispatch({ type: 'PREVIEW_HTML', html }); })
                              .catch(() => dispatch({ type: 'PREVIEW_HTML', html: '<p style=color:var(--text-secondary)>预览失败</p>' }));
                          }
                        }}
                      >
                        {batch.isBatchMode && (
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={batch.selectedIds.has(f.id)}
                              onChange={() => batch.toggleSelect(f.id)}
                              aria-label={`选择 ${f.filename}`}
                            />
                          </td>
                        )}
                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            onClick={async () => {
                              dispatch({ type: 'PREVIEW_START', title: f.filename, fileId: f.id, fileType: f.fileType || '' });
                              window.api
                                .refGetTo({ targetType: 'knowledge', targetId: f.id })
                                .then((r) => {
                                  if (r.success && r.data)
                                    dispatch({ type: 'SET_BACKREFS', refs: r.data.filter((ref: Reference) => ref.sourceType === 'blog') });
                                })
                                .catch(() => dispatch({ type: 'SET_BACKREFS', refs: [] }));
                              try {
                                const timeout = new Promise<string>((_, reject) =>
                                  setTimeout(() => reject(new Error('TIMEOUT')), 10000),
                                );
                                const preview = window.api.kbPreview({ fileId: f.id, userId: user.id }).then((r: { success?: boolean; data?: { html?: string }; html?: string }) => (r.success !== false ? r.data?.html || r.html : '') || '<p style=color:var(--text-secondary)>无法预览</p>');
                                const html = await Promise.race([preview, timeout]);
                                dispatch({ type: 'PREVIEW_HTML', html });
                              } catch (e) {
                                const msg = (e as Error).message === 'TIMEOUT'
                                  ? '<p style=color:var(--text-secondary)>文件较大,解析超时。请使用外部打开查看。</p>'
                                  : '<p style=color:var(--text-secondary)>预览失败</p>';
                                dispatch({ type: 'PREVIEW_HTML', html: msg });
                              }
                            }}
                            className="text-left hover:underline transition-colors duration-[0.15s] max-w-[300px] truncate block"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {f.filename}
                          </button>
                          {f.tags?.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {f.tags.map((tg: Tag) => (
                                <button
                                  key={tg.id}
                                  type="button"
                                  className="tag text-[11px] cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dispatch({ type: 'SET_TAG_FILTER', id: tg.id, name: tg.name });
                                  }}
                                  title={`筛选标签: ${tg.name}`}
                                >
                                  {tg.name}
                                </button>
                              ))}
                            </div>
                          )}
                          {isEditing && user && (
                            <div className="mt-2">
                              <TagSelector
                                userId={user.id}
                                selectedTagIds={editingTagIds}
                                openUp
                                onChange={async (tagIds) => {
                                  dispatch({ type: 'SET_EDIT_TAG_IDS', ids: tagIds });
                                  try {
                                    await window.api.tagSetFile({ fileId: f.id, tagIds });
                                    loadFiles();
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className="rounded-[3px] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase"
                            style={{ color: t?.color, background: 'var(--bg-tertiary)' }}
                          >
                            {t?.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                          {formatFileSize(f.fileSize)}
                        </td>
                        <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                          {formatDate(f.createdAt)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <select
                            value=""
                            onChange={async (e) => {
                              const fid = e.target.value ? Number(e.target.value) : null;
                              try {
                                await window.api.folderMoveItem({
                                  userId: user.id,
                                  itemType: 'knowledge_file',
                                  itemId: f.id,
                                  folderId: fid,
                                });
                                loadFiles();
                                loadKbFolders();
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="mr-2 text-[10px] rounded-[3px] border px-1 py-0.5 outline-none"
                            style={{
                              borderColor: 'var(--border-default)',
                              background: 'var(--bg-primary)',
                              color: 'var(--text-secondary)',
                              maxWidth: 56,
                            }}
                            title="移至文件夹"
                          >
                            <option value="">移至</option>
                            <option value="0">根目录</option>
                            {kbFolders.map((fd: FolderTreeNode) => (
                              <option key={fd.id} value={fd.id}>
                                {fd.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) {
                                dispatch({ type: 'STOP_EDIT_TAGS' });
                              } else {
                                dispatch({ type: 'START_EDIT_TAGS', fileId: f.id, tagIds: (f.tags || []).map((tg: Tag) => tg.id) });
                              }
                            }}
                            className="mr-2 text-[12px] hover:underline"
                            style={{ color: isEditing ? 'var(--text-secondary)' : 'var(--accent-blue)' }}
                          >
                            {isEditing ? '完成' : '标签'}
                          </button>
                          <button
                            type="button"
                            onClick={() => window.api.kbOpenExternal({ fileId: f.id, userId: user.id })}
                            className="mr-2 text-[12px] hover:underline"
                            style={{ color: 'var(--accent-blue)' }}
                          >
                            打开
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm('移至回收站？')) return;
                              try {
                                await window.api.kbDelete({ userId: user.id, fileId: f.id, deletePhysicalFile: false });
                                loadFiles();
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="text-[12px] hover:underline"
                            style={{ color: 'var(--accent-red)' }}
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
      </div>
      {previewTitle && (
        <div
          className="w-[480px] shrink-0 rounded-[6px] border flex flex-col"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-2.5"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <h3 className="truncate text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {previewTitle}
            </h3>
            <div className="flex items-center gap-2">
              {/* T2112: Edit button for TXT/MD files */}
              {(previewFileType === 'txt' || previewFileType === 'md') && user && previewFileId && (
                <button
                  type="button"
                  onClick={() => setEditingFileId(previewFileId)}
                  className="text-[12px] rounded-[4px] px-2 py-0.5 transition-opacity hover:opacity-85"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-blue)' }}
                >
                  编辑
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'PREVIEW_CLOSE' });
                  setEditingFileId(null);
                }}
                className="text-[13px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                关闭
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {editingFileId && user ? (
              <KbContentEditor
                fileId={editingFileId}
                userId={user.id}
                fileType={previewFileType}
                initialContent={previewFileType === 'txt' ? stripHtmlForEdit(previewHtml) : ''}
                onClose={() => setEditingFileId(null)}
                onSaved={() => { setEditingFileId(null); dispatch({ type: 'PREVIEW_CLOSE' }); }}
              />
            ) : previewing ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
                <div className="w-full max-w-[200px] rounded-full h-2 overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="h-full rounded-full animate-pulse" style={{ background: 'var(--accent-blue)', width: '60%' }} />
                </div>
                <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>正在解析文件...</p>
              </div>
            ) : previewFileType === 'pdf' && previewFileId ? (
              <webview
                src="about:blank"
                className="w-full h-full border-0"
                title="preview"
                {...{ partition: 'persist:pdfview' }}
                ref={(el) => {
                  if (el && previewFileId) {
                    const kbId = previewFileId;
                    window.api.kbGet({ fileId: kbId, userId: user.id }).then((r: { success?: boolean; data?: { filePath?: string } }) => {
                      if (r.success && r.data?.filePath)
                        el.setAttribute('src', `file:///${r.data.filePath.replace(/\\/g, '/')}`);
                    });
                  }
                }}
              />
            ) : (
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                title="preview"
                sandbox="allow-same-origin allow-scripts"
              />
            )}
          </div>
          {/* T2009: Properties display */}
          {previewFileId && (() => {
            const file = files.find((f: { id: number; properties?: Record<string, string> }) => f.id === previewFileId);
            const props = file?.properties;
            if (!props || Object.keys(props).length === 0) return null;
            return (
              <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border-default)' }}>
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
            );
          })()}
          {backRefs.length > 0 && (
            <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border-default)' }}>
              <p className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                📝 引用了此文件的博客 ({backRefs.length})
              </p>
              {backRefs.map((ref: Reference) => (
                <Link
                  key={ref.id}
                  to={`/blog/${ref.source_id}`}
                  className="block text-[13px] no-underline hover:underline truncate"
                  style={{ color: 'var(--accent-blue)' }}
                >
                  {ref.title || `博客 #${ref.source_id}`}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
