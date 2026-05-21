import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MarkdownIt from 'markdown-it';
import { BookOpen, Bookmark, Bot, Calendar, Clock, FolderGit2, GitFork, Keyboard, Layers, Library, PenLine, Search, Settings, StickyNote } from 'lucide-react';
import { AiChatPanel } from '../../components/ai/AiChatPanel';

// Import guide markdown files as raw strings
import indexMd from '../../../../docs/guide/index.md?raw';
import blogMd from '../../../../docs/guide/blog.md?raw';
import knowledgeMd from '../../../../docs/guide/knowledge.md?raw';
import notesMd from '../../../../docs/guide/notes.md?raw';
import whiteboardMd from '../../../../docs/guide/whiteboard.md?raw';
import aiMd from '../../../../docs/guide/ai.md?raw';
import searchMd from '../../../../docs/guide/search.md?raw';
import calendarMd from '../../../../docs/guide/calendar.md?raw';
import bookmarksMd from '../../../../docs/guide/bookmarks.md?raw';
import timelineMd from '../../../../docs/guide/timeline.md?raw';
import tabsMd from '../../../../docs/guide/tabs.md?raw';
import settingsMd from '../../../../docs/guide/settings.md?raw';
import shortcutsMd from '../../../../docs/guide/shortcuts.md?raw';

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

interface TocEntry { id: string; label: string; icon: typeof BookOpen; content: string }

const TOC: TocEntry[] = [
  { id: 'index', label: '欢迎与快速入门', icon: BookOpen, content: indexMd },
  { id: 'blog', label: '博客', icon: PenLine, content: blogMd },
  { id: 'knowledge', label: '知识库', icon: Library, content: knowledgeMd },
  { id: 'notes', label: '便签', icon: StickyNote, content: notesMd },
  { id: 'whiteboard', label: '白板', icon: GitFork, content: whiteboardMd },
  { id: 'ai', label: 'AI 助手', icon: Bot, content: aiMd },
  { id: 'search', label: '搜索', icon: Search, content: searchMd },
  { id: 'calendar', label: '日历', icon: Calendar, content: calendarMd },
  { id: 'bookmarks', label: '书签', icon: Bookmark, content: bookmarksMd },
  { id: 'timeline', label: '时间轴', icon: Clock, content: timelineMd },
  { id: 'tabs', label: '标签页', icon: Layers, content: tabsMd },
  { id: 'settings', label: '设置', icon: Settings, content: settingsMd },
  { id: 'shortcuts', label: '快捷键', icon: Keyboard, content: shortcutsMd },
];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^\w一-鿿]+/g, '-').replace(/^-|-$/g, '');
}

export function GuidePage() {
  const [activeSection, setActiveSection] = useState('index');
  const [showAi, setShowAi] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const activeEntry = TOC.find((t) => t.id === activeSection) || TOC[0]!;
  const renderedHtml = useMemo(() => {
    const raw = activeEntry.content;
    const withAnchors = raw.replace(/^(#{2,3})\s+(.+)$/gm, (_m: string, hashes: string, text: string) => {
      const id = slugify(text.trim());
      return `<h${hashes.length} id="${id}">${text.trim()}</h${hashes.length}>`;
    });
    return md.render(withAnchors);
  }, [activeEntry]);

  const scrollToSection = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Keyboard: ← → for prev/next section
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = TOC.findIndex((t) => t.id === activeSection);
      if (e.key === 'ArrowRight' && idx < TOC.length - 1) scrollToSection(TOC[idx + 1]!.id);
      if (e.key === 'ArrowLeft' && idx > 0) scrollToSection(TOC[idx - 1]!.id);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [activeSection, scrollToSection]);

  return (
    <div className="flex h-full" style={{ background: 'var(--bg-primary)' }}>
      {/* Left sidebar — TOC */}
      <aside className="shrink-0 border-r overflow-y-auto" style={{ width: 220, borderColor: 'var(--border-default)', background: 'var(--bg-sidebar)' }}>
        <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>用户指南</h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>← → 键翻页</p>
        </div>
        <nav className="py-2">
          {TOC.map((entry) => (
            <button key={entry.id} type="button"
              onClick={() => scrollToSection(entry.id)}
              className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-left transition-colors"
              style={{
                color: activeSection === entry.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                background: activeSection === entry.id ? 'var(--bg-tertiary)' : 'transparent',
                borderLeft: activeSection === entry.id ? '3px solid var(--accent-blue)' : '3px solid transparent',
              }}>
              <entry.icon size={14} />
              <span className="truncate">{entry.label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t mx-3 py-3" style={{ borderColor: 'var(--border-default)' }}>
          <button type="button" onClick={() => setShowAi((v) => !v)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-[12px] transition-colors"
            style={{ color: showAi ? 'var(--accent-blue)' : 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Bot size={14} />
            {showAi ? '隐藏 AI 助手' : 'AI 助手'}
          </button>
        </div>
      </aside>

      {/* Center — Markdown content */}
      <main ref={contentRef} className="flex-1 overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
        <div className="px-8 py-6 prose max-w-[720px]"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
          onClick={(e) => {
            const link = (e.target as HTMLElement).closest('a');
            if (link?.getAttribute('href')?.startsWith('#')) {
              e.preventDefault();
              document.getElementById(link.getAttribute('href')!.slice(1))?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        />
        {/* Prev/Next navigation */}
        <div className="px-8 py-6 border-t flex justify-between" style={{ borderColor: 'var(--border-default)' }}>
          {(() => {
            const idx = TOC.findIndex((t) => t.id === activeSection);
            return (
              <>
                <span>{idx > 0 && (
                  <button type="button" onClick={() => scrollToSection(TOC[idx - 1]!.id)}
                    className="flex items-center gap-1 text-[13px] hover:opacity-70"
                    style={{ color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    ← {TOC[idx - 1]!.label}
                  </button>
                )}</span>
                <span>{idx < TOC.length - 1 && (
                  <button type="button" onClick={() => scrollToSection(TOC[idx + 1]!.id)}
                    className="flex items-center gap-1 text-[13px] hover:opacity-70"
                    style={{ color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {TOC[idx + 1]!.label} →
                  </button>
                )}</span>
              </>
            );
          })()}
        </div>
      </main>

      {/* Right — AI Panel */}
      {showAi && (
        <div className="shrink-0 border-l" style={{ width: 360, borderColor: 'var(--border-default)' }}>
          <AiChatPanel onClose={() => setShowAi(false)} />
        </div>
      )}
    </div>
  );
}
