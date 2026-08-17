import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckSquare, Timer, Flame, Trophy, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import * as DataService from '../services/DataService.js';
import { formatMinutes, SHORT_WEEKDAYS } from '../utils/dates.js';

export default function ProgressPage() {
  const { user } = useAuth();
  const { gamification, refreshGamification } = useApp();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    try {
      const s = DataService.getWeeklyStats(user.id);
      const sess = DataService.getFocusSessions(user.id);
      setStats(s);
      setSessions(sess);
      refreshGamification();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user.id, refreshGamification]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const maxMin = Math.max(...(stats?.dailyMinutes || [1]), 1);

  const allAchievements = gamification?.allAchievements || [];
  const earnedIds = gamification?.achievements || [];

  const levelInfo = gamification?.levelInfo;
  const points = gamification?.points || 0;
  const levelProgress = levelInfo?.next
    ? Math.min(100, (points / levelInfo.next) * 100)
    : 100;

  // Last 5 focus sessions
  const recentSessions = [...sessions].reverse().slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Progresso</h1>
          <p>Acompanhe sua evolução e conquistas.</p>
        </div>
      </div>

      {/* ─── Stats Summary ───────────────────────── */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {[
          {
            icon: <CheckSquare size={20} />,
            label: 'Tarefas concluídas',
            value: stats?.totalTasksCompleted || 0,
            sub: `${stats?.completedThisWeek || 0} esta semana`,
            color: 'hsl(220, 80%, 55%)', bg: 'hsl(220, 80%, 95%)',
          },
          {
            icon: <Clock size={20} />,
            label: 'Tempo total estudado',
            value: formatMinutes(stats?.totalMinutesAllTime || 0),
            sub: `${formatMinutes(stats?.totalMinutesThisWeek || 0)} esta semana`,
            color: 'hsl(142, 70%, 38%)', bg: 'hsl(142, 60%, 92%)',
          },
          {
            icon: <Timer size={20} />,
            label: 'Sessões de foco',
            value: stats?.totalSessions || 0,
            sub: `${stats?.focusSessionsThisWeek || 0} esta semana`,
            color: 'hsl(38, 90%, 45%)', bg: 'hsl(38, 90%, 93%)',
          },
          {
            icon: <Flame size={20} />,
            label: 'Sequência atual',
            value: `${gamification?.streakDays || 0} dias`,
            sub: 'dias consecutivos',
            color: 'hsl(15, 85%, 52%)', bg: 'hsl(15, 85%, 93%)',
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

      <div className="grid-2" style={{ gap: 24 }}>
        {/* ─── Weekly Chart ─────────────────────── */}
        <div>
          <div className="card">
            <h3 style={{ marginBottom: 20 }}>⏱ Tempo estudado — últimos 7 dias</h3>

            {stats?.dailyMinutes.every(m => m === 0) ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <div className="empty-state-icon">📊</div>
                <h3>Nenhuma sessão esta semana</h3>
                <p>Complete uma sessão de Modo Foco para ver seu progresso aqui.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 120, marginBottom: 8 }}>
                  {stats.dailyMinutes.map((min, i) => {
                    const pct = (min / maxMin) * 100;
                    const isToday = i === 6;
                    const day = stats.days[i];
                    const label = SHORT_WEEKDAYS[new Date(day).getDay()];
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                          <div
                            style={{
                              width: '100%',
                              height: `${Math.max(pct, min > 0 ? 4 : 0)}%`,
                              background: isToday ? 'var(--color-primary)' : 'var(--color-primary-muted)',
                              borderRadius: '5px 5px 0 0',
                              transition: 'height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                              position: 'relative',
                            }}
                            title={`${min > 0 ? formatMinutes(min) : '0 min'}`}
                          />
                        </div>
                        <div style={{ fontSize: '0.7rem', color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: isToday ? 700 : 400 }}>
                          {label}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  <span>Total: {formatMinutes(stats.totalMinutesThisWeek)}</span>
                  <span>Média: {formatMinutes(Math.round(stats.totalMinutesThisWeek / 7))}/dia</span>
                </div>
              </>
            )}
          </div>

          {/* Recent sessions */}
          <div className="card" style={{ marginTop: 20 }}>
            <h3 style={{ marginBottom: 14 }}>📋 Sessões recentes</h3>
            {recentSessions.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>Nenhuma sessão de foco registrada ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentSessions.map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < recentSessions.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatMinutes(s.durationMinutes)}</span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginLeft: 8 }}>
                        de {s.plannedMinutes} min planejados
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s.completed && <span className="badge badge-success">✓ Completa</span>}
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        {new Date(s.completedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Gamification ─────────────────────── */}
        <div>
          {/* Level card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 60, height: 60,
                background: 'var(--color-primary-light)',
                borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem',
              }}>
                {['🌱', '🔍', '🎯', '⭐', '👑'][levelInfo?.level - 1] || '🌱'}
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nível {levelInfo?.level}</div>
                <h2 style={{ fontSize: '1.4rem', margin: '2px 0' }}>{levelInfo?.title || 'Iniciante'}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Star size={14} style={{ color: 'hsl(45, 90%, 52%)' }} />
                  <span style={{ fontWeight: 700, color: 'hsl(45, 90%, 42%)' }}>{points} pontos</span>
                </div>
              </div>
            </div>

            {levelInfo?.next && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Progresso para o próximo nível</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{points}/{levelInfo.next}</span>
                </div>
                <div className="progress-bar" style={{ height: 10 }}>
                  <div className="progress-fill" style={{ width: `${levelProgress}%` }} />
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
                  Faltam {levelInfo.next - points} pontos para o próximo nível
                </p>
              </>
            )}
            {!levelInfo?.next && (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <p style={{ color: 'var(--color-primary)', fontWeight: 700 }}>🏆 Nível máximo atingido!</p>
              </div>
            )}
          </div>

          {/* Points guide */}
          <div className="card" style={{ marginBottom: 20, background: 'var(--color-bg-subtle)', boxShadow: 'none' }}>
            <h4 style={{ marginBottom: 10 }}>Como ganhar pontos</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { action: 'Concluir uma tarefa', pts: '+10 pts' },
                { action: 'Concluir uma subtarefa', pts: '+5 pts' },
                { action: 'Finalizar sessão de foco', pts: '+15 pts' },
              ].map(item => (
                <div key={item.action} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span>{item.action}</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{item.pts}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="card">
            <h3 style={{ marginBottom: 14 }}>
              <Trophy size={18} style={{ display: 'inline', marginRight: 6, color: 'hsl(45, 90%, 52%)' }} />
              Conquistas
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allAchievements.map(ach => {
                const earned = earnedIds.includes(ach.id);
                return (
                  <div key={ach.id} className={`achievement-card ${earned ? 'earned' : ''}`}>
                    <div className="achievement-icon" style={{ opacity: earned ? 1 : 0.4 }}>
                      {ach.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: earned ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                        {ach.title}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                        {ach.description}
                      </div>
                    </div>
                    <div>
                      {earned ? (
                        <span className="badge badge-success">+{ach.points} pts</span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>🔒 Bloqueada</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
