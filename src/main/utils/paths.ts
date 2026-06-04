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

/** Sanitize a blog title into a safe filename */
export function sanitizeFileName(title: string): string {
  return title.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim() || 'untitled';
}

/** Resolve file name conflict by appending -1, -2, etc. */
export function resolveFileNameConflict(dir: string, baseName: string, ext: string): string {
  if (!fs.existsSync(path.join(dir, baseName + ext))) return baseName + ext;
  let counter = 1;
  while (fs.existsSync(path.join(dir, `${baseName}-${counter}${ext}`))) counter++;
  return `${baseName}-${counter}${ext}`;
}

/** Path to a specific blog file */
export async function getBlogPath(userId: number, title: string, format: 'md' | 'html'): Promise<string> {
  const ext = format === 'html' ? '.html' : '.md';
  const blogsDir = await getBlogsDir(userId);
  const safeName = resolveFileNameConflict(blogsDir, sanitizeFileName(title), ext);
  return path.join(blogsDir, safeName);
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
