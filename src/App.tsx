import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RequireActive, RequireAdmin, RequireAuth } from './routes/guards';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PendingPage } from './pages/PendingPage';
import { AppShell } from './components/AppShell';
import { AppHomePage } from './pages/AppHomePage';
import { AdminUsersPage } from './pages/AdminUsersPage';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.status !== 'active') return <Navigate to="/pending" state={{ status: user.status }} replace />;
  return <Navigate to={user.role === 'admin' ? '/admin/users' : '/app'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/pending" element={<PendingPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<RequireActive />}>
          <Route path="/app" element={<AppShell title="CV Tools" links={[{ to: '/app', label: 'Trang chủ' }]} />}>
            <Route index element={<AppHomePage />} />
          </Route>
        </Route>

        <Route element={<RequireAdmin />}>
          <Route
            path="/admin"
            element={
              <AppShell
                title="Quản trị"
                links={[
                  { to: '/admin/users', label: 'Người dùng' },
                  { to: '/app', label: 'Về Tools' },
                ]}
              />
            }
          >
            <Route path="users" element={<AdminUsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
