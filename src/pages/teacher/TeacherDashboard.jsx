/**
 * TeacherDashboard — Painel do Professor (Modo Demonstração)
 *
 * TODO: Esta tela usa dados de exemplo (hardcoded) para fins de demonstração.
 * No futuro, quando houver um banco de dados real (ex: Supabase), este componente
 * deverá consumir dados reais de múltiplos alunos via API/banco:
 *   - Buscar todos os alunos da turma do professor logado
 *   - Agregar tarefas, sessões de foco e progresso de cada aluno
 *   - Exibir dados em tempo real, com filtros por turma/período
 *
 * Estrutura sugerida da query futura:
 *   SELECT students, AVG(tasks_completed), SUM(focus_minutes)
 *   FROM student_progress
 *   WHERE teacher_id = $teacherId AND class_id = $classId
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, GraduationCap, Users, CheckSquare, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_STUDENTS = [
  { id: 1, name: 'Ana Vitória',     tasksCompleted: 12, tasksPending: 3, focusMinutes: 340, lastActive: '2026-08-17', streak: 5 },
  { id: 2, name: 'Bruno Oliveira', tasksCompleted: 7,  tasksPending: 8, focusMinutes: 180, lastActive: '2026-08-16', streak: 2 },
  { id: 3, name: 'Carla Santos',   tasksCompleted: 15, tasksPending: 1, focusMinutes: 510, lastActive: '2026-08-17', streak: 7 },
  { id: 4, name: 'Diego Almeida',  tasksCompleted: 4,  tasksPending: 12,focusMinutes: 95,  lastActive: '2026-08-14', streak: 0 },
  { id: 5, name: 'Elisa Ferreira', tasksCompleted: 10, tasksPending: 5, focusMinutes: 280, lastActive: '2026-08-17', streak: 3 },
  { id: 6, name: 'Felipe Costa',   tasksCompleted: 8,  tasksPending: 4, focusMinutes: 225, lastActive: '2026-08-15', streak: 1 },
  { id: 7, name: 'Giovanna Lima',  tasksCompleted: 18, tasksPending: 0, focusMinutes: 620, lastActive: '2026-08-17', streak: 10 },
  { id: 8, name: 'Hugo Mendes',    tasksCompleted: 3,  tasksPending: 14,focusMinutes: 60,  lastActive: '2026-08-12', streak: 0 },
];

const DEMO_UPCOMING = [
  { id: 1, title: 'Prova de Algoritmos', date: '2026-08-20', type: 'Prova', subject: 'Algoritmos' },
  { id: 2, title: 'Entrega do Trabalho de Redes', date: '2026-08-22', type: 'Trabalho', subject: 'Redes' },
  { id: 3, title: 'Seminário sobre Hardware', date: '2026-08-25', type: 'Seminário', subject: 'Hardware' },
];

function formatMin(m) {
  if (m < 60) return `${m}min`;
  return `${Math.floor(m / 60)}h ${m % 60 > 0 ? m % 60 + 'min' : ''}`.trim();
}

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('name');

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const totalTasks = DEMO_STUDENTS.reduce((a, s) => a + s.tasksCompleted + s.tasksPending, 0);
  const totalCompleted = DEMO_STUDENTS.reduce((a, s) => a + s.tasksCompleted, 0);
  const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
  const avgFocus = Math.round(DEMO_STUDENTS.reduce((a, s) => a + s.focusMinutes, 0) / DEMO_STUDENTS.length);
  const atRiskStudents = DEMO_STUDENTS.filter(s => {
    const daysAgo = Math.floor((new Date() - new Date(s.lastActive)) / 86400000);
    return daysAgo >= 3 || s.tasksPending >= 10;
  });

  const sorted = [...DEMO_STUDENTS].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'tasks') return b.tasksCompleted - a.tasksCompleted;
    if (sortBy === 'focus') return b.focusMinutes - a.focusMinutes;
    if (sortBy === 'streak') return b.streak - a.streak;
    return 0;
  });

  const initials = user?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* ─── Header ──────────────────────────────── */}
      <header style={{
        background: 'var(--color-sidebar-bg)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        height: 64,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'var(--color-primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={20} color="white" />
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>CETEP Tech Study</div>
            <div style={{ color: 'var(--color-sidebar-text)', fontSize: '0.72rem', opacity: 0.8 }}>Painel do Professor</div>
          </div>
        </div>

        <div style={{ marginLeft: 16 }}>
          <span style={{
            background: 'hsl(38, 80%, 50%)',
            color: 'white',
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 20,
            letterSpacing: '0.05em',
          }}>
            MODO DEMONSTRAÇÃO
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600 }}>{user?.name}</div>
            <div style={{ color: 'var(--color-sidebar-text)', fontSize: '0.72rem', opacity: 0.7 }}>Professor</div>
          </div>
          <div style={{ width: 36, height: 36, background: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>
            {initials}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
            style={{ color: 'var(--color-sidebar-text)' }}
            id="teacher-logout-btn"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Demo notice */}
        <div className="alert alert-info" style={{ marginBottom: 28 }}>
          <TrendingUp size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Painel de demonstração</strong> — Os dados abaixo são exemplos fictícios para ilustrar como o painel funcionará.
            Quando integrado a um banco de dados real, exibirá dados reais de todos os alunos da turma.
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ marginBottom: 4 }}>Visão da Turma</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Técnico em Informática — Turma 2026 · {DEMO_STUDENTS.length} alunos</p>
        </div>

        {/* ─── Summary Stats ────────────────────── */}
        <div className="grid-4" style={{ marginBottom: 28 }}>
          {[
            {
              icon: <Users size={20} />,
              label: 'Alunos ativos',
              value: DEMO_STUDENTS.filter(s => {
                const d = Math.floor((new Date() - new Date(s.lastActive)) / 86400000);
                return d <= 2;
              }).length,
              sub: `de ${DEMO_STUDENTS.length} total`,
              color: 'hsl(220, 80%, 55%)', bg: 'hsl(220, 80%, 95%)',
            },
            {
              icon: <CheckSquare size={20} />,
              label: 'Taxa de conclusão',
              value: `${completionRate}%`,
              sub: `${totalCompleted} de ${totalTasks} tarefas`,
              color: 'hsl(142, 70%, 38%)', bg: 'hsl(142, 60%, 92%)',
            },
            {
              icon: <Clock size={20} />,
              label: 'Foco médio por aluno',
              value: formatMin(avgFocus),
              sub: 'total acumulado',
              color: 'hsl(38, 90%, 45%)', bg: 'hsl(38, 90%, 93%)',
            },
            {
              icon: <AlertTriangle size={20} />,
              label: 'Alunos em risco',
              value: atRiskStudents.length,
              sub: 'inativos ou com atraso',
              color: 'hsl(0, 75%, 50%)', bg: 'hsl(0, 75%, 94%)',
            },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className="stat-card-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid-2" style={{ gap: 24, marginBottom: 28 }}>
          {/* ─── Upcoming deadlines ──────────────── */}
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>📅 Próximos prazos da turma</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {DEMO_UPCOMING.map(ev => (
                <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{ev.title}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <span className="chip">{ev.type}</span>
                      <span className="chip">{ev.subject}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {new Date(ev.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Class completion bar chart ──────── */}
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>📊 Conclusão de tarefas por aluno</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...DEMO_STUDENTS].sort((a, b) => b.tasksCompleted - a.tasksCompleted).slice(0, 5).map(s => {
                const total = s.tasksCompleted + s.tasksPending;
                const pct = total > 0 ? Math.round((s.tasksCompleted / total) * 100) : 0;
                return (
                  <div key={s.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{s.name}</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{s.tasksCompleted}/{total} ({pct}%)</span>
                    </div>
                    <div className="progress-bar" style={{ height: 7 }}>
                      <div
                        className={`progress-fill ${pct >= 70 ? 'progress-fill-success' : pct >= 40 ? '' : 'progress-fill-warning'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Students table ───────────────────── */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3>Detalhes por aluno</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Ordenar por:</span>
              <select className="form-select" style={{ width: 'auto', fontSize: '0.85rem', padding: '6px 10px' }} value={sortBy} onChange={e => setSortBy(e.target.value)} id="teacher-sort-select">
                <option value="name">Nome</option>
                <option value="tasks">Tarefas</option>
                <option value="focus">Tempo de foco</option>
                <option value="streak">Sequência</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  {['Aluno', 'Tarefas concluídas', 'Pendentes', 'Foco total', 'Sequência', 'Último acesso', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--color-text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => {
                  const daysAgo = Math.floor((new Date() - new Date(s.lastActive)) / 86400000);
                  const atRisk = daysAgo >= 3 || s.tasksPending >= 10;
                  const total = s.tasksCompleted + s.tasksPending;
                  const pct = total > 0 ? Math.round((s.tasksCompleted / total) * 100) : 0;
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-bg-subtle)', transition: 'background 0.1s' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                            {s.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          {s.name}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600 }}>{s.tasksCompleted}</span>
                          <span className={`badge ${pct >= 70 ? 'badge-success' : pct >= 40 ? 'badge-warning' : 'badge-danger'}`}>{pct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ color: s.tasksPending >= 10 ? 'var(--color-danger)' : 'var(--color-text)' }}>
                          {s.tasksPending}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{formatMin(s.focusMinutes)}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {s.streak > 0 ? <span style={{ fontSize: '0.9rem' }}>🔥</span> : null}
                          <span style={{ fontWeight: s.streak >= 5 ? 700 : 400, color: s.streak >= 5 ? 'hsl(15, 85%, 45%)' : 'var(--color-text)' }}>
                            {s.streak} dias
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        {daysAgo === 0 ? 'Hoje' : daysAgo === 1 ? 'Ontem' : `Há ${daysAgo} dias`}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {atRisk
                          ? <span className="badge badge-danger">⚠ Atenção</span>
                          : <span className="badge badge-success">✓ Ativo</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
