import fs from 'node:fs';
import path from 'node:path';
import { MAX_TITLE_LENGTH } from '../../shared/constants';
import { nowMySQL } from '../../shared/datetime';
import { sanitizePagination } from '../../shared/pagination';
import type { Blog, BlogFormat, BlogWithTags, ItemStatus, Tag } from '../../shared/types';
import { dbAll, dbGet, dbRun } from '../db';
import { getBlogAssetsDir, getBlogPath, getBlogsDir, initWorkspaceDirectories } from '../utils/paths';
import { TagService } from './tag.service';

interface BlogRow {
  id: number;
  user_id: number;
  title: string;
  format: string;
  content?: string;
  status: string;
  series_id?: string;
  series_name?: string;
  created_at: string;
  updated_at: string;
}
interface DraftRow {
  id: number;
  blog_id: number;
  content: string;
  saved_at: string;
}

export class BlogService {
  static async createBlog(userId: number, title: string, format: BlogFormat, content: string): Promise<Blog> {
    if (!title || title.length > MAX_TITLE_LENGTH) throw new Error(`标题长度必须在 1-${MAX_TITLE_LENGTH} 字符之间`);
    if (!['md', 'html'].includes(format)) throw new Error('格式必须是 md 或 html');

    const blogsDir = await getBlogsDir(userId);
    if (!fs.existsSync(blogsDir)) initWorkspaceDirectories(blogsDir.replace(/Blogs$/, ''));

    const now = nowMySQL();
    await dbRun(
      'INSERT INTO blogs (user_id, title, format, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, title, format, content, now, now],
    );
    const row = await dbGet<BlogRow>(
      'SELECT * FROM blogs WHERE user_id = ? AND title = ? AND format = ? ORDER BY id DESC LIMIT 1',
      [userId, title, format],
    );
    if (!row) throw new Error('创建博客失败');

    const filePath = await getBlogPath(userId, row.id, format);
    fs.writeFileSync(filePath, content, 'utf-8');
    return BlogService.rowToBlog(row);
  }

  static async getBlog(blogId: number): Promise<(BlogWithTags & { content: string }) | null> {
    const row = await dbGet<BlogRow>('SELECT * FROM blogs WHERE id = ?', [blogId]);
    if (!row) return null;
    const filePath = await getBlogPath(row.user_id, row.id, row.format as BlogFormat);
    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      content = row.content || '';
    }
    const tags = await BlogService.getBlogTags(blogId);
    return { ...BlogService.rowToBlog(row), tags, content };
  }

  static async updateBlog(blogId: number, update: { title?: string; content?: string }): Promise<void> {
    const blog = await dbGet<BlogRow>('SELECT * FROM blogs WHERE id = ?', [blogId]);
    if (!blog) throw new Error('博客不存在');
    if (update.title !== undefined) {
      if (!update.title || update.title.length > MAX_TITLE_LENGTH)
        throw new Error(`标题长度必须在 1-${MAX_TITLE_LENGTH} 字符之间`);
      await dbRun('UPDATE blogs SET title = ?, updated_at = ? WHERE id = ?', [update.title, nowMySQL(), blogId]);
    }
    if (update.content !== undefined) {
      const filePath = await getBlogPath(blog.user_id, blogId, blog.format as BlogFormat);
      const tmpPath = filePath + '.tmp.' + Date.now();
      fs.writeFileSync(tmpPath, update.content, 'utf-8');
      fs.renameSync(tmpPath, filePath);
      await dbRun('UPDATE blogs SET content = ?, updated_at = ? WHERE id = ?', [update.content, nowMySQL(), blogId]);
    }
  }

  static async deleteBlog(blogId: number): Promise<void> {
    const blog = await dbGet<BlogRow>('SELECT * FROM blogs WHERE id = ?', [blogId]);
    if (!blog) throw new Error('博客不存在');
    await dbRun("UPDATE blogs SET status = 'trash', updated_at = ? WHERE id = ?", [nowMySQL(), blogId]);
    await dbRun('INSERT INTO recycle_bin (user_id, item_type, item_id, deleted_at) VALUES (?, ?, ?, ?)', [
      blog.user_id,
      'blog',
      blogId,
      nowMySQL(),
    ]);
  }

  static async restoreBlog(blogId: number): Promise<void> {
    const blog = await dbGet<BlogRow>('SELECT * FROM blogs WHERE id = ? AND status = ?', [blogId, 'trash']);
    if (!blog) throw new Error('博客不在回收站中');
    await dbRun("UPDATE blogs SET status = 'active', updated_at = ? WHERE id = ?", [nowMySQL(), blogId]);
    await dbRun('DELETE FROM recycle_bin WHERE item_type = ? AND item_id = ?', ['blog', blogId]);
  }

  static async listBlogs(filters: {
    userId: number;
    status?: string;
    tagId?: number;
    folderId?: number;
    query?: string;
    sortBy?: string;
    sortOrder?: string;
    offset?: number;
    limit?: number;
  }): Promise<{ blogs: BlogWithTags[]; total: number }> {
    const conditions: string[] = ['b.user_id = ?'];
    const params: unknown[] = [filters.userId];
    conditions.push("b.status = 'active'");
    if (filters.query) {
      conditions.push('b.title LIKE ?');
      params.push(`%${filters.query}%`);
    }
    if (filters.tagId) {
      conditions.push('b.id IN (SELECT blog_id FROM blog_tags WHERE tag_id = ?)');
      params.push(filters.tagId);
    }
    if (filters.folderId !== undefined) {
      conditions.push('b.folder_id = ?');
      params.push(filters.folderId);
    }

    const where = conditions.join(' AND ');
    const safeSort = ['created_at', 'updated_at', 'title'].includes(filters.sortBy || '')
      ? filters.sortBy
      : 'updated_at';
    const safeOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const { offset, limit } = sanitizePagination(filters.offset, filters.limit);

    const totalRow = await dbGet<{ count: number }>(`SELECT COUNT(*) as count FROM blogs b WHERE ${where}`, params);
    const rows = await dbAll<BlogRow>(
      `SELECT b.* FROM blogs b WHERE ${where} ORDER BY b.${safeSort} ${safeOrder} LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    const blogs = await Promise.all(
      rows.map(async (row) => ({ ...BlogService.rowToBlog(row), tags: await BlogService.getBlogTags(row.id) })),
    );
    return { blogs, total: totalRow?.count || 0 };
  }

  static async exportBlogs(blogIds: number[], outputDir: string): Promise<number> {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    let count = 0;
    for (const blogId of blogIds) {
      const blog = await dbGet<BlogRow>('SELECT * FROM blogs WHERE id = ?', [blogId]);
      if (!blog) continue;
      const srcPath = await getBlogPath(blog.user_id, blogId, blog.format as BlogFormat);
      const ext = blog.format === 'html' ? '.html' : '.md';
      try {
        fs.copyFileSync(
          srcPath,
          path.join(outputDir, `${blog.title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100)}${ext}`),
        );
        count++;
      } catch {
        /* skip files that cannot be copied (permissions, missing source) */
      }
    }
    return count;
  }

  static async importMarkdownFiles(
    userId: number,
    filePaths: string[],
    contents: { title: string; content: string }[] = [],
  ): Promise<Blog[]> {
    const blogs: Blog[] = [];

    // Import from disk files
    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) continue;
      const ext = path.extname(filePath).toLowerCase();
      if (!['.md', '.txt', '.html'].includes(ext)) continue;
      const content = fs.readFileSync(filePath, 'utf-8');
      const filename = path.basename(filePath, ext);
      let title = filename;
      const fmMatch = content.match(/^---\s*\ntitle:\s*(.+)\s*\n---/);
      if (fmMatch) title = fmMatch[1].trim();
      else {
        const h1Match = content.match(/^#\s+(.+)/m);
        if (h1Match) title = h1Match[1].trim();
      }
      const format: BlogFormat = ext === '.html' ? 'html' : 'md';
      const blog = await BlogService.createBlog(userId, title.substring(0, MAX_TITLE_LENGTH), format, content);
      blogs.push(blog);
    }

    // Import from inline content (web fallback)
    for (const item of contents) {
      const title = (item.title || '未命名').substring(0, MAX_TITLE_LENGTH);
      const blog = await BlogService.createBlog(userId, title, 'md', item.content);
      blogs.push(blog);
    }

    return blogs;
  }

  static async saveDraft(blogId: number, content: string): Promise<void> {
    const blog = await dbGet<BlogRow>('SELECT * FROM blogs WHERE id = ?', [blogId]);
    if (!blog) throw new Error('博客不存在');
    await dbRun('INSERT INTO blog_drafts (blog_id, content, saved_at) VALUES (?, ?, ?)', [blogId, content, nowMySQL()]);
  }

  static async getHistory(blogId: number): Promise<DraftRow[]> {
    return dbAll<DraftRow>(
      'SELECT id, blog_id, content, saved_at FROM blog_drafts WHERE blog_id = ? ORDER BY saved_at DESC LIMIT 20',
      [blogId],
    );
  }

  static async rollback(blogId: number, draftId: number): Promise<void> {
    const draft = await dbGet<DraftRow>('SELECT * FROM blog_drafts WHERE id = ? AND blog_id = ?', [draftId, blogId]);
    if (!draft) throw new Error('草稿不存在');
    await BlogService.updateBlog(blogId, { content: draft.content });
  }

  static async getBlogTags(blogId: number): Promise<Tag[]> {
    return dbAll<Tag>(
      'SELECT t.id, t.user_id, t.name FROM tags t JOIN blog_tags bt ON bt.tag_id = t.id WHERE bt.blog_id = ?',
      [blogId],
    );
  }

  static async setBlogTags(blogId: number, tagIds: number[]): Promise<void> {
    await dbRun('DELETE FROM blog_tags WHERE blog_id = ?', [blogId]);
    for (const tagId of tagIds)
      await dbRun('INSERT OR IGNORE INTO blog_tags (blog_id, tag_id) VALUES (?, ?)', [blogId, tagId]);
  }

  // ---- Attachments ----

  static async listAttachments(blogId: number): Promise<{ filename: string; size: number; usedInBlog: boolean }[]> {
    const blog = await dbGet<BlogRow>('SELECT * FROM blogs WHERE id = ?', [blogId]);
    if (!blog) return [];

    const assetsDir = await getBlogAssetsDir(blog.user_id, blogId);
    if (!fs.existsSync(assetsDir)) return [];

    const files = fs.readdirSync(assetsDir);
    const content = await BlogService.getBlogContent(blog);

    return files.map((f) => {
      const fullPath = path.join(assetsDir, f);
      let size = 0;
      try {
        size = fs.statSync(fullPath).size;
      } catch {
        /* file may have been deleted since readdir */
      }
      return {
        filename: f,
        size,
        usedInBlog: content.includes(`Assets/blog_${blogId}/${f}`),
      };
    });
  }

  static async deleteAttachment(blogId: number, filename: string): Promise<void> {
    const blog = await dbGet<BlogRow>('SELECT * FROM blogs WHERE id = ?', [blogId]);
    if (!blog) throw new Error('博客不存在');

    const assetsDir = await getBlogAssetsDir(blog.user_id, blogId);
    const filePath = path.join(assetsDir, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  static async cleanupAttachments(blogId: number): Promise<number> {
    const attachments = await BlogService.listAttachments(blogId);
    let cleaned = 0;
    for (const a of attachments) {
      if (!a.usedInBlog) {
        await BlogService.deleteAttachment(blogId, a.filename);
        cleaned++;
      }
    }
    return cleaned;
  }

  private static async getBlogContent(blog: BlogRow): Promise<string> {
    try {
      return fs.readFileSync(await getBlogPath(blog.user_id, blog.id, blog.format as BlogFormat), 'utf-8');
    } catch {
      return blog.content || '';
    }
  }

  private static rowToBlog(row: BlogRow): Blog {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      format: row.format as BlogFormat,
      status: row.status as ItemStatus,
      seriesId: row.series_id,
      seriesName: row.series_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ---- Quick Note ----

  static async quickCreate(userId: number, title: string, content: string): Promise<Blog> {
    const blog = await BlogService.createBlog(userId, title, 'md', content);
    const tags = await TagService.listTags(userId);
    let quickTag = tags.find((t) => t.name === 'quick-note');
    if (!quickTag) quickTag = await TagService.createTag(userId, 'quick-note');
    await BlogService.setBlogTags(blog.id, [quickTag.id]);
    return blog;
  }

  // ---- Series ----

  static async listSeries(userId: number): Promise<{ seriesId: string; seriesName: string; count: number }[]> {
    return dbAll<{ seriesId: string; seriesName: string; count: number }>(
      `SELECT series_id as seriesId, series_name as seriesName, COUNT(*) as count
       FROM blogs WHERE user_id = ? AND status = 'active' AND series_id IS NOT NULL
       GROUP BY series_id, series_name ORDER BY series_name`,
      [userId],
    );
  }

  static async getSeriesBlogs(seriesId: string): Promise<Blog[]> {
    const rows = await dbAll<BlogRow>(
      `SELECT * FROM blogs WHERE series_id = ? AND status = 'active' ORDER BY created_at ASC`,
      [seriesId],
    );
    return rows.map(BlogService.rowToBlog);
  }

  static async setBlogSeries(blogId: number, seriesId: string | null, seriesName: string | null): Promise<void> {
    await dbRun('UPDATE blogs SET series_id = ?, series_name = ? WHERE id = ?', [seriesId, seriesName, blogId]);
  }
}
