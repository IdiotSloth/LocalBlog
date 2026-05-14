import fs from 'node:fs';
import path from 'node:path';
import { MAX_TITLE_LENGTH } from '../../shared/constants';
import { nowMySQL } from '../../shared/datetime';
import { getSharedBlogList } from '../../shared/handlers/blog-list';
import {
  buildBlogCreate,
  buildBlogDelete,
  buildBlogDraftInsert,
  buildBlogDraftSelect,
  buildBlogHistorySelect,
  buildBlogRestore,
  buildBlogSelect,
  buildBlogSelectTrash,
  buildBlogTagsDelete,
  buildBlogTagsSelect,
  buildRecycleDelete,
  buildRecycleInsert,
  mapBlogRow,
} from '../../shared/handlers/blog-crud';
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

    const { sql, params } = buildBlogCreate(userId, title, format, content);
    await dbRun(sql, params);
    const row = await dbGet<BlogRow>(
      'SELECT * FROM blogs WHERE user_id = ? AND title = ? AND format = ? ORDER BY id DESC LIMIT 1',
      [userId, title, format],
    );
    if (!row) throw new Error('创建博客失败');

    const filePath = await getBlogPath(userId, row.id, format);
    fs.writeFileSync(filePath, content, 'utf-8');
    return mapBlogRow(row);
  }

  static async getBlog(blogId: number): Promise<(BlogWithTags & { content: string }) | null> {
    const { sql, params } = buildBlogSelect(blogId);
    const row = await dbGet<BlogRow>(sql, params);
    if (!row) return null;
    const filePath = await getBlogPath(row.user_id, row.id, row.format as BlogFormat);
    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      content = row.content || '';
    }
    const tags = await BlogService.getBlogTags(blogId);
    return { ...mapBlogRow(row), tags, content };
  }

  static async updateBlog(userId: number, blogId: number, update: { title?: string; content?: string }): Promise<void> {
    const { sql, params } = buildBlogSelect(blogId);
    const blog = await dbGet<BlogRow>(sql, params);
    if (!blog) throw new Error('博客不存在');
    if (update.title !== undefined) {
      if (!update.title || update.title.length > MAX_TITLE_LENGTH)
        throw new Error(`标题长度必须在 1-${MAX_TITLE_LENGTH} 字符之间`);
      await dbRun('UPDATE blogs SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?', [update.title, nowMySQL(), blogId, userId]);
    }
    if (update.content !== undefined) {
      const filePath = await getBlogPath(blog.user_id, blogId, blog.format as BlogFormat);
      const tmpPath = filePath + '.tmp.' + Date.now();
      fs.writeFileSync(tmpPath, update.content, 'utf-8');
      fs.renameSync(tmpPath, filePath);
      await dbRun('UPDATE blogs SET content = ?, updated_at = ? WHERE id = ? AND user_id = ?', [update.content, nowMySQL(), blogId, userId]);
    }
  }

  static async deleteBlog(userId: number, blogId: number): Promise<void> {
    const { sql, params } = buildBlogSelect(blogId);
    const blog = await dbGet<BlogRow>(sql, params);
    if (!blog) throw new Error('博客不存在');
    const { sql: deleteSql, params: deleteParams } = buildBlogDelete(blogId, userId);
    await dbRun(deleteSql, deleteParams);
    const { sql: recycleSql, params: recycleParams } = buildRecycleInsert(blog.user_id, 'blog', blogId);
    await dbRun(recycleSql, recycleParams);
  }

  static async restoreBlog(userId: number, blogId: number): Promise<void> {
    const { sql, params } = buildBlogSelectTrash(blogId);
    const blog = await dbGet<BlogRow>(sql, params);
    if (!blog) throw new Error('博客不在回收站中');
    const { sql: restoreSql, params: restoreParams } = buildBlogRestore(blogId, userId);
    await dbRun(restoreSql, restoreParams);
    const { sql: recycleSql, params: recycleParams } = buildRecycleDelete('blog', blogId, userId);
    await dbRun(recycleSql, recycleParams);
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
    return getSharedBlogList(
      (sql, p) => dbAll<BlogRow>(sql, p),
      (sql, p) => dbGet<{ count: number }>(sql, p),
      filters,
    ) as Promise<{ blogs: BlogWithTags[]; total: number }>;
  }

  static async exportBlogs(blogIds: number[], outputDir: string): Promise<number> {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    let count = 0;
    for (const blogId of blogIds) {
      const { sql, params } = buildBlogSelect(blogId);
      const blog = await dbGet<BlogRow>(sql, params);
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
      if (fmMatch?.[1]) title = fmMatch[1].trim();
      else {
        const h1Match = content.match(/^#\s+(.+)/m);
        if (h1Match?.[1]) title = h1Match[1].trim();
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
    const { sql, params } = buildBlogSelect(blogId);
    const blog = await dbGet<BlogRow>(sql, params);
    if (!blog) throw new Error('博客不存在');
    const { sql: draftSql, params: draftParams } = buildBlogDraftInsert(blogId, content);
    await dbRun(draftSql, draftParams);
  }

  static async getHistory(blogId: number): Promise<DraftRow[]> {
    const { sql, params } = buildBlogHistorySelect(blogId);
    return dbAll<DraftRow>(sql, params);
  }

  static async rollback(userId: number, blogId: number, draftId: number): Promise<void> {
    const { sql, params } = buildBlogDraftSelect(draftId, blogId);
    const draft = await dbGet<DraftRow>(sql, params);
    if (!draft) throw new Error('草稿不存在');
    await BlogService.updateBlog(userId, blogId, { content: draft.content });
  }

  static async getBlogTags(blogId: number): Promise<Tag[]> {
    const { sql, params } = buildBlogTagsSelect(blogId);
    return dbAll<Tag>(sql, params);
  }

  static async setBlogTags(blogId: number, tagIds: number[]): Promise<void> {
    await dbRun('DELETE FROM blog_tags WHERE blog_id = ?', [blogId]);
    for (const tagId of tagIds)
      await dbRun('INSERT OR IGNORE INTO blog_tags (blog_id, tag_id) VALUES (?, ?)', [blogId, tagId]);
  }

  // ---- Attachments ----

  static async listAttachments(blogId: number): Promise<{ filename: string; size: number; usedInBlog: boolean }[]> {
    const { sql, params } = buildBlogSelect(blogId);
    const blog = await dbGet<BlogRow>(sql, params);
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
    const { sql, params } = buildBlogSelect(blogId);
    const blog = await dbGet<BlogRow>(sql, params);
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

  // ---- Quick Note ----

  static async quickCreate(userId: number, title: string, content: string): Promise<Blog> {
    const blog = await BlogService.createBlog(userId, title, 'md', content);
    const tags = await TagService.listTags(userId);
    let quickTag = tags.find((t) => t.name === 'quick-note');
    if (!quickTag) quickTag = await TagService.createTag(userId, 'quick-note');
    await BlogService.setBlogTags(blog.id, [quickTag!.id]);
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
    return rows.map(mapBlogRow);
  }

  static async setBlogSeries(userId: number, blogId: number, seriesId: string | null, seriesName: string | null): Promise<void> {
    await dbRun('UPDATE blogs SET series_id = ?, series_name = ? WHERE id = ? AND user_id = ?', [seriesId, seriesName, blogId, userId]);
  }

  static async renameSeries(seriesId: string, newName: string, userId: number): Promise<void> {
    await dbRun('UPDATE blogs SET series_name = ? WHERE series_id = ? AND user_id = ?', [newName, seriesId, userId]);
  }
}
