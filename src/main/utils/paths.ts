import fs from 'node:fs';
import path from 'node:path';
import { DIR_ASSETS, DIR_BLOGS, DIR_KNOWLEDGE_BASE } from '../../shared/constants';
import { dbGet } from '../db';

/** Resolve user workspace root path from DB */
export async function getWorkspacePath(userId: number): Promise<string> {
  const user = await dbGet<{ workspace_path: string }>('SELECT workspace_path FROM users WHERE id = ?', [userId]);
  if (!user) throw new Error(`User ${userId} not found`);
  return user.workspace_path;
}

/** Path to Blogs/ directory for a user */
export async function getBlogsDir(userId: number): Promise<string> {
  return path.join(await getWorkspacePath(userId), DIR_BLOGS);
}

/** Path to KnowledgeBase/ directory for a user */
export async function getKnowledgeBaseDir(userId: number): Promise<string> {
  return path.join(await getWorkspacePath(userId), DIR_KNOWLEDGE_BASE);
}

/** Path to Assets/ directory for a user */
export async function getAssetsDir(userId: number): Promise<string> {
  return path.join(await getWorkspacePath(userId), DIR_ASSETS);
}

/** Path to a specific blog file */
export async function getBlogPath(userId: number, blogId: number, format: 'md' | 'html'): Promise<string> {
  const ext = format === 'html' ? '.html' : '.md';
  return path.join(await getBlogsDir(userId), `${blogId}${ext}`);
}

/** Path to assets for a specific blog */
export async function getBlogAssetsDir(userId: number, blogId: number): Promise<string> {
  return path.join(await getAssetsDir(userId), `blog_${blogId}`);
}

/** Initialize workspace directory structure for a new user */
export function initWorkspaceDirectories(workspacePath: string): void {
  const dirs = [
    path.join(workspacePath, DIR_BLOGS),
    path.join(workspacePath, DIR_KNOWLEDGE_BASE),
    path.join(workspacePath, DIR_ASSETS),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
