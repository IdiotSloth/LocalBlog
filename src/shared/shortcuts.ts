export interface ShortcutDef {
  key: string;
  description: string;
  group: 'global' | 'editor' | 'blog' | 'knowledge';
}

export const SHORTCUTS: ShortcutDef[] = [
  { key: 'Ctrl+N', description: '新建博客', group: 'global' },
  { key: 'Ctrl+F', description: '全局搜索', group: 'global' },
  { key: 'Ctrl+H', description: '打开仪表盘', group: 'global' },
  { key: '?', description: '显示快捷键帮助', group: 'global' },
  { key: 'Escape', description: '关闭弹窗/面板', group: 'global' },
  { key: 'Ctrl+S', description: '保存当前内容', group: 'editor' },
  { key: 'Ctrl+B', description: '加粗', group: 'editor' },
  { key: 'Ctrl+I', description: '斜体', group: 'editor' },
  { key: 'Ctrl+Z', description: '撤销', group: 'editor' },
  { key: 'Ctrl+Shift+Z', description: '重做', group: 'editor' },
];

export function formatKey(key: string): string {
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  return key
    .replace(/Ctrl\+/g, isMac ? '⌘' : 'Ctrl+')
    .replace(/Shift\+/g, isMac ? '⇧' : 'Shift+')
    .replace(/\+/g, isMac ? '' : '+');
}
