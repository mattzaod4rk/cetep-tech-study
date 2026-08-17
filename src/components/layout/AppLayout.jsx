import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Calendar, Timer,
  TrendingUp, Settings, LogOut, GraduationCap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useApp } from '../../contexts/AppContext.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks',     icon: CheckSquare,    label: 'Tarefas'   },
  { to: '/agenda',    icon: Calendar,       label: 'Agenda'    },
  { to: '/focus',     icon: Timer,          label: 'Modo Foco' },
  { to: '/progress',  icon: TrendingUp,     label: 'Progresso' },
  { to: '/settings',  icon: Settings,       label: 'Configurações' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { gamification } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const initials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="app-shell">
      {/* ── Desktop Sidebar ──────────────────────────────── */}
      <aside className="sidebar" role="navigation" aria-label="Navegação principal">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" aria-hidden="true">
            <GraduationCap size={20} color="white" />
          </div>
          <div className="sidebar-logo-text">
            CETEP Tech Study
            <span>Técnico em Informática</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              aria-label={label}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {gamification && (
            <div style={{ padding: '8px 12px 12px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--color-sidebar-text)', fontSize: '0.75rem', fontWeight: 600 }}>
                  {gamification.levelInfo?.title || 'Iniciante'}
                </span>
                <span style={{ color: 'var(--color-sidebar-active)', fontSize: '0.75rem', fontWeight: 700 }}>
                  {gamification.points} pts
                </span>
              </div>
              <div className="progress-bar" style={{ height: '4px', background: 'rgba(255,255,255,0.15)' }}>
                <div
                  className="progress-fill"
                  style={{
                    width: gamification.levelInfo?.next
                      ? `${Math.min(100, (gamification.points / gamification.levelInfo.next) * 100)}%`
                      : '100%',
                  }}
                />
              </div>
            </div>
          )}

          <div className="user-chip" onClick={handleLogout} title="Sair da conta" role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && handleLogout()}>
            <div className="user-avatar" aria-hidden="true">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role === 'aluno' ? 'Aluno' : 'Professor'}</div>
            </div>
            <LogOut size={16} color="var(--color-sidebar-text)" aria-hidden="true" style={{ opacity: 0.6 }} />
          </div>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────── */}
      <div className="main-content">
        <div className="page-content">
          <Outlet />
        </div>
      </div>

      {/* ── Mobile Bottom Nav ────────────────────────────── */}
      <nav className="bottom-nav" aria-label="Navegação mobile">
        <div className="bottom-nav-inner">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
              aria-label={label}
            >
              <Icon size={22} aria-hidden="true" />
              {label === 'Configurações' ? 'Config.' : label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
