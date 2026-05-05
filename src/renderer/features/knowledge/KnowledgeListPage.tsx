import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderTree } from '../../components/common/FolderTree';
import { TagSelector } from '../../components/common/TagSelector';
import { useBatchSelect } from '../../hooks/useBatchSelect';
import { usePagination } from '../../hooks/usePagination';
import { formatDate, formatFileSize } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  docx: { label: 'DOCX', color: 'var(--accent-blue)' },
  xlsx: { label: 'XLSX', color: 'var(--accent-green)' },
  pptx: { label: 'PPTX', color: 'var(--accent-amber)' },
  pdf: { label: 'PDF', color: 'var(--accent-red)' },
  txt: { label: 'TXT', color: 'var(--text-secondary)' },
  image: { label: 'IMG', color: 'var(--accent-purple)' },
  other: { label: 'FILE', color: 'var(--text-secondary)' },
};

export function KnowledgeListPage() {
  const user = useAuthStore((s) => s.user);
  const [files, setFiles] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [fileType, setFileType] = useState('');
  const [filterTagId, setFilterTagId] = useState<number | null>(null);
  const [filterTagName, setFilterTagName] = useState('');
  const [filterFolderId, setFilterFolderId] = useState<number | null>(null);
  const [showFolderSidebar, setShowFolderSidebar] = useState(
    () => localStorage.getItem('sidebar_folder_knowledge') === '1',
  );
  const [editingTagsFileId, setEditingTagsFileId] = useState<number | null>(null);
  const [editingTagIds, setEditingTagIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<number | null>(null);
  const [previewFileType, setPreviewFileType] = useState('');
  const [backRefs, setBackRefs] = useState<any[]>([]);
  const batch = useBatchSelect(files as { id: number }[]);
  const pagination = usePagination(20);
  const [dragOver, setDragOver] = useState(false);
  const [kbFolders, setKbFolders] = useState<any[]>([]);
  const loadKbFolders = useCallback(async () => {
    if (!user) return;
    const d = await window.api.folderTree({ userId: user.id, type: 'knowledge' });
    const r = d as any;
    if (r.success && r.data) setKbFolders(r.data);
  }, [user]);
  useEffect(() => {
    loadKbFolders();
  }, [loadKbFolders]);

  const loadFiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
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
      const resp = r as any;
      if (resp.success && resp.data) {
        setFiles(resp.data.files);
        setTotal(resp.data.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
      style={{ maxWidth: 1000, margin: '0 auto' }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
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
              setShowFolderSidebar(v);
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[24px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            知识库{' '}
            <span className="text-[14px] font-normal" style={{ color: 'var(--text-secondary)' }}>
              {total} 个文件
            </span>
          </h2>
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
            onChange={(e) => setQuery(e.target.value)}
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
            onChange={(e) => setFileType(e.target.value)}
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
                  await window.api.kbBatchDelete([...batch.selectedIds]);
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
        {loading ? (
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
                    setFilterTagId(null);
                    setFilterTagName('');
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
                  {files.map((f: any) => {
                    const t = TYPE_LABELS[f.fileType] || TYPE_LABELS.other;
                    const isEditing = editingTagsFileId === f.id;
                    return (
                      <tr
                        key={f.id}
                        className="border-t transition-colors duration-[0.15s]"
                        style={{ borderColor: 'var(--border-default)' }}
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
                              setPreviewing(true);
                              setPreviewTitle(f.filename);
                              setPreviewFileId(f.id);
                              setPreviewFileType(f.fileType || '');
                              window.api
                                .refGetTo({ targetType: 'knowledge', targetId: f.id })
                                .then((d: unknown) => {
                                  const r = d as any;
                                  if (r.success && r.data)
                                    setBackRefs(r.data.filter((ref: any) => ref.source_type === 'blog'));
                                })
                                .catch(() => setBackRefs([]));
                              try {
                                const r = await window.api.kbPreview(f.id);
                                const resp = r as any;
                                setPreviewHtml(resp.html || '<p style=color:var(--text-secondary)>无法预览</p>');
                              } catch {
                                setPreviewHtml('<p style=color:var(--text-secondary)>预览失败</p>');
                              } finally {
                                setPreviewing(false);
                              }
                            }}
                            className="text-left hover:underline transition-colors duration-[0.15s] max-w-[300px] truncate block"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {f.filename}
                          </button>
                          {f.tags?.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {f.tags.map((tg: any) => (
                                <button
                                  key={tg.id}
                                  type="button"
                                  className="tag text-[11px] cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFilterTagId(tg.id);
                                    setFilterTagName(tg.name);
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
                                  setEditingTagIds(tagIds);
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
                            style={{ color: t.color, background: 'var(--bg-tertiary)' }}
                          >
                            {t.label}
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
                            {kbFolders.map((fd: any) => (
                              <option key={fd.id} value={fd.id}>
                                {fd.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) {
                                setEditingTagsFileId(null);
                                setEditingTagIds([]);
                              } else {
                                setEditingTagsFileId(f.id);
                                setEditingTagIds((f.tags || []).map((tg: any) => tg.id));
                              }
                            }}
                            className="mr-2 text-[12px] hover:underline"
                            style={{ color: isEditing ? 'var(--accent-amber)' : 'var(--accent-blue)' }}
                          >
                            {isEditing ? '完成' : '标签'}
                          </button>
                          <button
                            type="button"
                            onClick={() => window.api.kbOpenExternal(f.id)}
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
                                await window.api.kbDelete({ fileId: f.id, deletePhysicalFile: false });
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
            <button
              type="button"
              onClick={() => {
                setPreviewTitle('');
                setPreviewHtml('');
              }}
              className="text-[13px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              关闭
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            {previewing ? (
              <p
                className="flex h-full items-center justify-center text-[14px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                加载预览...
              </p>
            ) : previewFileType === 'pdf' && previewFileId ? (
              <webview
                src="about:blank"
                className="w-full h-full border-0"
                title="preview"
                {...{ partition: 'persist:pdfview' }}
                ref={(el) => {
                  if (el && previewFileId) {
                    const kbId = previewFileId;
                    window.api.kbGet(kbId).then((d: unknown) => {
                      const r = d as any;
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
                sandbox="allow-same-origin"
              />
            )}
          </div>
          {backRefs.length > 0 && (
            <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border-default)' }}>
              <p className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                📝 引用了此文件的博客 ({backRefs.length})
              </p>
              {backRefs.map((ref: any) => (
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
