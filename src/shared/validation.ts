import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符').max(100),
  password: z.string().min(4, '密码至少4个字符'),
  workspacePath: z.string().min(1, '请选择工作区目录'),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export const blogCreateSchema = z.object({
  title: z.string().min(1, '请输入标题').max(200),
  format: z.enum(['md', 'html']),
  content: z.string().max(1_000_000, '内容过长'),
});

export const blogUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(1_000_000, '内容过长').optional(),
});

export const blogImportSchema = z.object({
  filePaths: z.array(z.string()).max(100).optional(),
  contents: z
    .array(z.object({ title: z.string(), content: z.string() }))
    .max(100)
    .optional(),
});

export const tagCreateSchema = z.object({
  name: z.string().min(1, '标签名不能为空').max(100),
});

export const tagUpdateSchema = z.object({
  name: z.string().min(1, '标签名不能为空').max(100),
});

export const knowledgeImportSchema = z.object({
  filePaths: z.array(z.string()).min(1, '请选择文件').max(100),
});

export const searchQuerySchema = z.object({
  query: z.string().min(1, '请输入搜索关键词'),
});

export const folderCreateSchema = z.object({
  name: z.string().min(1, '文件夹名不能为空').max(100),
  parentId: z.number().nullable().optional(),
  type: z.enum(['blog', 'knowledge']),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type BlogCreateInput = z.infer<typeof blogCreateSchema>;
