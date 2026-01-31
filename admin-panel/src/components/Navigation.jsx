import { useState } from 'react';
import '../styles/Navigation.css';

export function Navigation({ currentPage, onPageChange, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);

  const pages = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'reports', label: '📋 Reports' },
    { id: 'users', label: '👥 Users' },
    { id: 'rooms', label: '💬 Rooms' },
    { id: 'announcements', label: '📢 Announcements' },
    { id: 'transactions', label: '💰 Transactions' },
    { id: 'gifts', label: '💝 Gifts' },
    { id: 'settings', label: '⚙️ Settings' },
  ];

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <h1>MigX Admin Panel</h1>
        </div>

        <button className="nav-toggle" onClick={() => setShowMenu(!showMenu)}>
          ☰
        </button>

        <div className={`nav-menu ${showMenu ? 'active' : ''}`}>
          <div className="nav-links">
            {pages.map((page) => (
              <button
                key={page.id}
                className={`nav-link ${currentPage === page.id ? 'active' : ''}`}
                onClick={() => {
                  onPageChange(page.id);
                  setShowMenu(false);
                }}
              >
                {page.label}
              </button>
            ))}
          </div>

          <div className="nav-actions">
            <button className="btn-logout" onClick={onLogout}>
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
