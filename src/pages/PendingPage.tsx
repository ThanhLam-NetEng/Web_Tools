import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './auth.css';

const MESSAGES: Record<string, { title: string; body: string }> = {
  pending: {
    title: 'Đã gửi yêu cầu',
    body: 'Tài khoản của bro đang chờ admin duyệt. Duyệt xong đăng nhập lại là vào được.',
  },
  suspended: {
    title: 'Tài khoản đã bị khoá',
    body: 'Liên hệ admin nếu bro nghĩ đây là nhầm lẫn.',
  },
};

export function PendingPage() {
  const location = useLocation();
  const { logout } = useAuth();
  const status = (location.state as { status?: string } | null)?.status ?? 'pending';
  const message = MESSAGES[status] ?? MESSAGES.pending;

  return (
    <div className="center-screen">
      <div className="card auth-shell" style={{ textAlign: 'center' }}>
        <h1>{message.title}</h1>
        <p className="subtitle">{message.body}</p>
        <Link
          to="/login"
          className="btn btn-ghost"
          style={{ textDecoration: 'none' }}
          onClick={() => {
            void logout();
          }}
        >
          Về trang đăng nhập
        </Link>
      </div>
    </div>
  );
}
