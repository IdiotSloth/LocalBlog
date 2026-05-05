/** Shared blog list logic — used by both Electron main IPC and Express server routes.
 *  Eliminates the duplicate WHERE-building + row-mapping that previously existed in
 *  BlogService.listBlogs + server/routes/blog.ts GET /list.
 */

type QueryRows = (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;
type QueryOne = (sql: string, params: unknown[]) => Promise<Record<string, unknown> | undefined>;

export interface BlogListFilters {
  userId: number;
  status?: string;
  tagId?: number;
  folderId?: number;
  query?: string;
  sortBy?: string;
  sortOrder?: string;
  offset?: number;
  limit?: number;
}

const VALID_SORT = ['created_at', 'updated_at', 'title'] as const;
const VALID_ORDER = ['asc', 'desc'] as const;

function mapBlogRow(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    userId: row.user_id as number,
    title: row.title as string,
    format: row.format as string,
    status: row.status as string,
    seriesId: row.series_id as string | undefined,
    seriesName: row.series_name as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getSharedBlogList(
  dbAll: QueryRows,
  dbGet: QueryOne,
  filters: BlogListFilters,
) {
  const {
    userId,
    status = 'active',
    tagId,
    folderId,
    query,
    sortBy = 'updated_at',
    sortOrder = 'desc',
    offset = 0,
    limit = 50,
  } = filters;

  const safeSort = VALID_SORT.includes(sortBy as any) ? sortBy : 'updated_at';
  const safeOrder = VALID_ORDER.includes(sortOrder as any) ? sortOrder : 'desc';

  const conditions: string[] = ['b.user_id = ?'];
  const params: unknown[] = [userId];

  conditions.push('b.status = ?');
  params.push(status);

  if (query) {
    conditions.push('b.title LIKE ?');
    params.push(`%${query}%`);
  }
  if (tagId) {
    conditions.push('b.id IN (SELECT blog_id FROM blog_tags WHERE tag_id = ?)');
    params.push(tagId);
  }
  if (folderId !== undefined) {
    conditions.push('b.folder_id = ?');
    params.push(folderId);
  }

  const where = conditions.join(' AND ');

  const totalRow = await dbGet(
    `SELECT COUNT(*) as count FROM blogs b WHERE ${where}`, params);
  const rows = await dbAll(
    `SELECT b.* FROM blogs b WHERE ${where} ORDER BY b.${safeSort} ${safeOrder} LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  const blogs = await Promise.all(rows.map(async (row) => {
    const blog = mapBlogRow(row);
    const tags = await dbAll(
      'SELECT t.id, t.user_id, t.name FROM tags t JOIN blog_tags bt ON bt.tag_id = t.id WHERE bt.blog_id = ?',
      [blog.id],
    );
    return { ...blog, tags: tags.map((t: any) => ({ id: t.id, userId: t.user_id, name: t.name })) };
  }));

  return { blogs, total: (totalRow?.count as number) || 0 };
}
