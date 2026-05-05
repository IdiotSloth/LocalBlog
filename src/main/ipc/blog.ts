import { BrowserWindow, app, dialog, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { IPC } from '../../shared/ipc-channels';
import { BlogService } from '../services/blog.service';
import { getSharedBlogList } from '../../shared/handlers/blog-list';
import { dbAll, dbGet } from '../db';

export function registerBlogHandlers(): void {
  ipcMain.handle(IPC.BLOG_LIST, async (_event, filters: {
    userId: number; status?: string; tagId?: number; folderId?: number; query?: string;
    sortBy?: string; sortOrder?: string; offset?: number; limit?: number;
  }) => {
    try {
      const result = await getSharedBlogList(
        (sql, params) => dbAll(sql, params),
        (sql, params) => dbGet(sql, params),
        filters,
      );
      return { success: true, data: result };
    } catch (err) { return { success: false, error: (err as Error).message }; }
  });

  ipcMain.handle(IPC.BLOG_GET, async (_event, blogId: number) => {
    try {
      const blog = await BlogService.getBlog(blogId);
      if (!blog) return { success: false, error: '博客不存在' };
      return { success: true, data: blog };
    } catch (err) { return { success: false, error: (err as Error).message }; }
  });

  ipcMain.handle(IPC.BLOG_CREATE, async (_event, data: { userId: number; title: string; format: 'md' | 'html'; content: string }) => {
    try {
      const blog = await BlogService.createBlog(data.userId, data.title, data.format, data.content);
      return { success: true, data: blog };
    } catch (err) { return { success: false, error: (err as Error).message }; }
  });

  ipcMain.handle(IPC.BLOG_UPDATE, async (_event, data: { blogId: number; title?: string; content?: string }) => {
    try {
      await BlogService.updateBlog(data.blogId, { title: data.title, content: data.content });
      return { success: true };
    } catch (err) { return { success: false, error: (err as Error).message }; }
  });

  ipcMain.handle(IPC.BLOG_DELETE, async (_event, blogId: number) => {
    try { await BlogService.deleteBlog(blogId); return { success: true }; }
    catch (err) { return { success: false, error: (err as Error).message }; }
  });

  ipcMain.handle(IPC.BLOG_RESTORE, async (_event, blogId: number) => {
    try { await BlogService.restoreBlog(blogId); return { success: true }; }
    catch (err) { return { success: false, error: (err as Error).message }; }
  });

  ipcMain.handle(IPC.BLOG_EXPORT, async (_event, data: { blogIds: number[]; outputDir: string }) => {
    try {
      const count = await BlogService.exportBlogs(data.blogIds, data.outputDir);
      return { success: true, data: { exported: count } };
    } catch (err) { return { success: false, error: (err as Error).message }; }
  });

  ipcMain.handle(IPC.BLOG_IMPORT_MD, async (_event, data: { userId: number; filePaths?: string[]; contents?: { title: string; content: string }[] }) => {
    try {
      const blogs = await BlogService.importMarkdownFiles(data.userId, data.filePaths || [], data.contents || []);
      return { success: true, data: blogs };
    } catch (err) { return { success: false, error: (err as Error).message }; }
  });

  ipcMain.handle(IPC.BLOG_SAVE_DRAFT, async (_event, data: { blogId: number; content: string }) => {
    try { await BlogService.saveDraft(data.blogId, data.content); return { success: true }; }
    catch (err) { return { success: false, error: (err as Error).message }; }
  });

  ipcMain.handle(IPC.BLOG_GET_HISTORY, async (_event, blogId: number) => {
    try {
      const drafts = await BlogService.getHistory(blogId);
      return { success: true, data: drafts };
    } catch (err) { return { success: false, error: (err as Error).message }; }
  });

  ipcMain.handle(IPC.BLOG_ROLLBACK, async (_event, data: { blogId: number; draftId: number }) => {
    try { await BlogService.rollback(data.blogId, data.draftId); return { success: true }; }
    catch (err) { return { success: false, error: (err as Error).message }; }
  });

  ipcMain.handle(IPC.TAG_SET_BLOG, async (_event, data: { blogId: number; tagIds: number[] }) => {
    try { await BlogService.setBlogTags(data.blogId, data.tagIds); return { success: true }; }
    catch (err) { return { success: false, error: (err as Error).message }; }
  });

  ipcMain.handle(IPC.BLOG_LIST_ATTACHMENTS, async (_event, blogId: number) => {
    try { const list = await BlogService.listAttachments(blogId); return { success: true, data: list }; }
    catch (err) { return { success: false, error: (err as Error).message }; }
  });
  ipcMain.handle(IPC.BLOG_DELETE_ATTACHMENT, async (_event, data: { blogId: number; filename: string }) => {
    try { await BlogService.deleteAttachment(data.blogId, data.filename); return { success: true }; }
    catch (err) { return { success: false, error: (err as Error).message }; }
  });
  ipcMain.handle(IPC.BLOG_CLEANUP_ATTACHMENTS, async (_event, blogId: number) => {
    try { const cleaned = await BlogService.cleanupAttachments(blogId); return { success: true, data: { cleaned } }; }
    catch (err) { return { success: false, error: (err as Error).message }; }
  });

  // Batch operations
  ipcMain.handle(IPC.BLOG_BATCH_DELETE, async (_event, blogIds: number[]) => {
    try { for (const id of blogIds) await BlogService.deleteBlog(id); return { success: true, data: { deleted: blogIds.length } }; }
    catch (err) { return { success: false, error: (err as Error).message }; }
  });
  ipcMain.handle(IPC.BLOG_BATCH_TAG, async (_event, data: { blogIds: number[]; tagIds: number[] }) => {
    try { for (const id of data.blogIds) await BlogService.setBlogTags(id, data.tagIds); return { success: true }; }
    catch (err) { return { success: false, error: (err as Error).message }; }
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

      // Render markdown to HTML using markdown-it
      let bodyHtml = blog.content || '';
      if (blog.format === 'md') {
        const MarkdownIt = (await import('markdown-it')).default;
        const md = new MarkdownIt({ html: false, linkify: true });
        bodyHtml = md.render(bodyHtml);
      }

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body{font-family:"Noto Serif SC","Microsoft YaHei",serif;max-width:680px;margin:40px auto;padding:0 20px;color:#2c2c2c;line-height:1.8}
        h1{font-size:28px}h2{font-size:22px;margin-top:32px;border-bottom:1px solid #eee;padding-bottom:8px}
        h3{font-size:18px;margin-top:24px}pre{background:#f6f8fa;padding:16px;border-radius:6px;overflow-x:auto}
        code{font-family:"JetBrains Mono",monospace;font-size:14px}blockquote{border-left:3px solid #c0392b;padding-left:16px;color:#666}
        img{max-width:100%}.footer{margin-top:48px;padding-top:16px;border-top:1px solid #eee;color:#aaa;font-size:12px}
      </style></head><body>
        <h1>${blog.title}</h1>
        <p style="color:#888;font-size:14px">${blog.createdAt}</p>
        ${bodyHtml}
        <div class="footer">由 Local Blog KB 导出</div>
      </body></html>`;

      fs.writeFileSync(tmpPath, html, 'utf-8');

      const win = new BrowserWindow({ show: false, width: 800, height: 1200 });
      // loadFile() internally awaits did-finish-load; Promise.race adds 10s safety net
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('PDF 渲染超时')), 10000));
      await Promise.race([win.loadFile(tmpPath), timeout]);

      const pdfBuffer = await win.webContents.printToPDF({ printBackground: true, landscape: false, margins: { top: 0, bottom: 0, left: 0, right: 0 } });
      fs.writeFileSync(filePath, pdfBuffer);
      win.close();

      return { success: true, data: { path: filePath } };
    } catch (err) { return { success: false, error: (err as Error).message }; }
    finally { try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch {} }
  });

  // Quick Note
  ipcMain.handle(IPC.BLOG_QUICK_CREATE, async (_event, data: { userId: number; title: string; content: string }) => {
    try {
      const blog = await BlogService.quickCreate(data.userId, data.title, data.content);
      return { success: true, data: blog };
    } catch (err) { return { success: false, error: (err as Error).message }; }
  });

  // Series
  ipcMain.handle(IPC.BLOG_SERIES_LIST, async (_event, userId: number) => {
    try { const list = await BlogService.listSeries(userId); return { success: true, data: list }; }
    catch (err) { return { success: false, error: (err as Error).message }; }
  });
  ipcMain.handle(IPC.BLOG_SERIES_GET, async (_event, seriesId: string) => {
    try { const blogs = await BlogService.getSeriesBlogs(seriesId); return { success: true, data: blogs }; }
    catch (err) { return { success: false, error: (err as Error).message }; }
  });
  ipcMain.handle(IPC.BLOG_SERIES_SET, async (_event, data: { blogId: number; seriesId: string | null; seriesName: string | null }) => {
    try { await BlogService.setBlogSeries(data.blogId, data.seriesId, data.seriesName); return { success: true }; }
    catch (err) { return { success: false, error: (err as Error).message }; }
  });

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
      const metaParts: TextRun[] = [
        new TextRun({ text: `${blog.createdAt}`, size: 20, color: '888888' }),
      ];
      if (blog.tags?.length > 0) {
        metaParts.push(new TextRun({ text: `  ·  ${blog.tags.map((t: any) => t.name).join(', ')}`, size: 20, color: '888888' }));
      }
      children.push(new Paragraph({ children: metaParts, spacing: { after: 400 } }));

      // Content blocks
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        if (line.startsWith('# ') && !line.startsWith('## ')) {
          children.push(new Paragraph({ text: line.replace(/^# /, ''), heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 120 } }));
        } else if (line.startsWith('## ') && !line.startsWith('### ')) {
          children.push(new Paragraph({ text: line.replace(/^## /, ''), heading: HeadingLevel.HEADING_3, spacing: { before: 240, after: 100 } }));
        } else if (line.startsWith('### ')) {
          children.push(new Paragraph({ text: line.replace(/^### /, ''), heading: HeadingLevel.HEADING_4, spacing: { before: 200, after: 80 } }));
        } else if (line.startsWith('```')) {
          // Code block
          const codeLines: string[] = [];
          i++;
          while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
          children.push(new Paragraph({ children: [new TextRun({ text: codeLines.join('\n'), font: 'Courier New', size: 18 })], spacing: { before: 120, after: 120 }, shading: { fill: 'F5F5F5' } }));
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
      children.push(new Paragraph({
        children: [new TextRun({ text: `由 Local Blog KB 导出 · ${now}`, size: 18, color: 'AAAAAA' })],
        spacing: { before: 600 }, alignment: AlignmentType.CENTER,
      }));

      const doc = new Document({ sections: [{ children }] });
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(filePath, buffer);

      return { success: true, data: { path: filePath } };
    } catch (err) { return { success: false, error: (err as Error).message }; }
  });
}
