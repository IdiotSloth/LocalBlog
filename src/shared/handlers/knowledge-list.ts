/** Shared knowledge file list logic.
 *  DI pattern: caller injects dbAll/dbGet adapters for their backend.
 */

import { sanitizePagination } from '../pagination';
import { mapKnowledgeRow } from './knowledge-crud';

type QueryRows = (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;
type QueryOne = (sql: string, params: unknown[]) => Promise<Record<string, unknown> | undefined>;

export interface KnowledgeListFilters {
  userId: number;
  tagId?: number;
  folderId?: number;
  fileType?: string;
  query?: string;
  sortBy?: string;
  sortOrder?: string;
  offset?: number;
  limit?: number;
}

const VALID_SORT = ['created_at', 'updated_at', 'filename', 'file_size'] as const;
const VALID_ORDER = ['asc', 'desc'] as const;

export async function getSharedKnowledgeList(dbAll: QueryRows, dbGet: QueryOne, filters: KnowledgeListFilters) {
  const {
    userId,
    tagId,
    folderId,
    fileType,
    query,
    sortBy = 'created_at',
    sortOrder = 'desc',
    offset = 0,
    limit = 50,
  } = filters;

  const safeSort = (VALID_SORT as readonly string[]).includes(sortBy) ? sortBy : 'created_at';
  const safeOrder = (VALID_ORDER as readonly string[]).includes(sortOrder) ? sortOrder : 'desc';
  const { offset: safeOffset, limit: safeLimit } = sanitizePagination(offset, limit);

  const conditions: string[] = ['kf.user_id = ?'];
  const params: unknown[] = [userId];

  conditions.push("kf.status = 'active'");

  if (query) {
    conditions.push('kf.filename LIKE ?');
    params.push(`%${query}%`);
  }
  if (fileType) {
    conditions.push('kf.file_type = ?');
    params.push(fileType);
  }
  if (tagId) {
    conditions.push('kf.id IN (SELECT file_id FROM knowledge_file_tags WHERE tag_id = ?)');
    params.push(tagId);
  }
  if (folderId !== undefined) {
    conditions.push('kf.folder_id = ?');
    params.push(folderId);
  }

  const where = conditions.join(' AND ');

  const totalRow = await dbGet(`SELECT COUNT(*) as count FROM knowledge_files kf WHERE ${where}`, params);
  const rows = await dbAll(
    `SELECT kf.* FROM knowledge_files kf WHERE ${where} ORDER BY kf.${safeSort} ${safeOrder} LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    params,
  );

  const files = await Promise.all(
    rows.map(async (row) => {
      const file = mapKnowledgeRow(row);
      const tags = await dbAll(
        'SELECT t.id, t.user_id, t.name FROM tags t JOIN knowledge_file_tags kft ON kft.tag_id = t.id WHERE kft.file_id = ?',
        [file.id],
      );
      return {
        ...file,
        tags: tags.map((t) => ({ id: t.id as number, userId: t.user_id as number, name: t.name as string })),
      };
    }),
  );

  return { files, total: (totalRow?.count as number) || 0 };
}
