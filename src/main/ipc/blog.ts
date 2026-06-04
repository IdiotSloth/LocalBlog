import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow, app, dialog, ipcMain, type WebContents } from 'electron';
import { getSharedBlogList } from '../../shared/handlers/blog-list';
import { IPC } from '../../shared/ipc-channels';
import { nowTimestamp } from '../../shared/datetime';
import { extractWikilinkRefs, extractWikilinkTitles } from '../../shared/wikilink';
import { dbAll, dbGet, dbRun } from '../db';
import { BlogService } from '../services/blog.service';

/** R206+R207+R219: Sync wikilink refs — scan [[...]] plain text, resolve to DB IDs, diff old vs new.
 *  Only manages refs originating from wikilinks; manual refs (ReferencePicker) are never touched.
 *  Wrapped in transaction (R207) so crash mid-way won't leave partial INSERT/DELETE.
 *  Exported for use by note/knowledge handlers (R219). */
export async function syncWikilinkRefs(sourceType: string, sourceId: number, newContent: string, userId: number, oldContent?: string): Promise<void> {
  // Dual scanner: HTML <a class="wiki-link"> tags + plain text [[...]] (R197+R206 fix)
  const newHtmlRefs = extractWikilinkRefs(newContent, sourceType, sourceId);
  const newTitles = extractWikilinkTitles(newContent);
  const newTextRefs = await resolveTitles(newTitles, sourceType, sourceId, userId);
  const newRefs = [...newHtmlRefs, ...newTextRefs];

  const oldHtmlRefs = oldContent ? extractWikilinkRefs(oldContent, sourceType, sourceId) : [];
  const oldTitles = oldContent ? extractWikilinkTitles(oldContent) : [];
  const oldTextRefs = oldContent ? await resolveTitles(oldTitles, sourceType, sourceId, userId) : [];
  const oldRefs = [...oldHtmlRefs, ...oldTextRefs];

  const newSet = new Set(newRefs.map((r) => `${r.targetType}:${r.targetId}`));
  const oldSet = new Set(oldRefs.map((r) => `${r.targetType}:${r.targetId}`));

  if (newRefs.length === 0 && oldRefs.length === 0) return;

  await dbRun('BEGIN');
  try {
    for (const r of newRefs) {
      if (!oldSet.has(`${r.targetType}:${r.targetId}`)) {
        await dbRun('INSERT OR IGNORE INTO refs (source_type, source_id, target_type, target_id) VALUES (?,?,?,?)', [
          r.sourceType, r.sourceId, r.targetType, r.targetId,
        ]);
      }
    }
    if (oldContent) {
      for (const r of oldRefs) {
        if (!newSet.has(`${r.targetType}:${r.targetId}`)) {
          await dbRun('DELETE FROM refs WHERE source_type = ? AND source_id = ? AND target_type = ? AND target_id = ?', [
            r.sourceType, r.sourceId, r.targetType, r.targetId,
          ]);
        }
      }
    }
    await dbRun('COMMIT');
  } catch (e) {
    await dbRun('ROLLBACK');
    throw e;
  }
}

/** Resolve [[title]] strings to (type, id) pairs by searching blogs/knowledge/notes. */
async function resolveTitles(titles: string[], sourceType: string, sourceId: number, userId: number): Promise<Array<{ sourceType: string; sourceId: number; targetType: string; targetId: number }>> {
  if (titles.length === 0) return [];
  const refs: Array<{ sourceType: string; sourceId: number; targetType: string; targetId: number }> = [];
  const placeholders = titles.map(() => '?').join(',');
  const blogs = await dbAll<{ id: number; title: string }>(
    `SELECT id, title FROM blogs WHERE title IN (${placeholders}) AND status = 'active' AND user_id = ?`,
    [...titles, userId],
  );
  for (const b of blogs) {
    refs.push({ sourceType, sourceId, targetType: 'blog', targetId: b.id });
  }

  const kfs = await dbAll<{ id: number; filename: string }>(
    `SELECT id, filename FROM knowledge_files WHERE filename IN (${placeholders}) AND status = 'active' AND user_id = ?`,
    [...titles, userId],
  );
  for (const k of kfs) {
    refs.push({ sourceType, sourceId, targetType: 'knowledge', targetId: k.id });
  }

  const notes = await dbAll<{ id: number; title: string }>(
    `SELECT id, title FROM notes WHERE title IN (${placeholders}) AND user_id = ?`,
    [...titles, userId],
  );
  for (const n of notes) {
    refs.push({ sourceType, sourceId, targetType: 'note', targetId: n.id });
  }
  return refs;
}

let blogRefreshTarget: WebContents | null = null;

export function setBlogRefreshTarget(wc: WebContents | null): void {
  blogRefreshTarget = wc;
}

export function registerBlogHandlers(): void {
  ipcMain.handle(
    IPC.BLOG_LIST,
    async (
      _event,
      filters: {
        userId: number;
        status?: string;
        tagId?: number;
        folderId?: number;
        query?: string;
        sortBy?: string;
        sortOrder?: string;
        offset?: number;
        limit?: number;
        excludeSeries?: boolean;
      },
    ) => {
      try {
        const result = await getSharedBlogList(
          (sql, params) => dbAll(sql, params),
          (sql, params) => dbGet(sql, params),
          filters,
        );
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(IPC.BLOG_GET, async (_event, blogId: number) => {
    try {
      const blog = await BlogService.getBlog(blogId);
      if (!blog) return { success: false, error: '博客不存在' };
      return { success: true, data: blog };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(
    IPC.BLOG_CREATE,
    async (_event, data: { userId: number; title: string; format: 'md' | 'html'; content: string; seriesId?: string; seriesName?: string }) => {
      try {
        const blog = await BlogService.createBlog(data.userId, data.title, data.format, data.content, data.seriesId, data.seriesName);
        if (data.content) await syncWikilinkRefs('blog', blog.id, data.content, data.userId);
        blogRefreshTarget?.send(IPC.EVT_BLOG_REFRESH);
        return { success: true, data: blog };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(IPC.BLOG_UPDATE, async (_event, data: { userId: number; blogId: number; title?: string; content?: string; seriesId?: string; seriesName?: string }) => {
    try {
      // R206: Read old content BEFORE update for safe wikilink diff
      let oldContent: string | undefined;
      if (data.content) {
        const old = await BlogService.getBlog(data.blogId);
        oldContent = old?.content;
      }
      await BlogService.updateBlog(data.userId, data.blogId, { title: data.title, content: data.content });
      // R356: Set series if provided
      if (data.seriesId !== undefined) {
        await BlogService.setBlogSeries(data.userId, data.blogId, data.seriesId || null, data.seriesName || null);
      }
      // R206: Pass both old and new content — only diffs wikilink-originated refs
      if (data.content) await syncWikilinkRefs('blog', data.blogId, data.content, data.userId, oldContent);
      blogRefreshTarget?.send(IPC.EVT_BLOG_REFRESH);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.BLOG_DELETE, async (_event, data: { userId: number; blogId: number }) => {
    try {
      await BlogService.deleteBlog(data.userId, data.blogId);
      // R208: Clean up all refs pointing to/from this blog
      await dbRun('DELETE FROM refs WHERE source_type = ? AND source_id = ?', ['blog', data.blogId]);
      await dbRun('DELETE FROM refs WHERE target_type = ? AND target_id = ?', ['blog', data.blogId]);
      blogRefreshTarget?.send(IPC.EVT_BLOG_REFRESH);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.BLOG_RESTORE, async (_event, data: { userId: number; blogId: number }) => {
    try {
      await BlogService.restoreBlog(data.userId, data.blogId);
      blogRefreshTarget?.send(IPC.EVT_BLOG_REFRESH);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.BLOG_EXPORT, async (_event, data: { blogIds: number[]; outputDir: string }) => {
    try {
      const count = await BlogService.exportBlogs(data.blogIds, data.outputDir);
      return { success: true, data: { exported: count } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(
    IPC.BLOG_IMPORT_MD,
    async (_event, data: { userId: number; filePaths?: string[]; contents?: { title: string; content: string }[] }) => {
      try {
        const blogs = await BlogService.importMarkdownFiles(data.userId, data.filePaths || [], data.contents || []);
        blogRefreshTarget?.send(IPC.EVT_BLOG_REFRESH);
        return { success: true, data: blogs };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(IPC.BLOG_SAVE_DRAFT, async (_event, data: { blogId: number; content: string }) => {
    try {
      await BlogService.saveDraft(data.blogId, data.content);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.BLOG_GET_HISTORY, async (_event, blogId: number) => {
    try {
      const drafts = await BlogService.getHistory(blogId);
      return { success: true, data: drafts };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.BLOG_ROLLBACK, async (_event, data: { userId: number; blogId: number; draftId: number }) => {
    try {
      await BlogService.rollback(data.userId, data.blogId, data.draftId);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // T2108: Set blog pinned state
  ipcMain.handle(IPC.BLOG_SET_PINNED, async (_event, data: { id: number; userId: number; isPinned: number }) => {
    try {
      await dbRun('UPDATE blogs SET is_pinned = ?, updated_at = ? WHERE id = ? AND user_id = ?', [data.isPinned, nowTimestamp(), data.id, data.userId]);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // T2108: Set blog color label
  ipcMain.handle(IPC.BLOG_SET_COLOR, async (_event, data: { id: number; userId: number; color: string | null }) => {
    try {
      await dbRun('UPDATE blogs SET color = ?, updated_at = ? WHERE id = ? AND user_id = ?', [data.color, nowTimestamp(), data.id, data.userId]);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.TAG_SET_BLOG, async (_event, data: { blogId: number; tagIds: number[] }) => {
    try {
      await BlogService.setBlogTags(data.blogId, data.tagIds);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.BLOG_LIST_ATTACHMENTS, async (_event, blogId: number) => {
    try {
      const list = await BlogService.listAttachments(blogId);
      return { success: true, data: list };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.BLOG_DELETE_ATTACHMENT, async (_event, data: { blogId: number; filename: string }) => {
    try {
      await BlogService.deleteAttachment(data.blogId, data.filename);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.BLOG_CLEANUP_ATTACHMENTS, async (_event, blogId: number) => {
    try {
      const cleaned = await BlogService.cleanupAttachments(blogId);
      return { success: true, data: { cleaned } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // Batch operations
  ipcMain.handle(IPC.BLOG_BATCH_DELETE, async (_event, data: { userId: number; blogIds: number[] }) => {
    try {
      for (const id of data.blogIds) {
        await BlogService.deleteBlog(data.userId, id);
        // R208: Clean refs for each deleted blog
        await dbRun('DELETE FROM refs WHERE source_type = ? AND source_id = ?', ['blog', id]);
        await dbRun('DELETE FROM refs WHERE target_type = ? AND target_id = ?', ['blog', id]);
      }
      blogRefreshTarget?.send(IPC.EVT_BLOG_REFRESH);
      return { success: true, data: { deleted: data.blogIds.length } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.BLOG_BATCH_TAG, async (_event, data: { blogIds: number[]; tagIds: number[] }) => {
    try {
      for (const id of data.blogIds) await BlogService.setBlogTags(id, data.tagIds);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // PDF Export — temp file approach to fix race condition + URL length limit
  ipcMain.handle(IPC.BLOG_EXPORT_PDF, async (_event, blogId: number) => {
    const tmpPath = path.join(app.getPath('temp'), `blog-export-${blogId}.html`);
    try {
      const blog = await BlogService.getBlog(blogId);
      if (!blog) return { success: false, error: '博客不存在' };

      const { filePath } = await dialog.showSaveDialog({
        defaultPath: `${blog.title.replace(/[<>:"/\\|?*]/g, '_')}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (!filePath) return { success: false, error: '已取消' };

      // Render markdown to HTML using markdown-it (html:false escapes any user HTML)
      let bodyHtml = blog.content || '';
      if (blog.format === 'md') {
        const MarkdownIt = (await import('markdown-it')).default;
        const md = new MarkdownIt({ html: false, linkify: true });
        bodyHtml = md.render(bodyHtml);
      } else {
        // R276: HTML format — strip script tags and event handlers before injecting
        bodyHtml = bodyHtml
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
          .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
      }

      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        :root {
          --text-primary: #2c2c2c; --text-secondary: #666; --text-muted: #999;
          --bg-primary: #fff; --bg-secondary: #f8f9fa; --bg-tertiary: #f0f2f5;
          --color-primary: #2563eb; --color-bg-card: #fff;
          --border-default: #e5e7eb; --accent-amber: #d97706; --accent-red: #dc2626;
          --color-text-primary: #2c2c2c; --color-text-secondary: #666; --color-text-muted: #999;
          --color-bg-base: #fff;
        }
        body{font-family:"Noto Serif SC","Microsoft YaHei",serif;max-width:680px;margin:40px auto;padding:0 20px;color:#2c2c2c;background:#fff;line-height:1.8}
        h1{font-size:28px;margin-top:0}h2{font-size:22px;margin-top:32px;border-bottom:1px solid #eee;padding-bottom:8px}
        h3{font-size:18px;margin-top:24px}h4{font-size:16px;margin-top:20px}p{margin:12px 0}
        pre{background:#f6f8fa;padding:16px;border-radius:6px;overflow-x:auto}
        code{font-family:"JetBrains Mono","Courier New",monospace;font-size:14px}pre code{font-size:13px}
        blockquote{border-left:3px solid #c0392b;padding:4px 16px;margin:16px 0;color:#555;background:#fdf8f8}
        img{max-width:100%;height:auto}
        table{border-collapse:collapse;width:100%;margin:16px 0}
        th,td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left}
        th{background:#f6f8fa;font-weight:600}
        ul,ol{padding-left:24px}li{margin:4px 0}a{color:#2563eb}
        hr{border:none;border-top:1px solid #e5e7eb;margin:24px 0}
        .footer{margin-top:48px;padding-top:16px;border-top:1px solid #eee;color:#aaa;font-size:12px}
      </style></head><body>
        <h1>${esc(blog.title)}</h1>
        <p style="color:#888;font-size:14px">${esc(blog.createdAt)}</p>
        ${bodyHtml}
        <div class="footer">由 Local Blog KB 导出</div>
      </body></html>`;

      fs.writeFileSync(tmpPath, html, 'utf-8');

      const win = new BrowserWindow({ show: false, width: 800, height: 1200 });
      // loadFile() internally awaits did-finish-load; Promise.race adds 10s safety net
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('PDF 渲染超时')), 10000));
      await Promise.race([win.loadFile(tmpPath), timeout]);

      const pdfTimeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('PDF 生成超时')), 30000));
      const pdfBuffer = await Promise.race([
        win.webContents.printToPDF({
          printBackground: true,
          landscape: false,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
        }),
        pdfTimeout,
      ]);
      fs.writeFileSync(filePath, pdfBuffer);
      win.close();

      return { success: true, data: { path: filePath } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    } finally {
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {
        /* best-effort cleanup, non-critical */
      }
    }
  });

  // Quick Note
  ipcMain.handle(IPC.BLOG_QUICK_CREATE, async (_event, data: { userId: number; title: string; content: string }) => {
    try {
      const blog = await BlogService.quickCreate(data.userId, data.title, data.content);
      if (data.content) await syncWikilinkRefs('blog', blog.id, data.content, data.userId);
      blogRefreshTarget?.send(IPC.EVT_BLOG_REFRESH);
      return { success: true, data: blog };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // Series
  ipcMain.handle(IPC.BLOG_SERIES_LIST, async (_event, userId: number) => {
    try {
      const list = await BlogService.listSeries(userId);
      return { success: true, data: list };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.BLOG_SERIES_GET, async (_event, seriesId: string) => {
    try {
      const blogs = await BlogService.getSeriesBlogs(seriesId);
      return { success: true, data: blogs };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(
    IPC.BLOG_SERIES_SET,
    async (_event, data: { userId: number; blogId: number; seriesId: string | null; seriesName: string | null }) => {
      try {
        await BlogService.setBlogSeries(data.userId, data.blogId, data.seriesId, data.seriesName);
        return { success: true };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );
  ipcMain.handle(
    IPC.BLOG_SERIES_RENAME,
    async (_event, data: { seriesId: string; newName: string; userId: number }) => {
      try {
        await BlogService.renameSeries(data.seriesId, data.newName, data.userId);
        return { success: true };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  // Word Export
  ipcMain.handle(IPC.BLOG_EXPORT_DOCX, async (_event, blogId: number) => {
    try {
      const blog = await BlogService.getBlog(blogId);
      if (!blog) return { success: false, error: '博客不存在' };

      const { filePath } = await dialog.showSaveDialog({
        defaultPath: `${blog.title.replace(/[<>:"/\\|?*]/g, '_')}.docx`,
        filters: [{ name: 'Word 文档', extensions: ['docx'] }],
      });
      if (!filePath) return { success: false, error: '已取消' };

      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');

      // Convert HTML to markdown if needed
      let mdContent = blog.content || '';
      if (blog.format === 'html') {
        const TurndownService = (await import('turndown')).default;
        mdContent = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' }).turndown(mdContent);
      }

      const lines = mdContent.split('\n');
      const children: any[] = [];

      // Title
      children.push(new Paragraph({ text: blog.title, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }));

      // Meta
      const metaParts: TextRun[] = [new TextRun({ text: `${blog.createdAt}`, size: 20, color: '888888' })];
      if (blog.tags?.length > 0) {
        metaParts.push(
          new TextRun({ text: `  ·  ${blog.tags.map((t: any) => t.name).join(', ')}`, size: 20, color: '888888' }),
        );
      }
      children.push(new Paragraph({ children: metaParts, spacing: { after: 400 } }));

      // Content blocks
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        if (line === undefined) { i++; continue; }
        if (line.startsWith('# ') && !line.startsWith('## ')) {
          children.push(
            new Paragraph({
              text: line.replace(/^# /, ''),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 120 },
            }),
          );
        } else if (line.startsWith('## ') && !line.startsWith('### ')) {
          children.push(
            new Paragraph({
              text: line.replace(/^## /, ''),
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 240, after: 100 },
            }),
          );
        } else if (line.startsWith('### ')) {
          children.push(
            new Paragraph({
              text: line.replace(/^### /, ''),
              heading: HeadingLevel.HEADING_4,
              spacing: { before: 200, after: 80 },
            }),
          );
        } else if (line.startsWith('```')) {
          // Code block
          const codeLines: string[] = [];
          i++;
          while (i < lines.length && lines[i] && !lines[i]!.startsWith('```')) {
            codeLines.push(lines[i]!);
            i++;
          }
          children.push(
            new Paragraph({
              children: [new TextRun({ text: codeLines.join('\n'), font: 'Courier New', size: 18 })],
              spacing: { before: 120, after: 120 },
              shading: { fill: 'F5F5F5' },
            }),
          );
        } else if (line.trim() === '') {
          children.push(new Paragraph({ spacing: { after: 80 } }));
        } else {
          // Strip inline markdown syntax
          const cleaned = line
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/~~(.+?)~~/g, '$1')
            .replace(/`(.+?)`/g, '$1')
            .replace(/\[(.+?)\]\(.+?\)/g, '$1');
          children.push(new Paragraph({ text: cleaned, spacing: { after: 60 } }));
        }
        i++;
      }

      // Footer
      const now = new Date().toISOString().substring(0, 10);
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `由 Local Blog KB 导出 · ${now}`, size: 18, color: 'AAAAAA' })],
          spacing: { before: 600 },
          alignment: AlignmentType.CENTER,
        }),
      );

      const doc = new Document({ sections: [{ children }] });
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(filePath, buffer);

      return { success: true, data: { path: filePath } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
