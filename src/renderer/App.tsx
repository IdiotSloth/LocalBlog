import { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, Outlet, RouterProvider, createHashRouter } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CardSkeleton } from './components/common/Skeleton';
import { NotFoundPage } from './features/misc/NotFoundPage';
import { AuthLayout } from './components/layout/AuthLayout';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { FloatingBlogTabs } from './components/blog/FloatingBlogTabs';
import { useAuthStore } from './stores/auth-store';
import { useThemeStore } from './stores/theme-store';

// Web mode detection: Electron userAgent contains "Electron"; browser does not
const isWeb = !navigator.userAgent.includes('Electron');

// T1803: Simple error toast state
interface ErrorToastState {
  message: string;
  visible: boolean;
}

// Lazy-loaded page components — reduces initial bundle parse time
const HomePage = lazy(() =>
  import('./features/dashboard/HomePage').then((m) => ({ default: m.HomePage })),
);
const BlogListPage = lazy(() => import('./features/blog/BlogListPage').then((m) => ({ default: m.BlogListPage })));
const BlogEditorPage = lazy(() =>
  import('./features/blog/BlogEditorPage').then((m) => ({ default: m.BlogEditorPage })),
);
const WebEditorPage = lazy(() =>
  import('./features/blog/WebEditorPage').then((m) => ({ default: m.WebEditorPage })),
);
const BlogPreviewPage = lazy(() =>
  import('./features/blog/BlogPreviewPage').then((m) => ({ default: m.BlogPreviewPage })),
);
const KnowledgeListPage = lazy(() =>
  import('./features/knowledge/KnowledgeListPage').then((m) => ({ default: m.KnowledgeListPage })),
);
const RecycleBinPage = lazy(() =>
  import('./features/recycle/RecycleBinPage').then((m) => ({ default: m.RecycleBinPage })),
);
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const TagManagePage = lazy(() => import('./features/tags/TagManagePage').then((m) => ({ default: m.TagManagePage })));
const GuidePage = lazy(() => import('./features/guide/GuidePage').then((m) => ({ default: m.GuidePage })));
const NoteListPage = lazy(() => import('./features/notes/NoteListPage').then((m) => ({ default: m.NoteListPage })));
const SeriesListPage = lazy(() =>
  import('./features/series/SeriesListPage').then((m) => ({ default: m.SeriesListPage })),
);
const SeriesDetailPage = lazy(() =>
  import('./features/series/SeriesDetailPage').then((m) => ({ default: m.SeriesDetailPage })),
);
const GraphPage = lazy(() =>
  import('./features/graph/GraphPage').then((m) => ({ default: m.GraphPage })),
);
function PageSkeleton() {
  return (
    <div className="p-6">
      <CardSkeleton />
    </div>
  );
}

/** Auth guard layout — redirects to /login if not authenticated */
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">加载中...</div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Wrap a lazy page component with ErrorBoundary + Suspense */
function lazyPage(Page: React.LazyExoticComponent<React.ComponentType<object>>) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        <Page />
      </Suspense>
    </ErrorBoundary>
  );
}

const router = createHashRouter([
  {
    // Auth pages — no auth guard, centered layout
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    // All authenticated routes
    element: <ProtectedRoute />,
    children: [
      {
        // Full layout: sidebar + header + main content
        element: <MainLayout />,
        children: [
          { index: true, element: lazyPage(HomePage) },
          { path: '/dashboard', element: <Navigate to="/" replace /> },
          { path: '/blog', element: lazyPage(BlogListPage) },
          { path: '/blog/new', element: lazyPage(isWeb ? WebEditorPage : BlogEditorPage) },
          { path: '/blog/:id', element: lazyPage(BlogPreviewPage) },
          { path: '/blog/:id/edit', element: lazyPage(isWeb ? WebEditorPage : BlogEditorPage) },
          { path: '/knowledge', element: lazyPage(KnowledgeListPage) },
          { path: '/tags', element: lazyPage(TagManagePage) },
          { path: '/recycle', element: lazyPage(RecycleBinPage) },
          { path: '/settings', element: lazyPage(SettingsPage) },
          { path: '/notes', element: lazyPage(NoteListPage) },
          { path: '/series', element: lazyPage(SeriesListPage) },
          { path: '/series/:seriesId', element: lazyPage(SeriesDetailPage) },
          { path: '/guide', element: lazyPage(GuidePage) },
          { path: '/graph', element: lazyPage(GraphPage) },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      // Standalone editor — bypasses MainLayout for pet/tray "新建博客" action
      { path: '/standalone/editor', element: lazyPage(BlogEditorPage) },
    ],
  },
]);

export default function App() {
  const initSession = useAuthStore((s) => s.initSession);
  const initTheme = useThemeStore((s) => s.initTheme);
  const [errorToast, setErrorToast] = useState<ErrorToastState>({ message: '', visible: false });

  useEffect(() => {
    initSession();
    initTheme();
  }, [initSession, initTheme]);

  // T1803: Listen for app errors from main process, show a Toast
  useEffect(() => {
    return window.api.onAppError((error) => {
      setErrorToast({ message: error.message, visible: true });
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setErrorToast((prev) => ({ ...prev, visible: false }));
      }, 5000);
    });
  }, []);

  return (
    <>
      {/* T1911: Skip to main content — uses onClick so HashRouter doesn't intercept #main-content as a route */}
      <button
        type="button"
        onClick={() => { document.getElementById('main-content')?.focus(); }}
        className="fixed top-2 left-2 z-[10000] rounded-[4px] border-0 px-3 py-2 text-[13px] font-medium transition-transform -translate-y-20 focus:translate-y-0 cursor-pointer"
        style={{ background: 'var(--accent-blue)', color: '#fff' }}
      >
        跳到主要内容
      </button>
      <div id="main-content" tabIndex={-1} />
      <RouterProvider router={router} />
      {/* T1803: Error Toast */}
      <ErrorToastContent state={errorToast} onDismiss={() => setErrorToast((prev) => ({ ...prev, visible: false }))} />
      {/* T1907: Floating minimized blog tabs */}
      <FloatingBlogTabs />
    </>
  );
}

/** A simple red Toast at the top of the screen for error notifications */
function ErrorToastContent({ state, onDismiss }: { state: ErrorToastState; onDismiss: () => void }) {
  if (!state.visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] px-4 py-3 text-sm text-white text-center shadow-lg"
      style={{ background: 'var(--accent-red)' }}
      role="alert"
    >
      <span className="mr-2">&#x26A0;</span>
      {state.message}
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
        aria-label="关闭"
      >
        &#x2715;
      </button>
    </div>
  );
}
