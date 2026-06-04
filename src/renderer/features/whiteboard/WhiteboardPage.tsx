import { useCallback, useEffect, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge, type NodeMouseHandler, useNodesState, useEdgesState, addEdge, type Connection, Panel, BackgroundVariant, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNavigate } from 'react-router-dom';
import { FileEdit, Library, Bookmark } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';

function nodeColor(name: string): string {
  const map: Record<string, string> = {
    blue: 'var(--accent-blue)', green: 'var(--accent-green)', red: 'var(--accent-red)', amber: 'var(--accent-yellow)', purple: 'var(--text-secondary)',
  };
  return map[name] || map.blue;
}

function IdeaNode({ data }: { data: { label: string; color: string } }) {
  return (
    <div className="rounded-[8px] border-2 px-4 py-3 shadow-sm min-w-[160px]" style={{ borderColor: nodeColor(data.color) || nodeColor('blue'), background: 'var(--bg-secondary)' }}>
      <div className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{data.label}</div>
    </div>
  );
}

function TaskNode({ data }: { data: { label: string; status: string; color: string } }) {
  const done = data.status === 'done';
  const inProgress = data.status === 'in_progress';
  return (
    <div className="rounded-[8px] border-2 px-4 py-3 shadow-sm min-w-[160px]" style={{ borderColor: nodeColor(data.color) || nodeColor('green'), background: 'var(--bg-secondary)' }}>
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 rounded border-2 flex items-center justify-center text-[10px]"
          style={{ borderColor: 'var(--text-secondary)', color: done ? 'var(--accent-green)' : inProgress ? 'var(--accent-yellow)' : 'transparent' }}>
          {done ? '✓' : inProgress ? '·' : ''}
        </span>
        <span className={`text-[13px] font-medium ${done ? 'line-through' : ''}`}
          style={{ color: done ? 'var(--text-muted)' : 'var(--text-primary)' }}>
          {data.label}
        </span>
      </div>
    </div>
  );
}

function TextNode({ data }: { data: { label: string } }) {
  return (
    <div className="rounded-[4px] px-3 py-2 min-w-[120px]" style={{ background: 'var(--bg-tertiary)' }}>
      <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{data.label}</span>
    </div>
  );
}

// T2307: Link node for blog/KB/bookmark references — Lucide icons
function LinkIcon({ refType }: { refType: string }) {
  const size = 14;
  const style = { flexShrink: 0 as const };
  if (refType === 'blog') return <FileEdit size={size} style={style} />;
  if (refType === 'knowledge') return <Library size={size} style={style} />;
  if (refType === 'bookmark') return <Bookmark size={size} style={style} />;
  return <Library size={size} style={style} />;
}
function LinkNode({ data }: { data: { label: string; color: string; refType: string; refId: number } }) {
  return (
    <div className="rounded-[8px] border-2 px-4 py-3 shadow-sm min-w-[160px] cursor-pointer hover:opacity-85 transition-opacity"
      style={{ borderColor: nodeColor(data.color) || nodeColor('blue'), background: 'var(--bg-secondary)' }}>
      <div className="flex items-center gap-2">
        <LinkIcon refType={data.refType} />
        <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{data.label}</span>
      </div>
      <div className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        {data.refType} #{data.refId}
      </div>
    </div>
  );
}

interface WbNodeData { label: string; color: string; status?: string; refType?: string; refId?: number }

const nodeTypes = { idea: IdeaNode, task: TaskNode, text: TextNode, blogLink: LinkNode, kbLink: LinkNode, bookmarkLink: LinkNode };

function getNodeData(n: { data: unknown }): WbNodeData {
  const d = n.data as Record<string, unknown>;
  return { label: String(d.label || ''), color: String(d.color || 'blue'), status: String(d.status || ''), refType: String(d.refType || ''), refId: Number(d.refId) || undefined };
}

export function WhiteboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [wbId, setWbId] = useState<number | null>(null);
  const [wbTitle, setWbTitle] = useState('我的白板');
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // T2307: Context menu state
  const [ctxNode, setCtxNode] = useState<Node | null>(null);
  const [ctxPos, setCtxPos] = useState<{ x: number; y: number } | null>(null);
  // Quick-input dialog (replaces prompt() — blocked in Electron renderer)
  const [quickInput, setQuickInput] = useState<{ msg: string; resolve: (v: string | null) => void } | null>(null);

  const reloadNodes = useCallback(async () => {
    if (!user || !wbId) return;
    const [nR, eR] = await Promise.all([
      window.api.whiteboardNodes({ whiteboardId: wbId, userId: user.id }),
      window.api.whiteboardEdges({ whiteboardId: wbId, userId: user.id }),
    ]);
    if (nR.success && nR.data) {
      setNodes(nR.data.map((n) => ({
        id: String(n.id), type: n.nodeType || 'idea',
        position: { x: n.x, y: n.y },
        data: { label: n.title || '', color: n.color || 'blue', status: n.taskStatus || 'todo', refType: n.refType, refId: n.refId },
      })));
    }
    if (eR.success && eR.data) {
      setEdges(eR.data.map((e) => ({ id: String(e.id), source: String(e.sourceNodeId), target: String(e.targetNodeId), label: e.label, data: { edgeType: e.edgeType } })));
    }
  }, [user, wbId]);

  // Load whiteboard and nodes
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const wbR = await window.api.whiteboardGet(user.id);
        if (wbR.success && wbR.data) {
          setWbId(wbR.data.id);
          setWbTitle(wbR.data.title || '我的白板');
          await reloadNodes();
        }
      } catch { setError('加载白板失败'); }
      setLoading(false);
    })();
  }, [user]);

  // T2307: Bidirectional sync — listen for content changes
  useEffect(() => {
    const u1 = window.api.onBlogRefresh?.(() => reloadNodes());
    const u2 = window.api.onKbRefresh?.(() => reloadNodes());
    return () => { u1?.(); u2?.(); };
  }, [reloadNodes]);

  // T2307: Edge type selection — show 3-button floating UI instead of prompt()
  const [edgePicker, setEdgePicker] = useState<{ conn: Connection; x: number; y: number } | null>(null);

  const onConnect = useCallback((conn: Connection) => {
    setEdgePicker({ conn, x: window.innerWidth / 2 - 120, y: window.innerHeight / 2 - 40 });
  }, []);

  const confirmEdge = useCallback((edgeType: string, label: string) => {
    if (!edgePicker || !wbId || !user) return;
    const { conn } = edgePicker;
    const tempId = `e-temp-${Date.now()}`;
    setEdges((eds) => addEdge({ ...conn, id: tempId, label, data: { edgeType } }, eds));
    window.api.whiteboardEdgeCreate({ whiteboardId: wbId, userId: user.id, sourceNodeId: Number(conn.source), targetNodeId: Number(conn.target), edgeType }).then((r) => {
      if (r.success && r.data) {
        setEdges((eds) => eds.map((e) => e.id === tempId ? { ...e, id: String(r.data!.id) } : e));
      } else {
        setEdges((eds) => eds.filter((e) => e.id !== tempId));
      }
    }).catch(() => {
      setEdges((eds) => eds.filter((e) => e.id !== tempId));
    });
    setEdgePicker(null);
  }, [edgePicker, wbId, user]);

  const addNode = async (type: string, label: string, color = 'blue', refType?: string, refId?: number) => {
    if (!user || !wbId) return;
    const x = Math.random() * 400 + 100;
    const y = Math.random() * 300 + 100;
    const tempId = `temp-${Date.now()}`;
    setNodes((nds) => [...nds, {
      id: tempId, type, position: { x, y },
      data: { label, color, status: 'todo', refType, refId },
    }]);
    try {
      const r = await window.api.whiteboardNodeCreate({
        whiteboardId: wbId, userId: user.id, nodeType: type, title: label,
        x, y, color, refType, refId,
      });
      if (r.success && r.data) {
        setNodes((nds) => nds.map((n) => n.id === tempId ? { ...n, id: String(r.data!.id) } : n));
      } else {
        setNodes((nds) => nds.filter((n) => n.id !== tempId));
      }
    } catch {
      setNodes((nds) => nds.filter((n) => n.id !== tempId));
    }
  };

  // Double-click to edit node title
  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const d = getNodeData(node);
    // T2307: Link nodes — navigate to source on single-click, edit with quickInput on double-click
    if (node.type === 'blogLink' || node.type === 'kbLink' || node.type === 'bookmarkLink') {
      if (d.refType === 'blog') navigate(`/blog/${d.refId}`);
      else if (d.refType === 'knowledge') {
        // R334: Use quickInput instead of prompt() (blocked in Electron renderer)
        setQuickInput({ msg: '编辑文件名 (同步更新 KB)', resolve: (v) => {
          if (v && v.trim() && d.refId && user) {
            setNodes((nds) => nds.map((n) => n.id === node.id ? { ...n, data: { ...n.data, label: v.trim() } } : n));
            window.api.whiteboardNodeUpdate({ id: Number(node.id), userId: user.id, title: v.trim() });
            window.api.kbRename({ fileId: d.refId, userId: user.id, filename: v.trim() }).catch(() => {});
          }
          setQuickInput(null);
        }});
        setTimeout(() => {
          const inp = document.getElementById('quick-input-field') as HTMLInputElement | null;
          if (inp) { inp.value = d.label; inp.focus(); inp.select(); }
        }, 50);
      }
      else if (d.refType === 'bookmark') navigate('/bookmarks');
      return;
    }
    // Use quickInput instead of prompt() (blocked in Electron renderer)
    const label = d.label || '';
    setQuickInput({ msg: '编辑标题', resolve: (v) => {
      if (v && v.trim() && user) {
        setNodes((nds) => nds.map((n) => n.id === node.id ? { ...n, data: { ...n.data, label: v.trim() } } : n));
        window.api.whiteboardNodeUpdate({ id: Number(node.id), userId: user.id, title: v.trim() });
      }
      setQuickInput(null);
    }});
    // Pre-fill with current label
    setTimeout(() => {
      const inp = document.getElementById('quick-input-field') as HTMLInputElement | null;
      if (inp) { inp.value = label; inp.focus(); inp.select(); }
    }, 50);
  }, [user, navigate]);

  const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    if (user) {
      window.api.whiteboardNodeUpdate({ id: Number(node.id), userId: user.id, x: node.position.x, y: node.position.y });
    }
  }, [user]);

  // T2307: Double-click on empty canvas to create idea
  const handlePaneDoubleClick = useCallback((_event: React.MouseEvent) => {
    // React Flow handles pane clicks via onDoubleClick on the wrapper
  }, []);

  // T2307: Right-click context menu
  const handleNodeContextMenu = useCallback((event: any, node: Node) => {
    event.preventDefault();
    setCtxNode(node);
    setCtxPos({ x: event.clientX, y: event.clientY });
  }, []);

  const handleCtxConvert = async (newType: string) => {
    if (!ctxNode || !user) return;
    const d = getNodeData(ctxNode);
    const id = Number(ctxNode.id);
    if (newType === 'blog' || newType === 'note' || newType === 'task') {
      // Create actual content from idea node
      if (newType === 'blog') {
        navigate(`/blog/new?title=${encodeURIComponent(d.label || '')}`);
      } else if (newType === 'note') {
        await window.api.quickNoteShow(user.id);
      }
      // Change node type to task
      if (newType === 'task') {
        setNodes((nds) => nds.map((n) => n.id === ctxNode.id ? { ...n, type: 'task', data: { ...n.data, status: 'todo' } } : n));
        window.api.whiteboardNodeUpdate({ id, userId: user.id, nodeType: 'task', taskStatus: 'todo' });
      }
    }
    setCtxNode(null);
    setCtxPos(null);
  };

  // Delete key to remove selected nodes
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        const selected = document.querySelectorAll('.react-flow__node.selected');
        selected.forEach((el) => {
          const nodeId = el.getAttribute('data-id');
          if (nodeId && !nodeId.startsWith('temp-') && user) {
            window.api.whiteboardNodeDelete({ nodeId: Number(nodeId), userId: user.id });
            setNodes((nds) => nds.filter((n) => n.id !== nodeId));
          }
        });
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [user]);

  if (loading) return <div className="flex-1 flex items-center justify-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>加载白板...</div>;
  if (error) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <p className="text-[14px]" style={{ color: 'var(--accent-red)' }}>{error}</p>
      <button type="button" onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
        className="rounded-[4px] px-4 py-2 text-[13px] hover:opacity-80"
        style={{ background: 'var(--accent-blue)', color: 'var(--text-on-accent)' }}>
        重试
      </button>
    </div>
  );

  return (
    <ReactFlowProvider>
      <WhiteboardCanvas
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect} onNodeDragStop={handleNodeDragStop}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        addNode={addNode} wbTitle={wbTitle}
        setCtxNode={setCtxNode} setCtxPos={setCtxPos}
        ctxNode={ctxNode} ctxPos={ctxPos}
        quickInput={quickInput} setQuickInput={setQuickInput}
        edgePicker={edgePicker} setEdgePicker={setEdgePicker} confirmEdge={confirmEdge}
        user={user} setNodes={setNodes}
        handleCtxConvert={handleCtxConvert}
      />
    </ReactFlowProvider>
  );
}

// T2307: Inner canvas component — must be inside ReactFlowProvider for useReactFlow()
function WhiteboardCanvas({
  nodes, edges, onNodesChange, onEdgesChange, onConnect,
  onNodeDragStop, onNodeDoubleClick, onNodeContextMenu,
  addNode, wbTitle, setCtxNode, setCtxPos, ctxNode, ctxPos,
  quickInput, setQuickInput, edgePicker, setEdgePicker, confirmEdge, user, setNodes, handleCtxConvert,
}: any) {
  const rf = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    try {
      const raw = event.dataTransfer.getData('application/lbkb-whiteboard');
      if (!raw) return;
      const data = JSON.parse(raw);
      const pos = rf.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      if (data.type === 'knowledge') {
        addNode('kbLink', data.title || '知识库文件', 'green', 'knowledge', data.id);
      } else if (data.type === 'blog') {
        addNode('blogLink', data.title || '博客', 'blue', 'blog', data.id);
      } else if (data.type === 'bookmark') {
        addNode('bookmarkLink', data.title || '书签', 'amber', 'bookmark', data.id);
      }
    } catch { /* ignore */ }
  }, [rf, addNode]);

  return (
    <div style={{ height: 'calc(100vh - var(--nav-height) - 36px)' }} onClick={() => { setCtxNode(null); setCtxPos(null); }}>
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect} onNodeDragStop={onNodeDragStop} onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onDoubleClick={() => addNode('idea', '新想法', 'blue')}
        onDragOver={onDragOver} onDrop={onDrop}
        onNodeClick={(_event: React.MouseEvent, node: Node) => {
          if (node.type === 'task' && user) {
            const cur = getNodeData(node).status || 'todo';
            const next = cur === 'todo' ? 'in_progress' : cur === 'in_progress' ? 'done' : 'todo';
            setNodes((nds) => nds.map((n) => n.id === node.id ? { ...n, data: { ...n.data, status: next } } : n));
            window.api.whiteboardNodeUpdate({ id: Number(node.id), userId: user.id, taskStatus: next });
          }
        }}
        nodeTypes={nodeTypes} fitView deleteKeyCode={['Delete', 'Backspace']}>
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--border-default)" />
        <Controls style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 8 }} />
        <MiniMap style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }} nodeColor={(n) => {
          const c = nodeColor(getNodeData(n).color || 'blue');
          const el = document.documentElement;
          const varName = c.replace('var(', '').replace(')', '').trim();
          return getComputedStyle(el).getPropertyValue(varName).trim() || '#58a6ff';
        }} />
        <Panel position="top-left" style={{ margin: 8 }}>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{wbTitle}</span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>白板</span>
          </div>
        </Panel>
        <Panel position="top-right" style={{ margin: 8 }}>
          <div className="flex gap-1.5 rounded-[6px] border p-1.5" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
            {[
              { type: 'idea', label: '+ 想法', color: 'blue' },
              { type: 'task', label: '+ 任务', color: 'green' },
              { type: 'text', label: '+ 文本', color: 'purple' },
              { type: 'blogLink', label: '+ 博客', color: 'blue' },
              { type: 'kbLink', label: '+ KB', color: 'green' },
              { type: 'bookmarkLink', label: '+ 书签', color: 'amber' },
            ].map((btn) => (
              <button key={btn.type} type="button" onClick={() => {
                const label = btn.type === 'idea' ? '新想法' : btn.type === 'task' ? '新任务' : btn.type === 'text' ? '文本' : btn.type === 'blogLink' ? '博客链接' : btn.type === 'kbLink' ? 'KB链接' : '书签链接';
                addNode(btn.type, label, btn.color);
              }}
                className="rounded-[4px] px-3 py-1 text-[12px] font-medium transition-opacity hover:opacity-80 disabled:opacity-30"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
                disabled={!user}
                title={!user ? '请先登录' : `添加${btn.label}`}>
                {btn.label}
              </button>
            ))}
          </div>
        </Panel>
      </ReactFlow>

      {/* Quick-input dialog (replaces prompt()) */}
      {quickInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => quickInput.resolve(null)}>
          <div className="rounded-[8px] border p-4 shadow-xl min-w-[300px]" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
            onClick={e => e.stopPropagation()}>
            <p className="text-[13px] mb-2" style={{ color: 'var(--text-primary)' }}>{quickInput.msg}</p>
            <input id="quick-input-field" type="text" aria-label="输入内容" placeholder="输入内容..."
              className="w-full rounded-[4px] border px-3 py-2 text-[14px] outline-none mb-3"
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              onKeyDown={e => { if (e.key === 'Enter') quickInput.resolve((e.target as HTMLInputElement).value); if (e.key === 'Escape') quickInput.resolve(null); }} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => quickInput.resolve(null)}
                className="rounded-[4px] px-3 py-1.5 text-[13px]" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>取消</button>
              <button type="button" onClick={() => quickInput.resolve((document.getElementById('quick-input-field') as HTMLInputElement)?.value || '')}
                className="rounded-[4px] px-3 py-1.5 text-[13px]" style={{ background: 'var(--accent-blue)', color: 'var(--text-on-accent)' }}>确定</button>
            </div>
          </div>
        </div>
      )}

      {/* T2307: Edge type picker */}
      {edgePicker && (
        <div className="fixed z-50 inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}
          onClick={() => setEdgePicker(null)}>
          <div className="rounded-[8px] border p-4 shadow-xl" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
            onClick={e => e.stopPropagation()}>
            <p className="text-[13px] mb-2" style={{ color: 'var(--text-primary)' }}>选择连线类型</p>
            <div className="flex gap-2">
              {[{ type: 'related', label: '关联' }, { type: 'dependency', label: '依赖' }, { type: 'reference', label: '引用' }].map(opt => (
                <button key={opt.type} type="button"
                  onClick={() => confirmEdge(opt.type, opt.label)}
                  className="rounded-[4px] px-4 py-2 text-[13px] font-medium transition-opacity hover:opacity-80"
                  style={{ background: 'var(--accent-blue)', color: 'var(--text-on-accent)' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* T2307: Right-click context menu */}
      {ctxNode && ctxPos && (
        <div className="fixed z-50 rounded-[6px] border shadow-lg py-1 min-w-[140px]"
          style={{ left: ctxPos.x, top: ctxPos.y, background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
          <div className="px-3 py-1 text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            {getNodeData(ctxNode).label?.slice(0, 20)}
          </div>
          <div className="my-0.5 border-t" style={{ borderColor: 'var(--border-default)' }} />
          {ctxNode.type !== 'task' && (
            <button type="button" onClick={() => handleCtxConvert('task')}
              className="block w-full text-left px-3 py-1.5 text-[13px] hover:opacity-80"
              style={{ color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              转为任务
            </button>
          )}
          {ctxNode.type !== 'idea' && ctxNode.type !== 'text' && (
            <button type="button" onClick={() => handleCtxConvert('blog')}
              className="block w-full text-left px-3 py-1.5 text-[13px] hover:opacity-80"
              style={{ color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              转为博客
            </button>
          )}
          <button type="button" onClick={() => handleCtxConvert('note')}
            className="block w-full text-left px-3 py-1.5 text-[13px] hover:opacity-80"
            style={{ color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            转为便签
          </button>
        </div>
      )}
    </div>
  );
}
