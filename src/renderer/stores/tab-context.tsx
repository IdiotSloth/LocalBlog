import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const LS_KEY = 'lbkb_open_tabs';
const MAX_TABS = 8;

export interface TabItem {
  id: string;
  path: string;
  label: string;
}

interface TabContextType {
  tabs: TabItem[];
  activeTabId: string | null;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
}

const Ctx = createContext<TabContextType>({ tabs: [], activeTabId: null, closeTab: () => {}, switchTab: () => {} });
export function useTabs() { return useContext(Ctx); }

// Route path -> default tab label
const ROUTE_LABELS: Record<string, string> = {
  '/': '今日',
  '/blog': '博客',
  '/blog/new': '写博客',
  '/knowledge': '知识库',
  '/tags': '标签',
  '/series': '系列',
  '/notes': '便签',
  '/graph': '图谱',
  '/timeline': '时间轴',
  '/bookmarks': '收藏',
  '/recycle': '回收站',
  '/guide': '指南',
  '/settings': '设置',
};

function getLabel(path: string): string {
  if (ROUTE_LABELS[path]) return ROUTE_LABELS[path]!;
  if (path.startsWith('/blog/') && path.endsWith('/edit')) return '编辑器';
  if (path.startsWith('/blog/')) return '博客详情';
  if (path.startsWith('/series/')) return '系列详情';
  return path.slice(0, 30);
}

let idCounter = Date.now();
function nextId() { return `tab-${++idCounter}`; }

function loadTabs(): TabItem[] { try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : []; } catch { return []; } }
function saveTabs(tabs: TabItem[]) { localStorage.setItem(LS_KEY, JSON.stringify(tabs)); }

export function TabProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<TabItem[]>(() => {
    const stored = loadTabs();
    // Ensure home tab always exists
    if (stored.length === 0 || !stored.find((t) => t.path === '/')) {
      return [{ id: nextId(), path: '/', label: '今日' }, ...stored.filter((t) => t.path !== '/')];
    }
    return stored;
  });
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-add tab for current route
  useEffect(() => {
    const currentPath = location.pathname;
    setTabs((prev) => {
      const exists = prev.find((t) => t.path === currentPath);
      if (exists) {
        return prev;
      }
      const item: TabItem = { id: nextId(), path: currentPath, label: getLabel(currentPath) };
      if (prev.length >= MAX_TABS) {
        return [...prev.slice(1), item];
      }
      return [...prev, item];
    });
  }, [location.pathname]);

  // Persist
  useEffect(() => { saveTabs(tabs); }, [tabs]);

  const closeTab = useCallback((tabId: string) => {
    const prev = tabs;
    const tab = prev.find((t) => t.id === tabId);
    if (!tab || tab.path === '/') return;
    if (prev.length <= 2) return;
    const idx = prev.findIndex((t) => t.id === tabId);
    const newTabs = prev.filter((t) => t.id !== tabId);
    setTabs(newTabs);
    // Navigate after state update, outside the setState callback
    if (location.pathname === tab.path) {
      const next = newTabs[Math.min(idx, newTabs.length - 1)];
      if (next) navigate(next.path);
    }
  }, [tabs, location.pathname, navigate]);

  const switchTab = useCallback((tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) navigate(tab.path);
  }, [tabs, navigate]);

  const activeTabId = useMemo(() => {
    return tabs.find((t) => t.path === location.pathname)?.id ?? tabs[0]?.id ?? null;
  }, [tabs, location.pathname]);

  const value = useMemo(() => ({ tabs, activeTabId, closeTab, switchTab }), [tabs, activeTabId, closeTab, switchTab]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
