import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import './admin.css';

interface AdminUserRow {
  id: string;
  email: string;
  role: 'admin' | 'user';
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  created_at: number;
}

const STATUS_LABEL: Record<AdminUserRow['status'], string> = {
  pending: 'Chờ duyệt',
  active: 'Đang hoạt động',
  suspended: 'Đã khoá',
  rejected: 'Đã từ chối',
};

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<AdminUserRow[]>('/admin/users');
      setUsers(data);
    } catch {
      setError('Không tải được danh sách user.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function runAction(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await action();
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Thao tác thất bại.');
      setBusyId(null);
    }
  }

  function handleRoleChange(row: AdminUserRow, role: 'admin' | 'user') {
    if (role === 'admin') {
      const confirmed = window.confirm(`Bạn chắc chắn cấp quyền admin cho ${row.email}?`);
      if (!confirmed) return;
    }
    void runAction(row.id, () => api.post(`/admin/users/${row.id}/role`, { role }));
  }

  if (loading) return <p>Đang tải…</p>;

  return (
    <div>
      <h2>Quản lý người dùng</h2>
      {error && <p className="error-text">{error}</p>}
      <div className="card" style={{ padding: '0.5rem 1rem', marginTop: '1rem' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.map((row) => {
              const isSelf = row.id === currentUser?.id;
              const busy = busyId === row.id;

              return (
                <tr key={row.id}>
                  <td>{row.email}</td>
                  <td>{row.role}</td>
                  <td>
                    <span className={`badge badge-${row.status}`}>{STATUS_LABEL[row.status]}</span>
                  </td>
                  <td>{new Date(row.created_at).toLocaleDateString('vi-VN')}</td>
                  <td className="admin-actions">
                    {row.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={busy}
                          onClick={() => void runAction(row.id, () => api.post(`/admin/users/${row.id}/approve`))}
                        >
                          Duyệt
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          disabled={busy}
                          onClick={() => void runAction(row.id, () => api.post(`/admin/users/${row.id}/reject`))}
                        >
                          Từ chối
                        </button>
                      </>
                    )}

                    {row.status === 'active' && (
                      <>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={busy || isSelf}
                          title={isSelf ? 'Không thể tự khoá chính mình' : undefined}
                          onClick={() => void runAction(row.id, () => api.post(`/admin/users/${row.id}/suspend`))}
                        >
                          Khoá
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={busy || isSelf}
                          title={isSelf ? 'Không thể tự đổi role chính mình' : undefined}
                          onClick={() => handleRoleChange(row, row.role === 'admin' ? 'user' : 'admin')}
                        >
                          {row.role === 'admin' ? 'Hạ xuống user' : 'Cấp quyền admin'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          disabled={busy || isSelf}
                          title={isSelf ? 'Không thể tự xoá chính mình' : undefined}
                          onClick={() => void runAction(row.id, () => api.delete(`/admin/users/${row.id}`))}
                        >
                          Xoá
                        </button>
                      </>
                    )}

                    {row.status === 'suspended' && (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={busy}
                          onClick={() => void runAction(row.id, () => api.post(`/admin/users/${row.id}/unsuspend`))}
                        >
                          Mở khoá
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          disabled={busy || isSelf}
                          onClick={() => void runAction(row.id, () => api.delete(`/admin/users/${row.id}`))}
                        >
                          Xoá
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && <p style={{ padding: '1rem', color: 'var(--mist)' }}>Chưa có user nào.</p>}
      </div>
    </div>
  );
}
