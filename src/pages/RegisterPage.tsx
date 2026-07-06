import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import './auth.css';

const MIN_PASSWORD_LENGTH = 8;

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    setSubmitting(true);
    try {
      await register(email, password);
      navigate('/pending', { state: { status: 'pending' } });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Email này đã được đăng ký.');
      } else if (err instanceof ApiError && err.status === 400) {
        setError(err.message);
      } else {
        setError('Có lỗi xảy ra, thử lại sau.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="card auth-shell page-entrance">
        <h1>Đăng ký</h1>
        <p className="subtitle">Gửi yêu cầu, admin duyệt xong là dùng được.</p>

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
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="confirm-password">Nhập lại mật khẩu</label>
            <input
              id="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Đang gửi…' : 'Đăng ký'}
          </button>
        </form>

        <p className="switch-link">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
