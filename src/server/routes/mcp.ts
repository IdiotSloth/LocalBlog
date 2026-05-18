/** MCP Server — HTTP transport via Express (D55).
 *  stdio mode lives in src/mcp-server/index.ts (separate entry point).
 *  Tools are shared between both transports via src/mcp-server/tools/.
 *
 *  POST /api/mcp/message — JSON-RPC 2.0
 *  Auth: JWT Cookie (same as all other routes)
 */

import { Router, type Request, type Response } from 'express';
import { type AuthRequest, requireAuth } from '../middleware/auth';
import { dbAll } from '../db';

const router = Router();
router.use(requireAuth);

// ---- Tool definitions ----

interface McpTool {
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown> };
}

const TOOLS: McpTool[] = [
  {
    name: 'search',
    description: 'Search blogs and knowledge files by query text',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Search query' }, userId: { type: 'number' } },
    },
  },
  {
    name: 'list_blogs',
    description: 'List recent blogs for a user',
    inputSchema: {
      type: 'object',
      properties: { userId: { type: 'number' }, limit: { type: 'number', default: 20 } },
    },
  },
  {
    name: 'list_knowledge',
    description: 'List knowledge files for a user',
    inputSchema: {
      type: 'object',
      properties: { userId: { type: 'number' }, limit: { type: 'number', default: 20 } },
    },
  },
  {
    name: 'get_stats',
    description: 'Get user statistics (blog count, word count, tags, etc.)',
    inputSchema: {
      type: 'object',
      properties: { userId: { type: 'number' } },
    },
  },
  {
    name: 'list_notes',
    description: 'List notes for a user',
    inputSchema: {
      type: 'object',
      properties: { userId: { type: 'number' }, memoType: { type: 'string' }, limit: { type: 'number', default: 20 } },
    },
  },
  {
    name: 'list_tags',
    description: 'List tags for a user',
    inputSchema: {
      type: 'object',
      properties: { userId: { type: 'number' } },
    },
  },
  {
    name: 'get_refs',
    description: 'Get references (wikilinks) for a source',
    inputSchema: {
      type: 'object',
      properties: { sourceType: { type: 'string' }, sourceId: { type: 'number' } },
    },
  },
];

// ---- Tool handlers ----

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search': {
      const q = `%${args.query}%`;
      const userId = args.userId as number;
      const blogs = await dbAll<{ id: number; title: string }>(
        "SELECT id, title FROM blogs WHERE user_id = ? AND status = 'active' AND title LIKE ? LIMIT 10",
        [userId, q],
      );
      const kfs = await dbAll<{ id: number; filename: string }>(
        "SELECT id, filename FROM knowledge_files WHERE user_id = ? AND status = 'active' AND filename LIKE ? LIMIT 10",
        [userId, q],
      );
      return {
        blogs: blogs.map((b: { id: number; title: string }) => ({ id: b.id, title: b.title })),
        knowledge: kfs.map((k: { id: number; filename: string }) => ({ id: k.id, filename: k.filename })),
      };
    }
    case 'list_blogs': {
      const userId = args.userId as number;
      const limit = (args.limit as number) || 20;
      return dbAll<{ id: number; title: string; created_at: string }>(
        "SELECT id, title, created_at FROM blogs WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT ?",
        [userId, limit],
      );
    }
    case 'list_knowledge': {
      const userId = args.userId as number;
      const limit = (args.limit as number) || 20;
      return dbAll<{ id: number; filename: string; file_type: string }>(
        "SELECT id, filename, file_type FROM knowledge_files WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT ?",
        [userId, limit],
      );
    }
    case 'get_stats': {
      const userId = args.userId as number;
      const bc = await dbAll<{ c: number }>('SELECT COUNT(*) as c FROM blogs WHERE user_id = ? AND status = ?', [userId, 'active']);
      const kc = await dbAll<{ c: number }>('SELECT COUNT(*) as c FROM knowledge_files WHERE user_id = ? AND status = ?', [userId, 'active']);
      const words = await dbAll<{ total: number }>("SELECT SUM(LENGTH(content)) as total FROM blogs WHERE user_id = ? AND status = 'active'", [userId]);
      return { blogCount: bc[0]?.c ?? 0, knowledgeCount: kc[0]?.c ?? 0, totalChars: words[0]?.total ?? 0 };
    }
    case 'list_notes': {
      const userId = args.userId as number;
      const memoType = args.memoType as string | undefined;
      const limit = (args.limit as number) || 20;
      let sql = 'SELECT id, title, content, memo_type, due_date, created_at FROM notes WHERE user_id = ?';
      const params: unknown[] = [userId];
      if (memoType) { sql += ' AND memo_type = ?'; params.push(memoType); }
      sql += ' ORDER BY updated_at DESC LIMIT ?'; params.push(limit);
      return dbAll(sql, params);
    }
    case 'list_tags': {
      const userId = args.userId as number;
      return dbAll('SELECT id, name, description FROM tags WHERE user_id = ? ORDER BY id DESC', [userId]);
    }
    case 'get_refs': {
      const sourceType = args.sourceType as string;
      const sourceId = args.sourceId as number;
      return dbAll(
        'SELECT * FROM refs WHERE source_type = ? AND source_id = ? ORDER BY created_at DESC LIMIT 50',
        [sourceType, sourceId],
      );
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ---- MCP endpoint ----

router.post('/message', async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId;
  if (!userId) return res.status(401).json({ success: false, error: '请先登录' });

  try {
    const { method, params, id } = req.body as {
      method: string;
      params?: { name?: string; arguments?: Record<string, unknown> };
      id?: string | number;
    };

    switch (method) {
      case 'tools/list':
        return res.json({ jsonrpc: '2.0', id, result: { tools: TOOLS } });

      case 'tools/call': {
        if (!params?.name) return res.json({ jsonrpc: '2.0', id, error: { code: -32602, message: 'Missing tool name' } });
        const args = { ...(params.arguments ?? {}), userId: userId as number };
        const result = await handleToolCall(params.name, args);
        return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }] } });
      }

      default:
        return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } });
    }
  } catch (err) {
    return res.json({ jsonrpc: '2.0', id: (req.body as Record<string, unknown>).id, error: { code: -32603, message: (err as Error).message } });
  }
});

export default router;
