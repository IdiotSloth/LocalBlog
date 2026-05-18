import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force';
import type { GraphData, GraphFilter, GraphNode as GNode, GraphNodeType } from '../../../shared/types';
import { useAuthStore } from '../../stores/auth-store';

const NODE_COLORS: Record<string, string> = {
  blog: 'var(--accent-blue)',
  knowledge: 'var(--accent-green)',
  tag: 'var(--text-secondary)',
  note: 'var(--text-muted)',
};

const NODE_RADIUS: Record<string, number> = { blog: 10, knowledge: 7, tag: 6, note: 6 };
const ALL_TYPES: GraphNodeType[] = ['blog', 'knowledge', 'tag', 'note'];

type LayoutNode = GNode & { x: number; y: number; vx: number; vy: number };

export function GraphPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<GraphFilter>({ types: ALL_TYPES, maxNodes: 50 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const r = await window.api.graphGetData(user.id, filter);
      if (r.success && r.data) setData(r.data);
    } catch (e) {
      console.error('[GraphPage]', e);
      setError('加载图谱失败');
    } finally {
      setLoading(false);
    }
  }, [user, filter]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const u1 = window.api.onBlogRefresh(() => loadData());
    const u2 = window.api.onKbRefresh(() => loadData());
    const u3 = window.api.onNoteRefresh(() => loadData());
    return () => { u1(); u2(); u3(); };
  }, [loadData]);

  const toggleType = (t: GraphNodeType) => {
    setFilter((f) => {
      const types = f.types ?? ALL_TYPES;
      const next = types.includes(t) ? types.filter((x) => x !== t) : [...types, t];
      return { ...f, types: next.length > 0 ? next : ALL_TYPES };
    });
  };

  // D3 forceSimulation (D49)
  const SVGW = 800, SVGH = 600;
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([]);

  useEffect(() => {
    if (!data || data.nodes.length === 0) return;
    const nodes: LayoutNode[] = data.nodes.map((n) => ({
      ...n, x: SVGW / 2 + (Math.random() - 0.5) * 60, y: SVGH / 2 + (Math.random() - 0.5) * 60, vx: 0, vy: 0,
    }));
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const links = data.edges
      .map((e) => ({ source: nodeMap.get(e.source), target: nodeMap.get(e.target) }))
      .filter((l) => l.source && l.target) as { source: LayoutNode; target: LayoutNode }[];

    const sim = forceSimulation<LayoutNode>(nodes)
      .force('link', forceLink<LayoutNode, { source: LayoutNode; target: LayoutNode }>(links).distance(80))
      .force('charge', forceManyBody().strength(-300))
      .force('center', forceCenter(SVGW / 2, SVGH / 2))
      .force('collide', forceCollide<LayoutNode>(16))
      .stop();

    sim.tick(200);
    setLayoutNodes(nodes.map((n) => ({ ...n, x: n.x, y: n.y, vx: 0, vy: 0 })));
    return () => { sim.stop(); };
  }, [data]);

  const nodeMap = useMemo(() => new Map(layoutNodes.map((n) => [n.id, n])), [layoutNodes]);
  const hoveredNode = hovered ? nodeMap.get(hovered) : null;

  const typeCounts = data ? {
    blog: data.nodes.filter((n) => n.type === 'blog').length,
    knowledge: data.nodes.filter((n) => n.type === 'knowledge').length,
    tag: data.nodes.filter((n) => n.type === 'tag').length,
    note: data.nodes.filter((n) => n.type === 'note').length,
  } : { blog: 0, knowledge: 0, tag: 0, note: 0 };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey) {
      setZoom((z) => Math.max(0.3, Math.min(3, z + (e.deltaY > 0 ? -0.15 : 0.15))));
    } else {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'svg') {
      setDragging(true);
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan((p) => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
  };
  const handleMouseUp = () => setDragging(false);

  return (
    <div className="flex flex-col h-full" style={{ maxWidth: 'var(--content-max)', margin: '0 auto', width: '100%' }}>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold" style={{ color: 'var(--text-primary)' }}>关系图谱</h1>
        <p className="mt-1 text-[14px]" style={{ color: 'var(--text-secondary)' }}>博客、知识库、标签和便签之间的关联关系</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {ALL_TYPES.map((t) => (
          <button key={t} type="button" onClick={() => toggleType(t)}
            className="rounded-[6px] border px-3 py-1.5 text-[12px] font-medium transition-all"
            style={{
              background: (filter.types ?? ALL_TYPES).includes(t) ? NODE_COLORS[t] : 'transparent',
              borderColor: NODE_COLORS[t],
              color: (filter.types ?? ALL_TYPES).includes(t) ? '#fff' : NODE_COLORS[t],
              opacity: (filter.types ?? ALL_TYPES).includes(t) ? 1 : 0.5,
            }}>
            {t === 'blog' ? `博客 (${typeCounts.blog})` :
             t === 'knowledge' ? `知识库 (${typeCounts.knowledge})` :
             t === 'tag' ? `标签 (${typeCounts.tag})` : `便签 (${typeCounts.note})`}
          </button>
        ))}
        <button type="button" onClick={loadData}
          className="rounded-[6px] border px-3 py-1.5 text-[12px] transition-all hover:bg-[var(--bg-tertiary)]"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'transparent' }}>
          刷新
        </button>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>滚轮缩放 · 拖拽平移 · 悬停查看</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1" style={{ color: 'var(--text-secondary)' }}>加载图谱数据...</div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <p style={{ color: 'var(--accent-red)' }}>{error}</p>
          <button type="button" onClick={loadData} className="text-[13px] hover:underline"
            style={{ color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>重试</button>
        </div>
      ) : !data || data.nodes.length === 0 ? (
        <div className="flex items-center justify-center flex-1" style={{ color: 'var(--text-muted)' }}>
          暂无关系数据 — 创建博客和知识库文件后，图谱将在此显示
        </div>
      ) : (
        <div className="flex-1 rounded-[12px] border overflow-hidden"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
          <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${SVGW} ${SVGH}`}
            role="img" aria-label="知识关系图谱 — 展示博客、知识库、标签和便签之间的关联"
            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {data.edges.map((e, i) => {
                const s = nodeMap.get(e.source);
                const t = nodeMap.get(e.target);
                if (!s || !t) return null;
                const isHoveredEdge = hovered === e.source || hovered === e.target;
                return (
                  <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                    stroke="var(--border-default)"
                    strokeWidth={isHoveredEdge ? 2 : 0.8}
                    opacity={isHoveredEdge ? 0.7 : 0.35} />
                );
              })}
              {layoutNodes.map((n) => {
                const r = NODE_RADIUS[n.type] ?? 6;
                const fill = NODE_COLORS[n.type] ?? 'var(--text-secondary)';
                const isHovered = hovered === n.id;
                return (
                  <g key={n.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)}
                    onClick={() => {
                      const numId = n.id.replace(/^(blog|knowledge|note|tag)-/, '');
                      if (n.type === 'blog') navigate(`/blog/${numId}`);
                      else if (n.type === 'knowledge') navigate('/knowledge');
                      else if (n.type === 'note') navigate('/notes');
                    }}>
                    <circle cx={n.x} cy={n.y} r={isHovered ? r + 3 : r}
                      fill={fill} opacity={isHovered ? 1 : 0.7}
                      stroke={isHovered ? 'var(--text-primary)' : 'none'} strokeWidth={1.5} />
                    <text x={n.x} y={(n.y ?? 0) - r - 5} textAnchor="middle"
                      fill="var(--text-primary)" fontSize={isHovered ? 11 : 9}
                      fontFamily="var(--font-body)" style={{ pointerEvents: 'none' }}>
                      {n.label.length > 12 ? n.label.slice(0, 12) + '…' : n.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      )}

      {hoveredNode && (
        <div className="mt-3 rounded-[8px] border p-3"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
          <span className="inline-block rounded-[3px] px-2 py-0.5 text-[11px] font-medium mr-2"
            style={{ background: NODE_COLORS[hoveredNode.type], color: '#fff' }}>
            {{ blog: '博客', knowledge: '知识库', tag: '标签', note: '便签' }[hoveredNode.type]}
          </span>
          <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{hoveredNode.label}</span>
          <span className="ml-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>ID: {hoveredNode.id}</span>
        </div>
      )}
    </div>
  );
}
