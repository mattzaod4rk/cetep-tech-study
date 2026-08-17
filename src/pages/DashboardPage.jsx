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
      <div className="grid-4 mb-24" style={{ marginBottom: 24 }}>
        {[
          {
            icon: <Target size={20} />,
            label: 'Tarefas concluídas',
            value: stats?.completedThisWeek || 0,
            sub: 'nesta semana',
            color: 'hsl(220, 80%, 55%)',
            bg: 'hsl(220, 80%, 95%)',
          },
          {
            icon: <Clock size={20} />,
            label: 'Tempo estudado',
            value: formatMinutes(stats?.totalMinutesThisWeek || 0),
            sub: 'nesta semana',
            color: 'hsl(142, 70%, 38%)',
            bg: 'hsl(142, 60%, 92%)',
          },
          {
            icon: <Timer size={20} />,
            label: 'Sessões de foco',
            value: stats?.focusSessionsThisWeek || 0,
            sub: 'nesta semana',
            color: 'hsl(38, 90%, 45%)',
            bg: 'hsl(38, 90%, 93%)',
          },
          {
            icon: <Zap size={20} />,
            label: 'Pontos',
            value: gamification?.points || 0,
            sub: gamification?.levelInfo?.title || 'Iniciante',
            color: 'hsl(280, 70%, 55%)',
            bg: 'hsl(280, 70%, 93%)',
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

      {/* ─── Action Buttons ───────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 14 }}>Ações rápidas</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Nova tarefa', icon: <Plus size={18} />, action: () => setShowTaskModal(true), id: 'quick-new-task' },
            { label: 'Agenda', icon: <Calendar size={18} />, action: () => navigate('/agenda'), id: 'quick-agenda' },
            { label: 'Modo Foco', icon: <Timer size={18} />, action: () => navigate('/focus'), id: 'quick-focus' },
            { label: 'Resumir texto', icon: <FileText size={18} />, action: () => setShowSummarize(true), id: 'quick-summarize' },
          ].map(btn => (
            <button key={btn.id} id={btn.id} className="btn btn-secondary" onClick={btn.action}>
              {btn.icon} {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Today's Tasks + Upcoming Events ────── */}
      <div className="grid-2" style={{ gap: 20 }}>
        {/* Today's tasks */}
        <div>
          <div className="flex items-center justify-between mb-12">
            <h3 className="flex items-center gap-8">
              <CheckSquare size={18} className="text-primary" /> Tarefas de hoje
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
          <div className="flex items-center justify-between mb-12">
            <h3 className="flex items-center gap-8">
              <Calendar size={18} className="text-primary" /> Próximos eventos
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
