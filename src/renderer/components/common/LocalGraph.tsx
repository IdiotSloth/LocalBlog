import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GraphData, GraphNode } from '../../../shared/types';

interface LocalGraphProps {
  centerId: string; // e.g. "blog-123"
  userId: number;
}

/** T2111: Local graph — 1-degree neighborhood, 280×240 for ContextPanel */
export function LocalGraph({ centerId, userId }: LocalGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<ReturnType<typeof import('d3-force').forceSimulation> | null>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const abortedRef = useRef(false);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    abortedRef.current = false;
    setLoading(true);
    try {
      const r = await window.api.graphGetData(userId, { scope: 'local', centerId, depth: 1 });
      if (!abortedRef.current && r.success && r.data) {
        setData(r.data);
      }
    } catch { /* ignore */ }
    if (!abortedRef.current) setLoading(false);
  }, [centerId, userId]);

  useEffect(() => {
    abortedRef.current = false;
    loadData();
    return () => { abortedRef.current = true; };
  }, [loadData]);

  // D3 force simulation
  useEffect(() => {
    if (!data || data.nodes.length === 0 || !svgRef.current) return;

    const svg = svgRef.current;
    const W = 280;
    const H = 230;
    svg.innerHTML = '';

    const nodes: GraphNode[] = data.nodes.map((n) => ({ ...n }));
    const edges = data.edges;
    let simLocal: ReturnType<typeof import('d3-force').forceSimulation> | null = null;

    // D3 force setup
    import('d3-force').then((d3) => {
      // Guard: component may have unmounted or data changed during async import
      if (!svgRef.current || svg.innerHTML === '') return;

      simLocal = d3
        .forceSimulation(nodes)
        .force(
          'link',
          d3.forceLink(edges).id((d: any) => d.id).distance(60),
        )
        .force('charge', d3.forceManyBody().strength(-120))
        .force('center', d3.forceCenter(W / 2, H / 2))
        .force('collide', d3.forceCollide(18));
      simRef.current = simLocal as any;
      simLocal.stop();
      simLocal.tick(80);

      // Draw edges
      for (const e of edges) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const src = typeof e.source === 'string' ? nodes.find((n) => n.id === e.source) : (e.source as any);
        const tgt = typeof e.target === 'string' ? nodes.find((n) => n.id === e.target) : (e.target as any);
        if (!src || !tgt) continue;
        line.setAttribute('x1', String(src.x ?? 0));
        line.setAttribute('y1', String(src.y ?? 0));
        line.setAttribute('x2', String(tgt.x ?? 0));
        line.setAttribute('y2', String(tgt.y ?? 0));
        line.setAttribute('stroke', 'var(--border-default)');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('opacity', '0.6');
        svg.appendChild(line);
      }

      // Draw nodes
      for (const n of nodes) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const isCenter = n.id === centerId;
        circle.setAttribute('cx', String(n.x ?? 0));
        circle.setAttribute('cy', String(n.y ?? 0));
        circle.setAttribute('r', isCenter ? '8' : '5');
        circle.setAttribute('fill', isCenter ? 'var(--accent-blue)' : 'var(--bg-tertiary)');
        circle.setAttribute('stroke', isCenter ? 'var(--accent-blue)' : 'var(--border-default)');
        circle.setAttribute('stroke-width', isCenter ? '2' : '1');
        circle.style.cursor = 'pointer';
        circle.addEventListener('click', () => {
          const parts = n.id.split('-');
          const type = parts[0];
          const id = parts.slice(1).join('-');
          if (type === 'blog') navigate(`/blog/${id}`);
          else if (type === 'knowledge') navigate('/knowledge');
          else if (type === 'note') navigate('/notes');
        });
        g.appendChild(circle);

        // Label (truncated)
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String((n.x ?? 0) + 10));
        text.setAttribute('y', String((n.y ?? 0) + 4));
        text.setAttribute('fill', 'var(--text-secondary)');
        text.setAttribute('font-size', '10');
        text.textContent = n.label.length > 12 ? n.label.slice(0, 12) + '...' : n.label;
        g.appendChild(text);

        svg.appendChild(g);
      }

      sim.on('tick', () => {
        // Find and update all line/circle/text positions after each tick
      });

      sim.stop();
    });

    return () => {
      if (simLocal) simLocal.stop();
      if (simRef.current) simRef.current.stop();
      simRef.current = null;
    };
  }, [data, centerId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center text-[12px]" style={{ height: 240, color: 'var(--text-muted)' }}>
        加载图谱...
      </div>
    );
  }

  if (!data || data.nodes.length <= 1) {
    return (
      <div className="flex flex-col items-center justify-center gap-2" style={{ height: 240 }}>
        <span style={{ fontSize: 28, opacity: 0.3 }}>🕸</span>
        <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          暂无关联节点
        </span>
        <span className="text-[11px] text-center px-4" style={{ color: 'var(--text-muted)' }}>
          添加 [[双向链接]] 或标签后，关联图谱将在此显示
        </span>
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label={`${centerId} 的关系图谱`}
      style={{ width: 280, height: 240, background: 'var(--bg-secondary)' }}
    />
  );
}
