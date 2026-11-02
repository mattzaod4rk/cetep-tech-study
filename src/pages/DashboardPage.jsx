import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Timer, Calendar, FileText, CheckSquare,
  BookOpen, Clock, Target, Zap, AlertTriangle,
  ChevronRight, Flame, Shield, CheckCircle2, GraduationCap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import * as DataService from '../services/DataService.js';
import {
  formatDateBR, relativeDays, isWithinDays, isOverdue,
  formatMinutes, todayISO, parseLocalDate, SHORT_WEEKDAYS, WEEKDAYS
} from '../utils/dates.js';
import { getStudyHubTabForSubject } from '../utils/subjects.js';
import TaskModal from '../components/tasks/TaskModal.jsx';
import SummarizeModal from '../components/SummarizeModal.jsx';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user } = useAuth();
  const { gamification, completeTaskWithReward, refreshGamification, syncRevision } = useApp();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showSummarize, setShowSummarize] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    try {
      const t = DataService.getTasks(user.id);
      const e = DataService.getAgendaEvents(user.id);
      const s = DataService.getWeeklyStats(user.id);
      const p = DataService.getWeeklyPlan(user.id);
      setTasks(t);
      setEvents(e);
      setStats(s);
      setWeeklyPlan(p);
      refreshGamification();
    } catch {
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [user.id, refreshGamification]);

  useEffect(() => { load(); }, [load, syncRevision]);

  const today = todayISO();
  const todayDayIndex = new Date().getDay();
  const todayPlan = weeklyPlan?.[todayDayIndex] || { subjects: [], goalMinutes: 0, note: '' };
  const todayMinutesStudied = stats?.dailyMinutes?.[6] || 0;

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
    const result = completeTaskWithReward(taskId);
    if (result.awarded) {
      toast.success(`Atividade concluída (+${result.points} XP).`);
      result.newAchievements?.forEach(a => {
        setTimeout(() => toast.success(`Conquista desbloqueada: ${a.title} (+${a.points} XP)`, { duration: 5000 }), 800);
      });
    } else {
      toast('Atividade já concluída anteriormente.');
    }
    load();
  };

  const handleTaskCreated = () => {
    load();
    setShowTaskModal(false);
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const streakDays = gamification?.streakDays || 0;
  const streakShields = gamification?.streakShields ?? 1;
  const weekStreak = gamification?.weekStreak || [];
  const studiedToday = gamification?.lastActiveDate === today;

  return (
    <div>
      {/* ─── Institutional Academic Header ──────── */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="academic-kicker">
            <GraduationCap size={14} />
            CETEP Recôncavo II Alberto Torres · Técnico em Informática
          </div>
          <h1>{greeting}, {firstName}</h1>
          <p style={{ textTransform: 'capitalize' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setShowSummarize(true)} id="quick-summarize">
            <FileText size={16} /> Resumir texto
          </button>
          <button className="btn btn-primary" onClick={() => setShowTaskModal(true)} id="dashboard-new-task-btn">
            <Plus size={16} /> Nova atividade
          </button>
        </div>
      </div>

      {/* ─── Alerts ──────────────────────────────── */}
      {overdueTasks.length > 0 && (
        <div className="alert alert-danger" role="alert">
          <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>{overdueTasks.length} atividade{overdueTasks.length > 1 ? 's' : ''} com prazo vencido.</strong>{' '}
            Acesse <button onClick={() => navigate('/tasks')} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Atividades</button> para regularizar.
          </div>
        </div>
      )}
      {urgentEvents.length > 0 && (
        <div className="alert alert-warning" role="alert">
          <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Avaliações ou entregas nos próximos 3 dias:</strong>{' '}
            {urgentEvents.map(e => e.title).join(', ')}.
          </div>
        </div>
      )}

      {/* ─── Top Academic Summary Row: Cronograma de Hoje + Constância Diária ── */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Card 1: Cronograma de Hoje (Matriz LDB + SUPROT/SEC-BA) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14, borderLeft: '4px solid var(--color-primary)' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span className="badge badge-primary">
                Cronograma de Hoje · {WEEKDAYS[todayDayIndex]}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigate('/agenda?tab=planner')}
                id="dashboard-edit-plan-btn"
              >
                Configurar grade <ChevronRight size={14} />
              </button>
            </div>
            <h3 style={{ fontSize: '1.05rem', marginBottom: 4 }}>
              {todayPlan.subjects?.length > 0
                ? todayPlan.subjects.join(' · ')
                : 'Horário livre para revisão'}
            </h3>
            {todayPlan.note && (
              <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                Foco sugerido: {todayPlan.note}
              </p>
            )}
          </div>

          {todayPlan.goalMinutes > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 5 }}>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Progresso da meta diária</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                  {todayMinutesStudied} / {todayPlan.goalMinutes} min
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min(100, (todayMinutesStudied / todayPlan.goalMinutes) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {todayPlan.subjects?.length > 0 ? (
              <>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() =>
                    navigate(
                      `/focus?subject=${encodeURIComponent(todayPlan.subjects[0])}&minutes=${todayPlan.goalMinutes || 25}`
                    )
                  }
                >
                  <Timer size={14} /> Iniciar Sessão ({todayPlan.goalMinutes || 25} min)
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/math?tab=${getStudyHubTabForSubject(todayPlan.subjects[0])}`)}
                >
                  <BookOpen size={14} /> Abrir Caderno da Disciplina
                </button>
              </>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/math')}>
                <BookOpen size={14} /> Acessar Cadernos de Estudo
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Constância Diária (Sequência + Escudo AEE) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: studiedToday ? 'var(--color-warning-light)' : 'var(--color-bg-subtle)',
                  color: studiedToday ? 'var(--color-warning)' : 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Flame size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                  {streakDays} {streakDays === 1 ? 'dia consecutivo de estudo' : 'dias consecutivos de estudo'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  {studiedToday
                    ? 'Presença acadêmica de hoje registrada.'
                    : 'Conclua 1 atividade, exercício ou sessão de foco hoje para contabilizar.'}
                </div>
              </div>
            </div>

            <div
              className="badge badge-neutral"
              title="Proteção de Constância (AEE): preserva sua sequência automaticamente caso você se ausente por 1 dia."
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
            >
              <Shield size={12} style={{ color: 'var(--color-primary)' }} />
              <span>Proteção: {streakShields}/2</span>
            </div>
          </div>

          {/* Registro de frequência dos últimos 7 dias */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, paddingTop: 2 }}>
            {weekStreak.map(dayItem => {
              const isDone = dayItem.status === 'active';
              const isShield = dayItem.status === 'shield';
              const isTodayPending = dayItem.status === 'today_pending';
              return (
                <div
                  key={dayItem.date}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 4px',
                    borderRadius: 6,
                    border: dayItem.isToday ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: isDone
                      ? 'var(--color-success-light)'
                      : isShield
                        ? 'var(--color-info-light)'
                        : isTodayPending
                          ? 'var(--color-primary-light)'
                          : 'var(--color-bg-input)',
                  }}
                  title={`${dayItem.dayShort} (${formatDateBR(dayItem.date)}): ${
                    isDone ? 'Estudo registrado' : isShield ? 'Dia protegido' : isTodayPending ? 'Hoje (pendente)' : 'Sem registro'
                  }`}
                >
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: dayItem.isToday ? 700 : 600,
                      color: dayItem.isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {dayItem.dayShort}
                  </span>
                  <div
                    style={{
                      height: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: isDone
                        ? 'var(--color-success)'
                        : isShield
                          ? 'var(--color-info)'
                          : 'var(--color-text-muted)',
                    }}
                  >
                    {isDone ? <CheckCircle2 size={15} /> : isShield ? <Shield size={14} /> : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Indicadores Semanais (4 caixas métricas sóbrias) ─── */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          {
            icon: <Clock size={17} />,
            label: 'Carga horária na semana',
            value: formatMinutes(stats?.totalMinutesThisWeek || 0),
            sub: 'Tempo dedicado em sessões',
          },
          {
            icon: <Target size={17} />,
            label: 'Atividades concluídas',
            value: stats?.completedThisWeek || 0,
            sub: 'Entregas nos últimos 7 dias',
          },
          {
            icon: <Timer size={17} />,
            label: 'Ciclos de foco',
            value: stats?.focusSessionsThisWeek || 0,
            sub: 'Sessões validadas (mín. 5m)',
          },
          {
            icon: <Zap size={17} />,
            label: 'Pontuação acumulada',
            value: `${gamification?.points || 0} XP`,
            sub: `Nível ${gamification?.levelInfo?.level || 1} · ${gamification?.levelInfo?.title || 'Iniciante'}`,
          },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="stat-label">{s.label}</span>
              <div className="stat-card-icon">
                {s.icon}
              </div>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ─── Acesso Rápido aos Módulos da Plataforma ─────────── */}
      <div style={{ marginBottom: 26 }}>
        <div className="section-header">
          <h3 className="section-title">Acesso Rápido</h3>
        </div>
        <div className="grid-4">
          {[
            { label: 'Cadernos de Estudo', desc: 'Matemática (LDB) e Informática (SUPROT)', icon: <BookOpen size={18} />, action: () => navigate('/math'), id: 'quick-math' },
            { label: 'Horário Semanal', desc: 'Planejamento por disciplina CETEP', icon: <Calendar size={18} />, action: () => navigate('/agenda?tab=planner'), id: 'quick-agenda' },
            { label: 'Sessão de Foco', desc: 'Cronômetro guiado por matéria', icon: <Timer size={18} />, action: () => navigate('/focus'), id: 'quick-focus' },
            { label: 'Nova Atividade', desc: 'Registrar exercício ou trabalho', icon: <Plus size={18} />, action: () => setShowTaskModal(true), id: 'quick-new-task' },
          ].map(btn => (
            <button
              key={btn.id}
              id={btn.id}
              className="card"
              onClick={btn.action}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div className="stat-card-icon" style={{ flexShrink: 0 }}>
                {btn.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-text)' }}>{btn.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }} className="truncate">{btn.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Atividades de Hoje + Avaliações e Eventos ────────── */}
      <div className="grid-2">
        {/* Coluna 1: Atividades */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <CheckSquare size={16} style={{ color: 'var(--color-primary)' }} />
              Atividades com entrega hoje
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>
              Ver todas <ChevronRight size={14} />
            </button>
          </div>

          {todayTasks.length === 0 ? (
            <div style={{ padding: '20px 12px', textAlign: 'center', background: 'var(--color-bg-subtle)', borderRadius: 8 }}>
              <p className="text-secondary" style={{ fontSize: '0.86rem' }}>
                Nenhuma atividade pendente com prazo para hoje.
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
                      style={{ marginRight: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      aria-label={`Concluir atividade: ${task.title}`}
                    >
                      <div className="checkbox-custom" />
                    </button>
                  </div>
                  <div className="task-content">
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      {task.subject && <span className="chip">{task.subject}</span>}
                      <span className={`badge badge-${task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'success'}`}>
                        Prioridade {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {upcomingTasks.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                Próximas entregas (7 dias)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {upcomingTasks.map(t => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'var(--color-bg-subtle)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 6,
                    }}
                  >
                    <span style={{ fontWeight: 500, fontSize: '0.86rem' }}>{t.title}</span>
                    <span style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)' }}>{relativeDays(t.deadline)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna 2: Próximos Eventos + Frequência Semanal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="section-header">
              <h3 className="section-title">
                <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
                Próximas avaliações e eventos
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/agenda')}>
                Abrir agenda <ChevronRight size={14} />
              </button>
            </div>

            {upcomingEvents.length === 0 ? (
              <div style={{ padding: '20px 12px', textAlign: 'center', background: 'var(--color-bg-subtle)', borderRadius: 8 }}>
                <p className="text-secondary" style={{ fontSize: '0.86rem' }}>
                  Nenhuma avaliação ou evento agendado para os próximos 7 dias.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcomingEvents.map(ev => (
                  <div
                    key={ev.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 7,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg-input)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{ev.title}</span>
                      <span className={`badge ${isWithinDays(ev.date, 2) ? 'badge-danger' : isWithinDays(ev.date, 5) ? 'badge-warning' : 'badge-neutral'}`}>
                        {relativeDays(ev.date)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {ev.subject && <span className="chip">{ev.subject}</span>}
                      <span className="chip">{ev.type}</span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>{formatDateBR(ev.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {stats && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}>
                  <Clock size={15} style={{ color: 'var(--color-primary)' }} /> Distribuição de estudo na semana
                </h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Total: {formatMinutes(stats.totalMinutesThisWeek)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 44 }}>
                {stats.dailyMinutes.map((min, i) => {
                  const max = Math.max(...stats.dailyMinutes, 1);
                  const pct = (min / max) * 100;
                  const isToday = i === 6;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                      <div
                        style={{
                          width: '100%',
                          height: `${Math.max(pct, 6)}%`,
                          minHeight: 4,
                          background: isToday ? 'var(--color-primary)' : 'var(--color-primary-muted)',
                          borderRadius: '3px 3px 0 0',
                        }}
                        title={`${min} min`}
                      />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                {stats.days.map((day, i) => (
                  <div
                    key={day}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: '0.7rem',
                      color: i === 6 ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      fontWeight: i === 6 ? 700 : 500,
                    }}
                  >
                    {SHORT_WEEKDAYS[parseLocalDate(day).getDay()]}
                  </div>
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
