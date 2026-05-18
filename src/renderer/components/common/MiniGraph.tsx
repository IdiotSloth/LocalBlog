import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force';
import type { GraphData, GraphNode as GNode } from '../../../shared/types';

const NODE_COLORS: Record<string, string> = {
  blog: 'var(--accent-blue)',
  knowledge: 'var(--accent-green)',
  tag: 'var(--text-secondary)',
  note: 'var(--text-muted)',
};

const NODE_RADIUS: Record<string, number> = { blog: 8, knowledge: 6, tag: 5, note: 5 };

type LayoutNode = GNode & { x: number; y: number };

export function MiniGraph({ userId }: { userId: number }) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([]);
  const navigate = useNavigate();

  const loadData = useCallback(() => {
    let aborted = false;
    setLoading(true);
    setError(null);
    window.api.graphGetData(userId, { maxNodes: 20 })
      .then((r) => {
        if (aborted || !r.success || !r.data) return;
        setData(r.data);
      })
      .catch((e) => { if (!aborted) { console.error('[MiniGraph]', e); setError('加载图谱失败'); } })
      .finally(() => { if (!aborted) setLoading(false); });
    return () => { aborted = true; };
  }, [userId]);

  useEffect(() => { const cleanup = loadData(); return cleanup; }, [loadData]);

  useEffect(() => {
    const u1 = window.api.onBlogRefresh(() => loadData());
    const u2 = window.api.onKbRefresh(() => loadData());
    const u3 = window.api.onNoteRefresh(() => loadData());
    return () => { u1(); u2(); u3(); };
  }, [loadData]);

  // D3 forceSimulation (D49) — replaces circular layout
  useEffect(() => {
    if (!data || data.nodes.length === 0) return;
    const nodes: LayoutNode[] = data.nodes.map((n) => ({ ...n, x: 100, y: 90 }));
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const links = data.edges
      .map((e) => ({ source: nodeMap.get(e.source), target: nodeMap.get(e.target) }))
      .filter((l) => l.source && l.target) as { source: LayoutNode; target: LayoutNode }[];

    const sim = forceSimulation<LayoutNode>(nodes)
      .force('link', forceLink<LayoutNode, { source: LayoutNode; target: LayoutNode }>(links).distance(60))
      .force('charge', forceManyBody().strength(-200))
      .force('center', forceCenter(100, 90))
      .force('collide', forceCollide<LayoutNode>(12))
      .stop();

    // Run cold to converge quickly
    sim.tick(120);
    setLayoutNodes(nodes.map((n) => ({ ...n, x: n.x, y: n.y })));
    return () => { sim.stop(); };
  }, [data]);

  if (loading) return <div className="flex items-center justify-center h-[180px] text-[12px]" style={{ color: 'var(--text-secondary)' }}>加载图谱...</div>;
  if (error) return <div className="flex items-center justify-center h-[180px] text-[12px]" style={{ color: 'var(--accent-red)' }}>{error}</div>;
  if (!data || data.nodes.length === 0) return <div className="flex items-center justify-center h-[180px] text-[12px]" style={{ color: 'var(--text-muted)' }}>暂无关系数据</div>;

  const nodeMap = new Map(layoutNodes.map((n) => [n.id, n]));

  return (
    <div className="flex justify-center">
      <svg width="200" height="180" viewBox="0 0 200 180" role="img" aria-label="知识关系图谱">
        {data.edges.map((e, i) => {
          const s = nodeMap.get(e.source);
          const t = nodeMap.get(e.target);
          if (!s || !t) return null;
          return (
            <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke="var(--border-default)" strokeWidth={0.6} opacity={0.5} />
          );
        })}
        {layoutNodes.map((n) => {
          const r = NODE_RADIUS[n.type] ?? 5;
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
              <circle cx={n.x} cy={n.y} r={isHovered ? r + 2 : r} fill={fill} opacity={isHovered ? 1 : 0.75} />
              {isHovered && (
                <text x={n.x} y={(n.y ?? 0) - 10} textAnchor="middle" fill="var(--text-primary)" fontSize="8" fontFamily="var(--font-body)">
                  {n.label.length > 6 ? n.label.slice(0, 6) + '…' : n.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}