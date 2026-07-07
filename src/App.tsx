import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Settings from '@/pages/Settings';
import Gallery from '@/pages/Gallery';
import GalleryCategories from '@/pages/GalleryCategories';
import Help from '@/pages/Help';
import Login from '@/pages/Login';
import AdminDashboard from '@/pages/AdminDashboard';
import { useAuthStore } from '@/store/authStore';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, initialized, loading } = useAuthStore();
  const location = useLocation();

  if (loading || !initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-mesh text-slate-500">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-4 h-4 rounded-full border-2 border-brand-accent border-t-transparent animate-spin" />
          加载中…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, initialized, loading } = useAuthStore();
  const location = useLocation();

  if (loading || !initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-mesh text-slate-500">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-4 h-4 rounded-full border-2 border-brand-accent border-t-transparent animate-spin" />
          加载中…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!user.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const init = useAuthStore((s) => s.init);
  const { user } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/gallery/categories" element={<GalleryCategories />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
                </Routes>
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </Router>
  );
}
