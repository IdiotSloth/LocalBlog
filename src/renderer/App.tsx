import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthLayout } from './components/layout/AuthLayout';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { useAuthStore } from './stores/auth-store';
import { useThemeStore } from './stores/theme-store';

// Lazy-loaded page components — reduces initial bundle parse time
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const BlogListPage = lazy(() => import('./features/blog/BlogListPage').then((m) => ({ default: m.BlogListPage })));
const BlogEditorPage = lazy(() => import('./features/blog/BlogEditorPage').then((m) => ({ default: m.BlogEditorPage })));
const BlogPreviewPage = lazy(() => import('./features/blog/BlogPreviewPage').then((m) => ({ default: m.BlogPreviewPage })));
const KnowledgeListPage = lazy(() => import('./features/knowledge/KnowledgeListPage').then((m) => ({ default: m.KnowledgeListPage })));
const RecycleBinPage = lazy(() => import('./features/recycle/RecycleBinPage').then((m) => ({ default: m.RecycleBinPage })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const TagManagePage = lazy(() => import('./features/tags/TagManagePage').then((m) => ({ default: m.TagManagePage })));

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-1/3 rounded" style={{ background: 'var(--bg-tertiary)' }} />
      <div className="h-4 w-2/3 rounded" style={{ background: 'var(--bg-tertiary)' }} />
      <div className="h-64 rounded" style={{ background: 'var(--bg-tertiary)' }} />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">加载中...</div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const initSession = useAuthStore((s) => s.initSession);
  const initTheme = useThemeStore((s) => s.initTheme);

  useEffect(() => {
    initSession();
    initTheme();
  }, [initSession, initTheme]);

  const lazyPage = (Page: React.LazyExoticComponent<React.ComponentType<any>>) => (
    <Suspense fallback={<PageSkeleton />}>
      <Page />
    </Suspense>
  );

  return (
    <HashRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={lazyPage(DashboardPage)} />
          <Route path="/blog" element={lazyPage(BlogListPage)} />
          <Route path="/blog/new" element={lazyPage(BlogEditorPage)} />
          <Route path="/blog/:id" element={lazyPage(BlogPreviewPage)} />
          <Route path="/blog/:id/edit" element={lazyPage(BlogEditorPage)} />
          <Route path="/knowledge" element={lazyPage(KnowledgeListPage)} />
          <Route path="/tags" element={lazyPage(TagManagePage)} />
          <Route path="/recycle" element={lazyPage(RecycleBinPage)} />
          <Route path="/settings" element={lazyPage(SettingsPage)} />
        </Route>
        {/* Standalone editor — bypasses MainLayout for pet/tray "新建博客" action */}
        <Route element={<ProtectedRoute><></></ProtectedRoute>}>
          <Route path="/standalone/editor" element={lazyPage(BlogEditorPage)} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
