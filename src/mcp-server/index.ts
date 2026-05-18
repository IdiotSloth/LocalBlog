#!/usr/bin/env node
/** MCP Server — stdio transport (D55).
 *  Standalone CLI: reads JSON-RPC from stdin, writes to stdout.
 *  No Electron dependency. Uses MySQL via db module.
 *  Run: npm run mcp  or  node --loader ts-node/esm src/mcp-server/index.ts
 */

import { createInterface } from 'node:readline';

// Late-init DB (MySQL only — sql.js requires Electron env)
let dbReady = false;

async function initDb(): Promise<void> {
  try {
    const { initMySQL } = await import('../server/db');
    await initMySQL();
    dbReady = true;
    process.stderr.write('[mcp] MySQL initialized\n');
  } catch (err) {
    process.stderr.write(`[mcp] MySQL init failed: ${(err as Error).message}\n`);
    process.stderr.write('[mcp] Server must be running with MySQL on port 3456\n');
  }
}

async function handleMessage(msg: string): Promise<string> {
  try {
    const { method, params, id } = JSON.parse(msg);
    if (!dbReady) {
      return JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32000, message: 'Database not ready' } });
    }

    // Delegate to shared handler (same as Express route)
    const { dbAll } = await import('../server/db');

    switch (method) {
      case 'tools/list': {
        // Same tool definitions as Express route
        const tools = [
          { name: 'search', description: 'Search blogs and knowledge files', inputSchema: { type: 'object', properties: { query: { type: 'string' }, userId: { type: 'number' } } } },
          { name: 'list_blogs', description: 'List recent blogs', inputSchema: { type: 'object', properties: { userId: { type: 'number' }, limit: { type: 'number', default: 20 } } } },
          { name: 'list_knowledge', description: 'List knowledge files', inputSchema: { type: 'object', properties: { userId: { type: 'number' }, limit: { type: 'number', default: 20 } } } },
          { name: 'list_notes', description: 'List notes', inputSchema: { type: 'object', properties: { userId: { type: 'number' }, limit: { type: 'number', default: 20 } } } },
          { name: 'list_tags', description: 'List tags', inputSchema: { type: 'object', properties: { userId: { type: 'number' } } } },
          { name: 'get_stats', description: 'Get user statistics', inputSchema: { type: 'object', properties: { userId: { type: 'number' } } } },
          { name: 'get_refs', description: 'Get references for a source', inputSchema: { type: 'object', properties: { sourceType: { type: 'string' }, sourceId: { type: 'number' } } } },
        ];
        return JSON.stringify({ jsonrpc: '2.0', id, result: { tools } });
      }

      case 'tools/call': {
        const name = params?.name;
        const args = params?.arguments ?? {};
        let result: unknown;

        switch (name) {
          case 'search': {
            const q = `%${args.query}%`;
            const userId = args.userId as number;
            const blogs = await dbAll("SELECT id, title FROM blogs WHERE user_id = ? AND status = 'active' AND title LIKE ? LIMIT 10", [userId, q]);
            const kfs = await dbAll("SELECT id, filename FROM knowledge_files WHERE user_id = ? AND status = 'active' AND filename LIKE ? LIMIT 10", [userId, q]);
            result = { blogs: blogs.map((b: Record<string, unknown>) => ({ id: b.id, title: b.title })), knowledge: kfs.map((k: Record<string, unknown>) => ({ id: k.id, filename: k.filename })) };
            break;
          }
          case 'list_blogs': {
            const userId = args.userId as number;
            const limit = (args.limit as number) || 20;
            result = await dbAll("SELECT id, title, created_at FROM blogs WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT ?", [userId, limit]);
            break;
          }
          case 'list_knowledge': {
            const userId = args.userId as number;
            const limit = (args.limit as number) || 20;
            result = await dbAll("SELECT id, filename, file_type FROM knowledge_files WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT ?", [userId, limit]);
            break;
          }
          case 'list_notes': {
            const userId = args.userId as number;
            const limit = (args.limit as number) || 20;
            result = await dbAll('SELECT id, title, content, memo_type FROM notes WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?', [userId, limit]);
            break;
          }
          case 'list_tags': {
            const userId = args.userId as number;
            result = await dbAll('SELECT id, name FROM tags WHERE user_id = ? ORDER BY id DESC', [userId]);
            break;
          }
          case 'get_stats': {
            const userId = args.userId as number;
            const bc = await dbAll('SELECT COUNT(*) as c FROM blogs WHERE user_id = ? AND status = ?', [userId, 'active']);
            const kc = await dbAll('SELECT COUNT(*) as c FROM knowledge_files WHERE user_id = ? AND status = ?', [userId, 'active']);
            result = { blogCount: (bc[0] as Record<string, unknown>)?.c ?? 0, knowledgeCount: (kc[0] as Record<string, unknown>)?.c ?? 0 };
            break;
          }
          case 'get_refs': {
            const sourceType = args.sourceType as string;
            const sourceId = args.sourceId as number;
            result = await dbAll('SELECT * FROM refs WHERE source_type = ? AND source_id = ? ORDER BY created_at DESC LIMIT 50', [sourceType, sourceId]);
            break;
          }
          default:
            return JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${name}` } });
        }
        return JSON.stringify({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }] } });
      }

      default:
        return JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } });
    }
  } catch (err) {
    return JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: (err as Error).message } });
  }
}

async function main(): Promise<void> {
  await initDb();

  const rl = createInterface({ input: process.stdin, terminal: false });
  rl.on('line', async (line: string) => {
    try {
      const response = await handleMessage(line.trim());
      process.stdout.write(response + '\n');
    } catch (err) {
      process.stderr.write(`[mcp] Error: ${(err as Error).message}\n`);
    }
  });

  process.stderr.write('[mcp] MCP Server ready (stdio)\n');
}

main().catch((err) => {
  process.stderr.write(`[mcp] Fatal: ${(err as Error).message}\n`);
  process.exit(1);
});
