export interface BlogTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name for display
  format: 'md' | 'html';
  content: string;
  tags: string[];
}

export const BUILTIN_TEMPLATES: BlogTemplate[] = [
  {
    id: 'tech-article',
    name: '技术文章',
    description: '适合技术教程、经验分享',
    icon: 'Code2',
    format: 'md',
    content: `# 标题

## 背景

简要描述问题背景和动机。

## 方案

### 核心思路

### 实现细节

\`\`\`javascript
// 代码示例
\`\`\`

## 效果

## 总结

## 参考

- [链接名称](url)
`,
    tags: ['技术'],
  },
  {
    id: 'weekly-report',
    name: '周报',
    description: '每周工作总结与下周计划',
    icon: 'CalendarDays',
    format: 'md',
    content: `# 周报 (YYYY-MM-DD ~ YYYY-MM-DD)

## 本周完成

- [ ] 任务 1
- [ ] 任务 2

## 遇到的问题

| 问题 | 状态 | 解决方案 |
|------|------|----------|
|      |      |          |

## 下周计划

- [ ] 计划 1
- [ ] 计划 2

## 本周收获
`,
    tags: ['周报'],
  },
  {
    id: 'reading-notes',
    name: '读书笔记',
    description: '记录阅读心得与摘录',
    icon: 'BookOpen',
    format: 'md',
    content: `# 《书名》读书笔记

> 作者: xxx | 阅读日期: YYYY-MM-DD

## 核心观点

1.
2.
3.

## 精彩摘录

> "引文内容"
> — 第 X 页

## 个人思考

## 行动项

- [ ]
`,
    tags: ['读书'],
  },
  {
    id: 'meeting-notes',
    name: '会议记录',
    description: '记录会议要点与待办',
    icon: 'Users',
    format: 'md',
    content: `# 会议: 主题

**日期**: YYYY-MM-DD HH:mm
**参与人**:
**地点/方式**:

## 议题

### 1. 议题名称

**讨论要点**:

**结论**:

## 待办事项

| 事项 | 负责人 | 截止日期 | 状态 |
|------|--------|----------|------|
|      |        |          | ⬜   |

## 下次会议

- 时间:
- 议题:
`,
    tags: ['会议'],
  },
  {
    id: 'blank',
    name: '空白博客',
    description: '从零开始，自由创作',
    icon: 'FileText',
    format: 'md',
    content: '',
    tags: [],
  },
];
