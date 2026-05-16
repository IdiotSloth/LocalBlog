"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const index = require("./index.js");
const VALID_SORT = ["created_at", "updated_at", "filename", "file_size"];
const VALID_ORDER = ["asc", "desc"];
async function getSharedKnowledgeList(dbAll, dbGet, filters) {
  const {
    userId,
    tagId,
    folderId,
    fileType,
    query,
    sortBy = "created_at",
    sortOrder = "desc",
    offset = 0,
    limit = 50
  } = filters;
  const safeSort = VALID_SORT.includes(sortBy) ? sortBy : "created_at";
  const safeOrder = VALID_ORDER.includes(sortOrder) ? sortOrder : "desc";
  const { offset: safeOffset, limit: safeLimit } = index.sanitizePagination(offset, limit);
  const conditions = ["kf.user_id = ?"];
  const params = [userId];
  conditions.push("kf.status = 'active'");
  if (query) {
    conditions.push("kf.filename LIKE ?");
    params.push(`%${query}%`);
  }
  if (fileType) {
    conditions.push("kf.file_type = ?");
    params.push(fileType);
  }
  if (tagId) {
    conditions.push("kf.id IN (SELECT file_id FROM knowledge_file_tags WHERE tag_id = ?)");
    params.push(tagId);
  }
  if (folderId !== void 0) {
    conditions.push("kf.folder_id = ?");
    params.push(folderId);
  }
  const where = conditions.join(" AND ");
  const totalRow = await dbGet(`SELECT COUNT(*) as count FROM knowledge_files kf WHERE ${where}`, params);
  const rows = await dbAll(
    `SELECT kf.* FROM knowledge_files kf WHERE ${where} ORDER BY kf.${safeSort} ${safeOrder} LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    params
  );
  const files = await Promise.all(
    rows.map(async (row) => {
      const file = index.mapKnowledgeRow(row);
      const tags = await dbAll(
        "SELECT t.id, t.user_id, t.name FROM tags t JOIN knowledge_file_tags kft ON kft.tag_id = t.id WHERE kft.file_id = ?",
        [file.id]
      );
      return {
        ...file,
        tags: tags.map((t) => ({ id: t.id, userId: t.user_id, name: t.name }))
      };
    })
  );
  return { files, total: totalRow?.count || 0 };
}
exports.getSharedKnowledgeList = getSharedKnowledgeList;
