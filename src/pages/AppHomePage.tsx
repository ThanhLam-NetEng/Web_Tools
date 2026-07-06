import { Link } from 'react-router-dom';

export function AppHomePage() {
  return (
    <div>
      <h2>Tools</h2>
      <div style={{ display: 'flex', gap: '1.2rem', marginTop: '1.2rem' }}>
        <Link to="/app/cv" className="card" style={{ maxWidth: 320, textDecoration: 'none', color: 'inherit' }}>
          <h3 style={{ fontSize: '1.1rem' }}>CV Builder</h3>
          <p style={{ color: 'var(--mist)', marginTop: '0.5rem' }}>Chọn mẫu, điền thông tin, xuất PDF.</p>
        </Link>
      </div>
    </div>
  );
}
