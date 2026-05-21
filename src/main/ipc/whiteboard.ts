import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { dbAll, dbGet, dbRun } from '../db';
import { nowMySQL } from '../../shared/datetime';

export function registerWhiteboardHandlers(): void {
  ipcMain.handle(IPC.WHITEBOARD_GET, async (_event, userId: number) => {
    try {
      let wb = await dbGet<{ id: number; title: string; description: string; created_at: string; updated_at: string }>(
        'SELECT * FROM whiteboards WHERE user_id = ? LIMIT 1', [userId],
      );
      if (!wb) {
        const now = nowMySQL();
        await dbRun('INSERT INTO whiteboards (user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
          [userId, '我的白板', now, now]);
        wb = await dbGet<{ id: number; title: string; description: string; created_at: string; updated_at: string }>(
          'SELECT * FROM whiteboards WHERE user_id = ? LIMIT 1', [userId],
        );
      }
      return { success: true, data: wb ? { id: wb.id, title: wb.title, description: wb.description || '', createdAt: wb.created_at, updatedAt: wb.updated_at } : null };
    } catch (err) { return { success: false, error: (err as Error).message }; }
  });

  // R298: Nodes — filtered and guarded by user_id
  ipcMain.handle(IPC.WHITEBOARD_NODES, async (_event, data: { whiteboardId: number; userId: number }) => {
    try {
      const wb = await dbGet<{ id: number }>('SELECT id FROM whiteboards WHERE id = ? AND user_id = ?', [data.whiteboardId, data.userId]);
      if (!wb) return { success: false, error: '无权访问' };
      const rows = await dbAll<any>('SELECT * FROM whiteboard_nodes WHERE whiteboard_id = ? AND user_id = ? ORDER BY created_at', [data.whiteboardId, data.userId]);
      return { success: true, data: rows.map(mapNode) };
    } catch (err) { return { success: false, error: (err as Error).message }; }
  });

  ipcMain.handle(IPC.WHITEBOARD_NODE_CREATE, async (_event, data: { whiteboardId: number; userId: number; nodeType: string; title: string; x: number; y: number; color?: string }) => {
    try {
      const wb = await dbGet<{ id: number }>('SELECT id FROM whiteboards WHERE id = ? AND user_id = ?', [data.whiteboardId, data.userId]);
      if (!wb) return { success: false, error: '无权访问' };
      const now = nowMySQL();
      await dbRun('INSERT INTO whiteboard_nodes (whiteboard_id, user_id, node_type, title, x, y, color, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
        [data.whiteboardId, data.userId, data.nodeType, data.title, data.x, data.y, data.color || 'blue', now, now]);
      const row = await dbGet<any>('SELECT last_insert_rowid() as id');
      return { success: true, data: { id: row?.id ?? 0 } };
    } catch (err) { return { success: false, error: (err as Error).message }; }
  });

  ipcMain.handle(IPC.WHITEBOARD_NODE_UPDATE, async (_event, data: { id: number; userId: number; title?: string; x?: number; y?: number; taskStatus?: string; color?: string; summary?: string }) => {
    try {
      const node = await dbGet<{ id: number }>('SELECT id FROM whiteboard_nodes WHERE id = ? AND user_id = ?', [data.id, data.userId]);
      if (!node) return { success: false, error: '无权访问' };
      const now = nowMySQL();
      const sets: string[] = ['updated_at = ?'];
      const params: unknown[] = [now];
      if (data.title !== undefined) { sets.push('title = ?'); params.push(data.title); }
      if (data.x !== undefined) { sets.push('x = ?'); params.push(data.x); }
      if (data.y !== undefined) { sets.push('y = ?'); params.push(data.y); }
      if (data.taskStatus !== undefined) { sets.push('task_status = ?'); params.push(data.taskStatus); }
      if (data.color !== undefined) { sets.push('color = ?'); params.push(data.color); }
      if (data.summary !== undefined) { sets.push('summary = ?'); params.push(data.summary); }
      params.push(data.id);
      await dbRun(`UPDATE whiteboard_nodes SET ${sets.join(', ')} WHERE id = ?`, params);
      return { success: true };
    } catch (err) { return { success: false, error: (err as Error).message }; }
  });

  ipcMain.handle(IPC.WHITEBOARD_NODE_DELETE, async (_event, data: { nodeId: number; userId: number }) => {
    try {
      const node = await dbGet<{ id: number }>('SELECT id FROM whiteboard_nodes WHERE id = ? AND user_id = ?', [data.nodeId, data.userId]);
      if (!node) return { success: false, error: '无权访问' };
      await dbRun('DELETE FROM whiteboard_nodes WHERE id = ?', [data.nodeId]);
      return { success: true };
    } catch (err) { return { success: false, error: (err as Error).message }; }
  });

  // R298: Edges — guarded by whiteboard user_id
  ipcMain.handle(IPC.WHITEBOARD_EDGES, async (_event, data: { whiteboardId: number; userId: number }) => {
    try {
      const wb = await dbGet<{ id: number }>('SELECT id FROM whiteboards WHERE id = ? AND user_id = ?', [data.whiteboardId, data.userId]);
      if (!wb) return { success: false, error: '无权访问' };
      const rows = await dbAll<any>('SELECT * FROM whiteboard_edges WHERE whiteboard_id = ?', [data.whiteboardId]);
      return { success: true, data: rows.map((r: any) => ({ id: r.id, sourceNodeId: r.source_node_id, targetNodeId: r.target_node_id, edgeType: r.edge_type, label: r.label || '' })) };
    } catch (err) { return { success: false, error: (err as Error).message }; }
  });

  ipcMain.handle(IPC.WHITEBOARD_EDGE_CREATE, async (_event, data: { whiteboardId: number; userId: number; sourceNodeId: number; targetNodeId: number; label?: string }) => {
    try {
      const wb = await dbGet<{ id: number }>('SELECT id FROM whiteboards WHERE id = ? AND user_id = ?', [data.whiteboardId, data.userId]);
      if (!wb) return { success: false, error: '无权访问' };
      const now = nowMySQL();
      await dbRun('INSERT INTO whiteboard_edges (whiteboard_id, source_node_id, target_node_id, label, created_at) VALUES (?,?,?,?,?)',
        [data.whiteboardId, data.sourceNodeId, data.targetNodeId, data.label || '', now]);
      const row = await dbGet<any>('SELECT last_insert_rowid() as id');
      return { success: true, data: { id: row?.id ?? 0 } };
    } catch (err) { return { success: false, error: (err as Error).message }; }
  });

  ipcMain.handle(IPC.WHITEBOARD_EDGE_DELETE, async (_event, data: { edgeId: number; userId: number; whiteboardId: number }) => {
    try {
      const wb = await dbGet<{ id: number }>('SELECT id FROM whiteboards WHERE id = ? AND user_id = ?', [data.whiteboardId, data.userId]);
      if (!wb) return { success: false, error: '无权访问' };
      await dbRun('DELETE FROM whiteboard_edges WHERE id = ?', [data.edgeId]);
      return { success: true };
    } catch (err) { return { success: false, error: (err as Error).message }; }
  });
}

function mapNode(r: any) {
  return {
    id: r.id, whiteboardId: r.whiteboard_id, nodeType: r.node_type,
    refType: r.ref_type || null, refId: r.ref_id || null,
    title: r.title || '', summary: r.summary || '', color: r.color || 'blue',
    taskStatus: r.task_status || 'todo', x: r.x, y: r.y,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
