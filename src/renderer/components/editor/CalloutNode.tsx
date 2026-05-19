/**
 * T2107: Callout Tiptap Node extension.
 *
 * Provides 4 semantic callout types as proper ProseMirror nodes
 * with parseHTML/renderHTML for round-trip editing fidelity.
 *
 * D72: amber accent used only at component level (not a global token).
 */

import { Node } from '@tiptap/core';

export interface CalloutOptions {
  types: readonly string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs: { type: string }) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

const CALLOUT_TYPES = ['info', 'success', 'warning', 'danger'] as const;

const CALLOUT_ICONS: Record<string, string> = {
  info: '💡',
  success: '✅',
  warning: '⚠️',
  danger: '🚫',
};

export const CalloutNode = Node.create<CalloutOptions>({
  name: 'callout',

  group: 'block',
  content: 'block+',
  defining: true,

  addOptions() {
    return { types: [...CALLOUT_TYPES] };
  },

  addAttributes() {
    return {
      type: {
        default: 'info',
        rendered: true,
        parseHTML: (el) => el.getAttribute('data-callout-type') || 'info',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout-type]' }];
  },

  renderHTML({ node }) {
    const t = node.attrs.type as string;
    return [
      'div',
      {
        class: `callout callout-${t}`,
        'data-callout-type': t,
      },
      ['div', { class: 'callout-title' }, `${CALLOUT_ICONS[t] || ''} ${t.charAt(0).toUpperCase() + t.slice(1)}`],
      ['div', { class: 'callout-body' }, 0],
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) =>
          commands.setNode(this.name, attrs),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-1': () => this.editor.commands.setCallout({ type: 'info' }),
      'Mod-Shift-2': () => this.editor.commands.setCallout({ type: 'success' }),
      'Mod-Shift-3': () => this.editor.commands.setCallout({ type: 'warning' }),
      'Mod-Shift-4': () => this.editor.commands.setCallout({ type: 'danger' }),
    };
  },
});
