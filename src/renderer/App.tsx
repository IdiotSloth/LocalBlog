import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Outlet, RouterProvider, createHashRouter } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthLayout } from './components/layout/AuthLayout';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { useAuthStore } from './stores/auth-store';
import { useThemeStore } from './stores/theme-store';

// Lazy-loaded page components — reduces initial bundle parse time
const DashboardPage = lazy(() =>
  import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const BlogListPage = lazy(() => import('./features/blog/BlogListPage').then((m) => ({ default: m.BlogListPage })));
const BlogEditorPage = lazy(() =>
  import('./features/blog/BlogEditorPage').then((m) => ({ default: m.BlogEditorPage })),
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
const ContinueWritingPage = lazy(() =>
  import('./features/dashboard/ContinueWritingPage').then((m) => ({ default: m.ContinueWritingPage })),
);
const SeriesListPage = lazy(() =>
  import('./features/series/SeriesListPage').then((m) => ({ default: m.SeriesListPage })),
);
const SeriesDetailPage = lazy(() =>
  import('./features/series/SeriesDetailPage').then((m) => ({ default: m.SeriesDetailPage })),
);

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-1/3 rounded" style={{ background: 'var(--bg-tertiary)' }} />
      <div className="h-4 w-2/3 rounded" style={{ background: 'var(--bg-tertiary)' }} />
      <div className="h-64 rounded" style={{ background: 'var(--bg-tertiary)' }} />
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
function lazyPage(Page: React.LazyExoticComponent<React.ComponentType<any>>) {
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
          { index: true, element: lazyPage(ContinueWritingPage) },
          { path: '/dashboard', element: lazyPage(DashboardPage) },
          { path: '/blog', element: lazyPage(BlogListPage) },
          { path: '/blog/new', element: lazyPage(BlogEditorPage) },
          { path: '/blog/:id', element: lazyPage(BlogPreviewPage) },
          { path: '/blog/:id/edit', element: lazyPage(BlogEditorPage) },
          { path: '/knowledge', element: lazyPage(KnowledgeListPage) },
          { path: '/tags', element: lazyPage(TagManagePage) },
          { path: '/recycle', element: lazyPage(RecycleBinPage) },
          { path: '/settings', element: lazyPage(SettingsPage) },
          { path: '/notes', element: lazyPage(NoteListPage) },
          { path: '/series', element: lazyPage(SeriesListPage) },
          { path: '/series/:seriesId', element: lazyPage(SeriesDetailPage) },
          { path: '/guide', element: lazyPage(GuidePage) },
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

  useEffect(() => {
    initSession();
    initTheme();
  }, [initSession, initTheme]);

  return <RouterProvider router={router} />;
}
