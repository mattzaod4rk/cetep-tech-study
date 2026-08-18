import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Timer, Calendar, FileText, CheckSquare,
  BookOpen, Clock, Target, Zap, AlertTriangle, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import * as DataService from '../services/DataService.js';
import { formatDateBR, relativeDays, isWithinDays, isOverdue, formatMinutes } from '../utils/dates.js';
import TaskModal from '../components/tasks/TaskModal.jsx';
import SummarizeModal from '../components/SummarizeModal.jsx';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user } = useAuth();
  const { gamification, awardPoints } = useApp();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showSummarize, setShowSummarize] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    try {
      const t = DataService.getTasks(user.id);
      const e = DataService.getAgendaEvents(user.id);
      const s = DataService.getWeeklyStats(user.id);
      setTasks(t);
      setEvents(e);
      setStats(s);
    } catch (err) {
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().split('T')[0];

  const todayTasks = tasks.filter(t =>
    t.status === 'pending' && t.deadline && t.deadline === today
  );
  const upcomingTasks = tasks.filter(t =>
    t.status === 'pending' && t.deadline && isWithinDays(t.deadline, 7) && t.deadline !== today
  ).sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 5);
  const overdueTasks = tasks.filter(t =>
    t.status === 'pending' && t.deadline && isOverdue(t.deadline)
  );
  const upcomingEvents = events.filter(e =>
    isWithinDays(e.date, 7)
  ).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const urgentEvents = events.filter(e => isWithinDays(e.date, 3));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = user.name.split(' ')[0];

  const handleCompleteTask = async (taskId) => {
    DataService.completeTask(user.id, taskId);
    const result = awardPoints(10, 'task');
    toast.success('Tarefa concluída! +10 pts 🎉');
    if (result.newAchievements?.length > 0) {
      result.newAchievements.forEach(a => {
        setTimeout(() => toast.success(`🏆 Conquista: ${a.title} (+${a.points} pts)`, { duration: 5000 }), 800);
      });
    }
    load();
  };

  const handleTaskCreated = () => {
    load();
    setShowTaskModal(false);
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      {/* ─── Header ─────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>{greeting}, {firstName}! 👋</h1>
          <p>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowTaskModal(true)} id="dashboard-new-task-btn">
          <Plus size={18} /> Nova tarefa
        </button>
      </div>

      {/* ─── Alerts ──────────────────────────────── */}
      {overdueTasks.length > 0 && (
        <div className="alert alert-danger" role="alert">
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>{overdueTasks.length} tarefa{overdueTasks.length > 1 ? 's' : ''} em atraso!</strong>{' '}
            Acesse <button onClick={() => navigate('/tasks')} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Tarefas</button> para verificar.
          </div>
        </div>
      )}
      {urgentEvents.length > 0 && (
        <div className="alert alert-warning" role="alert">
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>{urgentEvents.length} evento{urgentEvents.length > 1 ? 's' : ''} nos próximos 3 dias:</strong>{' '}
            {urgentEvents.map(e => e.title).join(', ')}.
          </div>
        </div>
      )}

      {/* ─── Stats ───────────────────────────────── */}
      <div className="grid-4 mb-32">
        {[
          {
            icon: <Clock size={22} />,
            label: 'Tempo estudado',
            value: formatMinutes(stats?.totalMinutesThisWeek || 0),
            sub: 'acumulado esta semana',
            color: 'hsl(224, 76%, 50%)',
            bg: 'hsl(224, 85%, 96%)',
            featured: true,
            badge: 'Principal',
          },
          {
            icon: <Target size={22} />,
            label: 'Tarefas concluídas',
            value: stats?.completedThisWeek || 0,
            sub: 'nesta semana',
            color: 'hsl(145, 68%, 38%)',
            bg: 'hsl(145, 60%, 93%)',
            featured: true,
            badge: 'Meta',
          },
          {
            icon: <Timer size={20} />,
            label: 'Sessões de foco',
            value: stats?.focusSessionsThisWeek || 0,
            sub: 'nesta semana',
            color: 'hsl(38, 92%, 46%)',
            bg: 'hsl(38, 90%, 94%)',
            featured: false,
          },
          {
            icon: <Zap size={20} />,
            label: 'Pontuação total',
            value: gamification?.points || 0,
            sub: `Nível ${gamification?.levelInfo?.level || 1} · ${gamification?.levelInfo?.title || 'Iniciante'}`,
            color: 'hsl(280, 70%, 55%)',
            bg: 'hsl(280, 70%, 94%)',
            featured: false,
          },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.featured ? 'stat-card-featured' : ''}`}>
            <div className="flex items-center justify-between" style={{ width: '100%' }}>
              <div className="stat-card-icon" style={{ background: s.bg, color: s.color, borderColor: s.color }}>
                {s.icon}
              </div>
              {s.badge && (
                <span className="badge badge-primary" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                  {s.badge}
                </span>
              )}
            </div>
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={s.featured ? { color: s.color } : {}}>{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Action Buttons ───────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--color-primary-light)', color: 'var(--color-primary)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem'
          }}>⚡</span>
          Ações rápidas
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {[
            { label: 'Nova tarefa', desc: 'Criar e organizar tarefas', icon: <Plus size={20} />, action: () => setShowTaskModal(true), id: 'quick-new-task', color: 'hsl(224, 76%, 50%)', bg: 'hsl(224, 85%, 96%)' },
            { label: 'Agenda', desc: 'Ver provas e eventos', icon: <Calendar size={20} />, action: () => navigate('/agenda'), id: 'quick-agenda', color: 'hsl(145, 68%, 38%)', bg: 'hsl(145, 60%, 93%)' },
            { label: 'Modo Foco', desc: 'Iniciar sessão pomodoro', icon: <Timer size={20} />, action: () => navigate('/focus'), id: 'quick-focus', color: 'hsl(38, 92%, 46%)', bg: 'hsl(38, 90%, 94%)' },
            { label: 'Resumir texto', desc: 'Extrair tópicos de texto', icon: <FileText size={20} />, action: () => setShowSummarize(true), id: 'quick-summarize', color: 'hsl(280, 70%, 55%)', bg: 'hsl(280, 70%, 94%)' },
          ].map(btn => (
            <button
              key={btn.id}
              id={btn.id}
              className="card card-flat"
              onClick={btn.action}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '16px 18px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-card)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = btn.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: btn.bg, color: btn.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                border: `1px solid ${btn.color}33`,
              }}>
                {btn.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-text)', marginBottom: 2 }}>{btn.label}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>{btn.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Today's Tasks + Upcoming Events ────── */}
      <div className="grid-2" style={{ gap: 28 }}>
        {/* Today's tasks */}
        <div>
          <div className="flex items-center justify-between mb-16">
            <h3 className="flex items-center gap-8">
              <span style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'hsl(145, 60%, 93%)', color: 'hsl(145, 68%, 38%)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CheckSquare size={16} />
              </span>
              Tarefas de hoje
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>
              Ver todas <ChevronRight size={14} />
            </button>
          </div>

          {todayTasks.length === 0 ? (
            <div className="card card-flat" style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.6rem', marginBottom: 8 }}>✅</p>
              <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
                Nenhuma tarefa com prazo para hoje. Você está em dia!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayTasks.map(task => (
                <div key={task.id} className="task-item">
                  <div className={`task-left-bar priority-bar-${task.priority}`} />
                  <div style={{ paddingLeft: 4 }}>
                    <button
                      className="checkbox-wrapper"
                      onClick={() => handleCompleteTask(task.id)}
                      style={{ marginRight: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      aria-label={`Concluir tarefa: ${task.title}`}
                    >
                      <div className="checkbox-custom" />
                    </button>
                  </div>
                  <div className="task-content">
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      {task.subject && <span className="chip">{task.subject}</span>}
                      <span className={`badge badge-${task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'success'}`}>
                        {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming tasks */}
          {upcomingTasks.length > 0 && (
            <>
              <h4 style={{ marginTop: 20, marginBottom: 10, color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                Próximos prazos
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {upcomingTasks.map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                    <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{t.title}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{relativeDays(t.deadline)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Upcoming events */}
        <div>
          <div className="flex items-center justify-between mb-16">
            <h3 className="flex items-center gap-8">
              <span style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Calendar size={16} />
              </span>
              Próximos eventos
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/agenda')}>
              Ver agenda <ChevronRight size={14} />
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="card card-flat" style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.6rem', marginBottom: 8 }}>📅</p>
              <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
                Nenhum evento nos próximos 7 dias. Aproveite!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingEvents.map(ev => (
                <div key={ev.id} className="card card-flat" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{ev.title}</span>
                    <span className={`badge ${isWithinDays(ev.date, 2) ? 'badge-danger' : isWithinDays(ev.date, 5) ? 'badge-warning' : 'badge-neutral'}`}>
                      {relativeDays(ev.date)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {ev.subject && <span className="chip">{ev.subject}</span>}
                    <span className="chip">{ev.type}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{formatDateBR(ev.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Weekly progress bar */}
          {stats && (
            <div className="card" style={{ marginTop: 20, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={16} /> Progresso semanal
                </h4>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                  {formatMinutes(stats.totalMinutesThisWeek)} estudados
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 40 }}>
                {stats.dailyMinutes.map((min, i) => {
                  const max = Math.max(...stats.dailyMinutes, 1);
                  const pct = (min / max) * 100;
                  const isToday = i === 6;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div
                        style={{
                          width: '100%',
                          height: `${Math.max(pct, 4)}%`,
                          minHeight: 4,
                          background: isToday ? 'var(--color-primary)' : 'var(--color-primary-muted)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.4s',
                        }}
                        title={`${min}min`}
                      />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.68rem', color: i === 6 ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: i === 6 ? 700 : 400 }}>{d}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modals ──────────────────────────────── */}
      {showTaskModal && (
        <TaskModal onClose={() => setShowTaskModal(false)} onSave={handleTaskCreated} />
      )}
      {showSummarize && (
        <SummarizeModal onClose={() => setShowSummarize(false)} />
      )}
    </div>
  );
}
