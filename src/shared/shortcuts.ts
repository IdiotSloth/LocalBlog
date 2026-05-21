export interface ShortcutDef {
  id: string;
  key: string;
  label: string;
  description: string;
  group: 'global' | 'editor' | 'blog' | 'knowledge';
}

export const SHORTCUTS: ShortcutDef[] = [
  { id: 'new-blog', key: 'Ctrl+N', label: '新建博客', description: '打开博客编辑器', group: 'global' },
  { id: 'quick-note', key: 'Alt+Space', label: '快捷便签', description: '打开快捷便签浮窗', group: 'global' },
  { id: 'sidebar-toggle', key: 'Ctrl+B', label: '侧边栏', description: '折叠/展开侧边栏', group: 'global' },
  { id: 'help', key: '?', label: '快捷键帮助', description: '显示快捷键列表', group: 'global' },
  { id: 'md-float', key: 'Ctrl+Shift+N', label: 'MD 浮窗', description: '打开 Markdown 快捷写作浮窗', group: 'global' },
  { id: 'clipboard-note', key: 'Ctrl+Shift+V', label: '剪贴板→便签', description: '将剪贴板内容保存为便签', group: 'global' },
  { id: 'bold', key: 'Ctrl+B', label: '加粗', description: '编辑器中切换加粗格式', group: 'editor' },
  { id: 'italic', key: 'Ctrl+I', label: '斜体', description: '编辑器中切换斜体格式', group: 'editor' },
  { id: 'undo', key: 'Ctrl+Z', label: '撤销', description: '编辑器中撤销上一步操作', group: 'editor' },
  { id: 'redo', key: 'Ctrl+Shift+Z', label: '重做', description: '编辑器中重做已撤销操作', group: 'editor' },
];

export function formatKey(key: string): string {
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  return key
    .replace(/Ctrl\+/g, isMac ? '⌘' : 'Ctrl+')
    .replace(/Shift\+/g, isMac ? '⇧' : 'Shift+')
    .replace(/\+/g, isMac ? '' : '+');
}
