import { useCallback, useEffect, useState } from 'react';
import type { FolderTreeNode } from '../../../shared/types';

interface Props {
  userId: number;
  type: 'blog' | 'knowledge';
  selectedFolderId: number | null;
  onSelectFolder: (folderId: number | null) => void;
}

export function FolderTree({ userId, type, selectedFolderId, onSelectFolder }: Props) {
  const [tree, setTree] = useState<FolderTreeNode[]>([]);
  const [showNewInput, setShowNewInput] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [contextFolder, setContextFolder] = useState<FolderTreeNode | null>(null);
  const [contextPos, setContextPos] = useState({ x: 0, y: 0 });

  const [error, setError] = useState(false);
  const loadTree = useCallback(async () => {
    try {
      const r = await window.api.folderTree({ userId, type });
      if (r.success && r.data) {
        setTree(r.data);
        setError(false);
      } else setError(true);
    } catch {
      setError(true);
    }
  }, [userId, type]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Close context menu on click outside
  useEffect(() => {
    const h = () => setContextFolder(null);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, []);

  const [actionError, setActionError] = useState('');
  const handleCreate = async (parentId: number | null) => {
    if (!newName.trim()) {
      setShowNewInput(null);
      return;
    }
    setActionError('');
    try {
      const r = await window.api.folderCreate({ userId, name: newName.trim(), type, parentId });
      if (r.success) {
        setNewName('');
        setShowNewInput(null);
        setActionError('');
        loadTree();
      } else setActionError(r.error || '创建失败');
    } catch (err) {
      setActionError(`创建失败: ${(err as Error).message}`);
    }
  };

  const handleRename = async (folderId: number, name: string) => {
    const newName2 = prompt('重命名文件夹:', name);
    if (newName2?.trim() && newName2.trim() !== name) {
      await window.api.folderRename({ folderId, name: newName2.trim() });
      loadTree();
    }
    setContextFolder(null);
  };

  const handleDelete = async (folderId: number) => {
    if (!confirm('删除文件夹？其中的内容将移至根目录。')) return;
    await window.api.folderDelete(folderId);
    if (selectedFolderId === folderId) onSelectFolder(null);
    setContextFolder(null);
    loadTree();
  };

  const renderNode = (node: FolderTreeNode, depth: number) => (
    <div key={node.id}>
      <button
        type="button"
        className="flex w-full items-center gap-1.5 rounded-[4px] px-2 py-1 text-left text-[13px] transition-colors"
        style={{
          paddingLeft: 8 + depth * 16,
          background: selectedFolderId === node.id ? 'var(--bg-tertiary)' : 'transparent',
          color: selectedFolderId === node.id ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}
        onClick={() => onSelectFolder(selectedFolderId === node.id ? null : node.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextFolder(node);
          setContextPos({ x: e.clientX, y: e.clientY });
        }}
      >
        <span style={{ fontSize: 11 }}>📂</span>
        <span className="truncate flex-1">{node.name}</span>
        <span style={{ fontSize: 10, color: 'var(--text-placeholder)' }}>{node.itemCount}</span>
      </button>
      {node.children.map((child) => renderNode(child, depth + 1))}

      {/* New folder input below this node */}
      {showNewInput === node.id && (
        <div className="flex gap-1 px-2 py-1" style={{ paddingLeft: 8 + (depth + 1) * 16 }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate(node.id);
              if (e.key === 'Escape') setShowNewInput(null);
            }}
            placeholder="文件夹名..."
            className="flex-1 rounded-[3px] px-2 py-0.5 text-[12px]"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="select-none">
      {actionError && (
        <div
          className="mb-2 rounded-[4px] px-2 py-1 text-[11px]"
          style={{ background: 'rgba(248,81,73,0.1)', color: 'var(--accent-red)' }}
        >
          {actionError}
        </div>
      )}
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          文件夹
        </span>
        <button
          type="button"
          className="text-[16px] leading-none"
          style={{ color: 'var(--text-secondary)' }}
          onClick={() => {
            setShowNewInput(-1);
            setNewName('');
          }}
          title="新建文件夹"
        >
          +
        </button>
      </div>

      {/* Root-level new folder input */}
      {showNewInput === -1 && (
        <div className="mb-1 flex gap-1 px-1">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate(null);
              if (e.key === 'Escape') setShowNewInput(null);
            }}
            placeholder="文件夹名..."
            className="flex-1 rounded-[3px] px-2 py-0.5 text-[12px]"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      )}

      {/* All items */}
      <button
        type="button"
        className="mb-0.5 flex w-full items-center gap-1.5 rounded-[4px] px-2 py-1 text-left text-[13px] transition-colors"
        style={{
          background: selectedFolderId === null ? 'var(--bg-tertiary)' : 'transparent',
          color: selectedFolderId === null ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}
        onClick={() => onSelectFolder(null)}
      >
        <span style={{ fontSize: 11 }}>📁</span>
        <span>全部</span>
      </button>

      {tree.map((node) => renderNode(node, 0))}

      {/* Context menu */}
      {contextFolder && (
        <div
          className="fixed z-50 rounded-[6px] border py-1 shadow-lg"
          style={{
            left: contextPos.x,
            top: contextPos.y,
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-default)',
            minWidth: 140,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-[12px] hover:opacity-80"
            style={{ color: 'var(--text-primary)' }}
            onClick={() => {
              setShowNewInput(contextFolder.id);
              setNewName('');
              setContextFolder(null);
            }}
          >
            + 新建子文件夹
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-[12px] hover:opacity-80"
            style={{ color: 'var(--text-primary)' }}
            onClick={() => handleRename(contextFolder.id, contextFolder.name)}
          >
            重命名
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-[12px] hover:opacity-80"
            style={{ color: 'var(--accent-red)' }}
            onClick={() => handleDelete(contextFolder.id)}
          >
            删除
          </button>
        </div>
      )}
    </div>
  );
}
