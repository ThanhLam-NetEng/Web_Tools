import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AppShell.css';

interface AppShellProps {
  title: string;
  links: { to: string; label: string }[];
}

export function AppShell({ title, links }: AppShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="app-nav">
        <span className="app-nav-title">{title}</span>
        <nav className="app-nav-links">
          {links.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="app-nav-user">
          <span className="app-nav-email">{user?.email}</span>
          <button type="button" className="btn btn-ghost" onClick={() => void handleLogout()}>
            Đăng xuất
          </button>
        </div>
      </header>
      <main className="app-content page-entrance">
        <Outlet />
      </main>
    </div>
  );
}
