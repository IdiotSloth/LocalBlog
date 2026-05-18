import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import type { GraphData, GraphEdge, GraphFilter, GraphNode } from '../../shared/types';
import { dbAll } from '../db';

export function registerGraphHandlers(): void {
  ipcMain.handle(IPC.GRAPH_GET_DATA, async (_event, userId: number, filter?: GraphFilter) => {
    try {
      const maxNodes = filter?.maxNodes ?? 100;
      const types = filter?.types ?? ['blog', 'knowledge', 'tag', 'note'];

      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];

      // ---- Blog nodes ----
      if (types.includes('blog')) {
        const blogs = await dbAll<{ id: number; title: string }>(
          "SELECT id, title FROM blogs WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT ?",
          [userId, maxNodes],
        );
        for (const b of blogs) {
          nodes.push({ id: `blog-${b.id}`, label: b.title, type: 'blog' });
        }
      }

      // ---- Knowledge nodes ----
      if (types.includes('knowledge')) {
        const kfs = await dbAll<{ id: number; filename: string }>(
          "SELECT id, filename FROM knowledge_files WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT ?",
          [userId, maxNodes],
        );
        for (const k of kfs) {
          nodes.push({ id: `knowledge-${k.id}`, label: k.filename, type: 'knowledge' });
        }
      }

      // ---- Note nodes ----
      if (types.includes('note')) {
        const notes = await dbAll<{ id: number; title: string }>(
          'SELECT id, title FROM notes WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?',
          [userId, maxNodes],
        );
        for (const n of notes) {
          nodes.push({ id: `note-${n.id}`, label: n.title || '(便签)', type: 'note' });
        }
      }

      // ---- Tag nodes + tag→blog edges (R181: user_id filtered via JOIN) ----
      if (types.includes('tag')) {
        const tags = await dbAll<{ id: number; name: string }>(
          'SELECT id, name FROM tags WHERE user_id = ? ORDER BY id DESC LIMIT ?',
          [userId, maxNodes],
        );
        for (const t of tags) {
          nodes.push({ id: `tag-${t.id}`, label: `#${t.name}`, type: 'tag' });
        }

        // Tag→Blog edges
        const btEdges = await dbAll<{ blog_id: number; tag_id: number }>(
          'SELECT bt.blog_id, bt.tag_id FROM blog_tags bt JOIN blogs b ON b.id = bt.blog_id WHERE b.user_id = ? ORDER BY bt.blog_id DESC LIMIT ?',
          [userId, maxNodes * 3],
        );
        for (const e of btEdges) {
          edges.push({ source: `blog-${e.blog_id}`, target: `tag-${e.tag_id}`, type: 'tag' });
        }

        // Tag→Knowledge edges
        const ktEdges = await dbAll<{ file_id: number; tag_id: number }>(
          'SELECT kft.file_id, kft.tag_id FROM knowledge_file_tags kft JOIN knowledge_files kf ON kf.id = kft.file_id WHERE kf.user_id = ? ORDER BY kft.file_id DESC LIMIT ?',
          [userId, maxNodes * 3],
        );
        for (const e of ktEdges) {
          edges.push({ source: `knowledge-${e.file_id}`, target: `tag-${e.tag_id}`, type: 'tag' });
        }
      }

      // ---- Ref edges (R181: user_id via JOIN on source tables) ----
      // refs table has no user_id, but we filter by source_type + source_id belonging to this user
      const refRows = await dbAll<{ source_type: string; source_id: number; target_type: string; target_id: number }>(
        `SELECT r.source_type, r.source_id, r.target_type, r.target_id
         FROM refs r
         LEFT JOIN blogs b ON r.source_type = 'blog' AND r.source_id = b.id AND b.user_id = ?
         LEFT JOIN knowledge_files kf ON r.source_type = 'knowledge' AND r.source_id = kf.id AND kf.user_id = ?
         LEFT JOIN notes n ON r.source_type = 'note' AND r.source_id = n.id AND n.user_id = ?
         WHERE (b.id IS NOT NULL OR kf.id IS NOT NULL OR n.id IS NOT NULL)
         ORDER BY r.created_at DESC LIMIT ?`,
        [userId, userId, userId, maxNodes * 5],
      );
      for (const r of refRows) {
        edges.push({
          source: `${r.source_type}-${r.source_id}`,
          target: `${r.target_type}-${r.target_id}`,
          type: 'ref',
        });
      }

      const data: GraphData = { nodes, edges };
      return { success: true, data };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
