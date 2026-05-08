export interface ShortcutDef {
  id: string;
  key: string;
  label: string;
  description: string;
  group: 'global' | 'editor' | 'blog' | 'knowledge';
}

export const SHORTCUTS: ShortcutDef[] = [
  { id: 'new-blog', key: 'Ctrl+N', label: '新建博客', description: '打开博客编辑器', group: 'global' },
  { id: 'global-search', key: 'Ctrl+F', label: '全局搜索', description: '聚焦全局搜索框', group: 'global' },
  { id: 'dashboard', key: 'Ctrl+H', label: '仪表盘', description: '打开仪表盘页面', group: 'global' },
  { id: 'help', key: '?', label: '快捷键帮助', description: '显示快捷键列表', group: 'global' },
  { id: 'escape', key: 'Escape', label: '关闭弹窗', description: '关闭当前弹窗或面板', group: 'global' },
  { id: 'save', key: 'Ctrl+S', label: '保存', description: '保存当前内容', group: 'editor' },
  { id: 'bold', key: 'Ctrl+B', label: '加粗', description: '切换加粗格式', group: 'editor' },
  { id: 'italic', key: 'Ctrl+I', label: '斜体', description: '切换斜体格式', group: 'editor' },
  { id: 'undo', key: 'Ctrl+Z', label: '撤销', description: '撤销上一步操作', group: 'editor' },
  { id: 'redo', key: 'Ctrl+Shift+Z', label: '重做', description: '重做已撤销操作', group: 'editor' },
  { id: 'md-float', key: 'Ctrl+Shift+N', label: 'MD 浮窗', description: '打开 Markdown 快捷写作浮窗', group: 'global' },
  { id: 'clipboard-note', key: 'Ctrl+Shift+M', label: '剪贴板→便签', description: '将剪贴板内容保存为便签', group: 'global' },
];

export function formatKey(key: string): string {
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  return key
    .replace(/Ctrl\+/g, isMac ? '⌘' : 'Ctrl+')
    .replace(/Shift\+/g, isMac ? '⇧' : 'Shift+')
    .replace(/\+/g, isMac ? '' : '+');
}
