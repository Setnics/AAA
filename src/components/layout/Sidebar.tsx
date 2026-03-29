import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Proyectos', icon: '📋' },
  { path: '/catalogo', label: 'Catálogo', icon: '📦' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">⚡</div>
        <span className="sidebar__logo-text">SEITE</span>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            className={`sidebar__nav-item ${
              isActive(item.path) ? 'sidebar__nav-item--active' : ''
            }`}
            onClick={() => navigate(item.path)}
          >
            <span className="sidebar__nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
        <div className="text-sm text-muted">SEITE v2.0</div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
          Estimación Eléctrica
        </div>
      </div>
    </aside>
  );
}
