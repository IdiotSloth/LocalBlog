/** Shared knowledge CRUD SQL builders -- used by both Electron main IPC and Express server routes.
 *  Eliminates duplicate SQL strings between knowledge.service.ts and server/routes/knowledge.ts. */

import { nowMySQL } from '../datetime';
import type { SqlParams } from './blog-crud';
export type { SqlParams };

/** SELECT * FROM knowledge_files WHERE id = ? */
export function buildKnowledgeSelect(id: number): SqlParams {
  return { sql: 'SELECT * FROM knowledge_files WHERE id = ?', params: [id] };
}

/** SELECT * FROM knowledge_files WHERE id = ? AND user_id = ? */
export function buildKnowledgeSelectByUser(id: number, userId: number): SqlParams {
  return { sql: 'SELECT * FROM knowledge_files WHERE id = ? AND user_id = ?', params: [id, userId] };
}

/** INSERT INTO knowledge_files (...) VALUES (...)
 *  userId, filename, filePath, fileType, fileSize, contentText */
export function buildKnowledgeCreate(userId: number, filename: string, filePath: string, fileType: string, fileSize: number, contentText: string): SqlParams {
  const now = nowMySQL();
  return {
    sql: 'INSERT INTO knowledge_files (user_id, filename, file_path, file_type, file_size, content_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    params: [userId, filename, filePath, fileType, fileSize, contentText, now, now],
  };
}

/** Soft-delete: UPDATE knowledge_files SET status='trash', updated_at=? WHERE id = ? AND user_id = ? */
export function buildKnowledgeDelete(id: number, userId: number): SqlParams {
  const now = nowMySQL();
  return {
    sql: "UPDATE knowledge_files SET status = 'trash', updated_at = ? WHERE id = ? AND user_id = ?",
    params: [now, id, userId],
  };
}

/** Soft-delete without userId guard: UPDATE knowledge_files SET status='trash', updated_at=? WHERE id = ? */
export function buildKnowledgeDeleteById(id: number): SqlParams {
  const now = nowMySQL();
  return {
    sql: "UPDATE knowledge_files SET status = 'trash', updated_at = ? WHERE id = ?",
    params: [now, id],
  };
}

/** Restore: UPDATE knowledge_files SET status='active', updated_at=? WHERE id = ? AND user_id = ? */
export function buildKnowledgeRestore(id: number, userId: number): SqlParams {
  const now = nowMySQL();
  return {
    sql: "UPDATE knowledge_files SET status = 'active', updated_at = ? WHERE id = ? AND user_id = ?",
    params: [now, id, userId],
  };
}

/** Restore without userId guard: UPDATE knowledge_files SET status='active', updated_at=? WHERE id = ? */
export function buildKnowledgeRestoreById(id: number): SqlParams {
  const now = nowMySQL();
  return {
    sql: "UPDATE knowledge_files SET status = 'active', updated_at = ? WHERE id = ?",
    params: [now, id],
  };
}

/** Rename: UPDATE knowledge_files SET filename = ?, file_path = ?, updated_at = ? WHERE id = ? AND user_id = ? */
export function buildKnowledgeRename(id: number, userId: number, filename: string, filePath: string): SqlParams {
  const now = nowMySQL();
  return {
    sql: 'UPDATE knowledge_files SET filename = ?, file_path = ?, updated_at = ? WHERE id = ? AND user_id = ?',
    params: [filename, filePath, now, id, userId],
  };
}

/** Rename filename only: UPDATE knowledge_files SET filename = ?, updated_at = ? WHERE id = ? AND user_id = ? */
export function buildKnowledgeRenameFilename(id: number, userId: number, filename: string): SqlParams {
  const now = nowMySQL();
  return {
    sql: 'UPDATE knowledge_files SET filename = ?, updated_at = ? WHERE id = ? AND user_id = ?',
    params: [filename, now, id, userId],
  };
}

/** SELECT f.id, f.filename, f.file_type, f.file_path FROM knowledge_files WHERE id = ? AND user_id = ? (preview) */
export function buildKnowledgePreviewSelect(id: number, userId: number): SqlParams {
  return {
    sql: 'SELECT id, filename, file_type, file_path FROM knowledge_files WHERE id = ? AND user_id = ?',
    params: [id, userId],
  };
}

/** SELECT t.id, t.user_id, t.name FROM tags t JOIN knowledge_file_tags kft ON kft.tag_id = t.id WHERE kft.file_id = ? */
export function buildKnowledgeTagsSelect(fileId: number): SqlParams {
  return {
    sql: 'SELECT t.id, t.user_id, t.name FROM tags t JOIN knowledge_file_tags kft ON kft.tag_id = t.id WHERE kft.file_id = ?',
    params: [fileId],
  };
}

/** DELETE FROM knowledge_file_tags WHERE file_id = ? */
export function buildKnowledgeTagsDelete(fileId: number): SqlParams {
  return { sql: 'DELETE FROM knowledge_file_tags WHERE file_id = ?', params: [fileId] };
}

/** SELECT id FROM knowledge_files WHERE id = ? AND user_id = ? (ownership check) */
export function buildKnowledgeOwnershipCheck(fileId: number, userId: number): SqlParams {
  return { sql: 'SELECT id FROM knowledge_files WHERE id = ? AND user_id = ?', params: [fileId, userId] };
}

/** SELECT * FROM knowledge_files WHERE id = ? AND status = ? (trash check) */
export function buildKnowledgeSelectTrash(id: number): SqlParams {
  return { sql: "SELECT * FROM knowledge_files WHERE id = ? AND status = ?", params: [id, 'trash'] };
}
