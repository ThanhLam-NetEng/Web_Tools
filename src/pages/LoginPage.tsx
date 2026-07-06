import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, type AuthUser } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { VaultDoorTransition } from '../components/VaultDoorTransition';
import './auth.css';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<AuthUser | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      setLoggedInUser(user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        const status = (err.data as { status?: string } | null)?.status;
        navigate('/pending', { state: { status } });
        return;
      }
      setError('Sai email hoặc mật khẩu.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loggedInUser) {
    return (
      <VaultDoorTransition
        onComplete={() => {
          const from = (location.state as { from?: { pathname: string } } | null)?.from;
          const fallback = loggedInUser.role === 'admin' ? '/admin/users' : '/app';
          navigate(from?.pathname ?? fallback, { replace: true });
        }}
      />
    );
  }

  return (
    <div className="center-screen">
      <div className="card auth-shell">
        <h1>Đăng nhập</h1>
        <p className="subtitle">Vào không gian riêng của bro.</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        <p className="switch-link">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
      </div>
    </div>
  );
}
