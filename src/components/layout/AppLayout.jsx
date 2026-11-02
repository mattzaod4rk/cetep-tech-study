import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Calendar, Timer,
  TrendingUp, Settings, LogOut, GraduationCap, Mic, BookOpen, Flame, Users, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useApp } from '../../contexts/AppContext.jsx';
import AccessibilityBar from '../accessibility/AccessibilityBar.jsx';
import LiveTranscriptionModal from '../accessibility/LiveTranscriptionModal.jsx';

const ACADEMIC_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
  { to: '/math',      icon: BookOpen,        label: 'Cadernos de Estudo' },
  { to: '/focus',     icon: Timer,           label: 'Sessão de Foco' },
];

const ORGANIZATION_NAV = [
  { to: '/tasks',     icon: CheckSquare,     label: 'Atividades' },
  { to: '/agenda',    icon: Calendar,        label: 'Horário & Agenda' },
  { to: '/progress',  icon: TrendingUp,      label: 'Desempenho' },
  { to: '/settings',  icon: Settings,        label: 'Configurações' },
];

const MOBILE_NAV = [...ACADEMIC_NAV, ...ORGANIZATION_NAV];

function formatRoleLabel(role) {
  if (role === 'admin') return 'Administrador · CETEP';
  if (role === 'professor') return 'Professor(a) · AEE / CETEP';
  return 'Estudante · Técnico em Informática';
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { gamification, isTranscriptionOpen, setIsTranscriptionOpen } = useApp();
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

  const isStaff = user?.role === 'professor' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="app-shell">
      {/* ── Desktop Sidebar ──────────────────────────────── */}
      <aside className="sidebar" role="navigation" aria-label="Navegação principal">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" aria-hidden="true">
            <GraduationCap size={19} color="white" />
          </div>
          <div className="sidebar-logo-text">
            CETEP Tech Study
            <span>Recôncavo II · Alberto Torres</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Ambiente de Estudo</div>
          {ACADEMIC_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              aria-label={label}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </NavLink>
          ))}

          <div className="sidebar-section-label" style={{ marginTop: 10 }}>Organização Escolar</div>
          {ORGANIZATION_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              aria-label={label}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </NavLink>
          ))}

          {isStaff && (
            <>
              <div className="sidebar-section-label" style={{ marginTop: 10 }}>Gestão Institucional</div>
              <NavLink
                to="/teacher"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                id="sidebar-teacher-link"
              >
                <Users size={17} aria-hidden="true" />
                Painel Docente
              </NavLink>
              {isAdmin && (
                <NavLink
                  to="/teacher?tab=admin"
                  className="nav-item"
                  id="sidebar-admin-link"
                >
                  <ShieldCheck size={17} aria-hidden="true" />
                  Administração & Perfis
                </NavLink>
              )}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          {gamification && (
            <div
              style={{
                padding: '10px 12px',
                marginBottom: '10px',
                borderRadius: 7,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ color: 'var(--color-sidebar-text)', fontSize: '0.73rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Flame size={13} color="#f97316" />
                  {gamification.streakDays || 0}d sequência
                </span>
                <span style={{ color: '#ffffff', fontSize: '0.73rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {gamification.points} XP
                </span>
              </div>
              <div className="progress-bar" style={{ height: '4px', background: 'rgba(255,255,255,0.12)', border: 'none' }}>
                <div
                  className="progress-fill"
                  style={{
                    background: 'var(--color-sidebar-active)',
                    width: gamification.levelInfo?.next
                      ? `${Math.min(100, (gamification.points / gamification.levelInfo.next) * 100)}%`
                      : '100%',
                  }}
                />
              </div>
              <div style={{ marginTop: 5, fontSize: '0.68rem', color: 'var(--color-sidebar-text)', opacity: 0.75 }}>
                Nível {gamification.levelInfo?.level || 1} · {gamification.levelInfo?.title || 'Iniciante'}
              </div>
            </div>
          )}

          <div
            className="user-chip"
            onClick={handleLogout}
            title="Sair da conta"
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && handleLogout()}
          >
            <div className="user-avatar" aria-hidden="true">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{formatRoleLabel(user?.role)}</div>
            </div>
            <LogOut size={15} color="var(--color-sidebar-text)" aria-hidden="true" style={{ opacity: 0.65 }} />
          </div>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────── */}
      <div className="main-content">
        <AccessibilityBar />
        <div className="page-content">
          <Outlet />
        </div>
      </div>

      {/* ── Live Voice Transcription Modal (AEE) ─────────── */}
      <LiveTranscriptionModal
        isOpen={isTranscriptionOpen}
        onClose={() => setIsTranscriptionOpen(false)}
      />

      {/* ── Mobile Bottom Nav ────────────────────────────── */}
      <nav className="bottom-nav" aria-label="Navegação mobile">
        <div className="bottom-nav-inner">
          {MOBILE_NAV.slice(0, 5).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
              aria-label={label}
            >
              <Icon size={20} aria-hidden="true" />
              {label.split(' ')[0]}
            </NavLink>
          ))}
          {isStaff ? (
            <NavLink
              to="/teacher"
              className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
              aria-label="Painel Docente"
            >
              <Users size={20} aria-hidden="true" />
              Docente
            </NavLink>
          ) : (
            <button
              type="button"
              onClick={() => setIsTranscriptionOpen(prev => !prev)}
              className={`bottom-nav-item ${isTranscriptionOpen ? 'active' : ''}`}
              aria-label="Legendas de voz ao vivo"
            >
              <Mic size={20} aria-hidden="true" />
              Legenda
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
