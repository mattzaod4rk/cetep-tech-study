import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckSquare, Timer, Flame, Trophy, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import * as DataService from '../services/DataService.js';
import { formatMinutes, SHORT_WEEKDAYS, parseLocalDate } from '../utils/dates.js';

export default function ProgressPage() {
  const { user } = useAuth();
  const { gamification, refreshGamification, syncRevision } = useApp();
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

  useEffect(() => { load(); }, [load, syncRevision]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const maxMin = Math.max(...(stats?.dailyMinutes || [1]), 1);

  const allAchievements = gamification?.allAchievements || [];
  const earnedIds = gamification?.achievements || [];

  const levelInfo = gamification?.levelInfo;
  const points = gamification?.points || 0;
  const levelProgress = levelInfo?.next
    ? Math.min(100, (points / levelInfo.next) * 100)
    : 100;

  const weekStreak = gamification?.weekStreak || [];
  const streakShields = gamification?.streakShields ?? 1;
  const bestStreak = gamification?.bestStreak || gamification?.streakDays || 0;

  // Last 5 focus sessions
  const recentSessions = [...sessions].reverse().slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="academic-kicker">
            <Trophy size={14} />
            Histórico Acadêmico & Indicadores de Estudo
          </div>
          <h1>Desempenho</h1>
          <p>Acompanhe sua carga horária dedicada, constância diária e evolução no curso.</p>
        </div>
      </div>

      {/* ─── Stats Summary ───────────────────────── */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          {
            icon: <CheckSquare size={17} />,
            label: 'Atividades concluídas',
            value: stats?.totalTasksCompleted || 0,
            sub: `${stats?.completedThisWeek || 0} nesta semana`,
          },
          {
            icon: <Clock size={17} />,
            label: 'Carga horária total',
            value: formatMinutes(stats?.totalMinutesAllTime || 0),
            sub: `${formatMinutes(stats?.totalMinutesThisWeek || 0)} nesta semana`,
          },
          {
            icon: <Timer size={17} />,
            label: 'Ciclos de foco',
            value: stats?.totalSessions || 0,
            sub: `${stats?.focusSessionsThisWeek || 0} nesta semana`,
          },
          {
            icon: <Flame size={17} />,
            label: 'Sequência atual',
            value: `${gamification?.streakDays || 0} dias`,
            sub: `Recorde: ${bestStreak}d · Proteção: ${streakShields}/2`,
          },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="stat-label">{s.label}</span>
              <div className="stat-card-icon">{s.icon}</div>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        {/* ─── Left Column: Weekly Chart + Streak + Sessions ─── */}
        <div>
          {/* Duolingo-style 7-day Streak Card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                🔥 Sequência de Estudos (Últimos 7 dias)
              </h3>
              <span className="badge badge-primary">🧊 {streakShields}/2 Escudos de Sequência</span>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              O <strong>Escudo de Sequência (🧊)</strong> protege sua ofensiva automaticamente caso você esqueça de estudar por 1 dia. A cada 3 dias seguidos você ganha +1 escudo!
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
              {weekStreak.map(dayItem => {
                const isDone = dayItem.status === 'active';
                const isShield = dayItem.status === 'shield';
                const isTodayPending = dayItem.status === 'today_pending';
                return (
                  <div key={dayItem.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        border: dayItem.isToday ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                        background: isDone
                          ? 'hsl(28, 95%, 52%)'
                          : isShield
                            ? 'hsl(200, 85%, 92%)'
                            : isTodayPending
                              ? 'var(--color-primary-light)'
                              : 'var(--color-bg-input)',
                        color: isDone ? '#fff' : 'var(--color-text)',
                      }}
                    >
                      {isDone ? '🔥' : isShield ? '🧊' : dayItem.dayShort.charAt(0)}
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: dayItem.isToday ? 700 : 400, color: dayItem.isToday ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                      {dayItem.dayShort}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

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
                    const label = SHORT_WEEKDAYS[parseLocalDate(day).getDay()];
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
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < recentSessions.length - 1 ? '1px solid var(--color-border)' : 'none', flexWrap: 'wrap', gap: 6 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatMinutes(s.durationMinutes)}</span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginLeft: 8 }}>
                        de {s.plannedMinutes} min
                      </span>
                      {s.subject && (
                        <span className="chip" style={{ marginLeft: 8 }}>{s.subject}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s.completed ? (
                        <span className="badge badge-success">✓ Completa</span>
                      ) : (
                        <span className="badge badge-neutral">Parcial (+5 XP)</span>
                      )}
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
            <h4 style={{ marginBottom: 10 }}>Como ganhar pontos (Sistema Anti-Farm)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { action: 'Concluir uma tarefa (1ª conclusão)', pts: '+10 pts' },
                { action: 'Concluir uma subtarefa (1ª conclusão)', pts: '+5 pts' },
                { action: 'Resolver exercício guiado em Estudos & Mat.', pts: '+10 pts' },
                { action: 'Sessão de foco completa (≥ 25 min)', pts: '+20 pts' },
                { action: 'Sessão de foco completa (< 25 min)', pts: '+15 pts' },
                { action: 'Sessão de foco parcial validada (≥ 5 min)', pts: '+5 pts' },
              ].map(item => (
                <div key={item.action} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
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
