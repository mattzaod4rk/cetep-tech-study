import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Play, Pause, RotateCcw, Square, Timer, BookOpen, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import * as DataService from '../services/DataService.js';
import { formatTimer } from '../utils/dates.js';
import { SUBJECT_GROUPS } from '../utils/subjects.js';
import toast from 'react-hot-toast';

const PRESETS = [
  { label: '10 min', minutes: 10 },
  { label: '25 min', minutes: 25 },
  { label: '50 min', minutes: 50 },
];

export default function FocusPage() {
  const { user } = useAuth();
  const { saveFocusSessionWithReward } = useApp();
  const [searchParams] = useSearchParams();

  // Matéria vinculada à sessão (vem da URL ?subject=... ou do Plano de Hoje do CETEP)
  const [subject, setSubject] = useState(() => {
    const fromQuery = searchParams.get('subject');
    if (fromQuery) return fromQuery;
    if (user?.id) {
      const plan = DataService.getWeeklyPlan(user.id);
      const todaySubjects = plan?.[new Date().getDay()]?.subjects || [];
      if (todaySubjects.length > 0) return todaySubjects[0];
    }
    return 'Matemática e suas Tecnologias';
  });

  const [duration, setDuration] = useState(() => {
    const minParam = parseInt(searchParams.get('minutes') || '', 10);
    return !Number.isNaN(minParam) && minParam >= 5 && minParam <= 240 ? minParam : 25;
  });
  const [custom, setCustom] = useState('');
  const [customActive, setCustomActive] = useState(false);
  const [remaining, setRemaining] = useState(() => duration * 60);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [confirmEarlyExit, setConfirmEarlyExit] = useState(false);

  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedElapsedRef = useRef(0);
  const sessionIdRef = useRef(null);
  const finishingRef = useRef(false);

  const total = duration * 60;
  const progress = 1 - remaining / total;
  const circumference = 2 * Math.PI * 45; // r=45
  const minRequiredSeconds = DataService.MIN_FOCUS_SECONDS || 300; // 5 min

  const selectPreset = (min) => {
    if (started) return;
    setDuration(min);
    setRemaining(min * 60);
    setCustomActive(false);
    setCustom('');
    setFinished(false);
  };

  const applyCustom = () => {
    const min = parseInt(custom, 10);
    if (isNaN(min) || min < 5 || min > 240) {
      toast.error('Digite um tempo entre 5 e 240 minutos.');
      return;
    }
    setDuration(min);
    setRemaining(min * 60);
    setCustomActive(true);
    setFinished(false);
  };

  const startTimer = useCallback(() => {
    sessionIdRef.current = `focus-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    finishingRef.current = false;
    setConfirmEarlyExit(false);
    setStarted(true);
    setRunning(true);
    setFinished(false);
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000) + pausedElapsedRef.current;
      const rem = Math.max(0, total - elapsed);
      setRemaining(rem);
      setElapsedSeconds(elapsed);
      if (rem <= 0) {
        clearInterval(intervalRef.current);
        setRunning(false);
        setFinished(true);
      }
    }, 500);
  }, [total]);

  const pauseTimer = () => {
    clearInterval(intervalRef.current);
    pausedElapsedRef.current = elapsedSeconds;
    setRunning(false);
  };

  const resumeTimer = () => {
    setConfirmEarlyExit(false);
    startTimeRef.current = Date.now();
    setRunning(true);
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000) + pausedElapsedRef.current;
      const rem = Math.max(0, total - elapsed);
      setRemaining(rem);
      setElapsedSeconds(elapsed);
      if (rem <= 0) {
        clearInterval(intervalRef.current);
        setRunning(false);
        setFinished(true);
      }
    }, 500);
  };

  const resetTimer = () => {
    clearInterval(intervalRef.current);
    finishingRef.current = false;
    setConfirmEarlyExit(false);
    setRunning(false);
    setStarted(false);
    setFinished(false);
    setRemaining(duration * 60);
    setElapsedSeconds(0);
    pausedElapsedRef.current = 0;
  };

  const handleFinishRequest = () => {
    if (finishingRef.current) return;

    // Anti-farm de XP: se não terminou o tempo e estudou menos de 5 minutos, avisa antes
    if (!finished && elapsedSeconds < minRequiredSeconds) {
      if (running) pauseTimer();
      setConfirmEarlyExit(true);
      return;
    }

    commitSession();
  };

  const commitSession = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    clearInterval(intervalRef.current);
    setRunning(false);
    setConfirmEarlyExit(false);

    try {
      const result = saveFocusSessionWithReward({
        sessionId: sessionIdRef.current,
        elapsedSeconds: finished ? total : elapsedSeconds,
        plannedMinutes: duration,
        completed: finished,
        subject,
      });

      if (result.awarded && result.session) {
        const labelTipo = finished ? 'Sessão completa' : 'Sessão parcial validada';
        toast.success(
          `🎯 ${labelTipo} (${subject})! +${result.points} pts (${result.session.durationMinutes} min estudados)`,
          { duration: 4500 }
        );
        if (result.newAchievements?.length > 0) {
          result.newAchievements.forEach(a => {
            setTimeout(() => toast.success(`🏆 Conquista: ${a.title}!`, { duration: 5000 }), 1000);
          });
        }
      } else if (result.reason === 'too_short') {
        toast('Sessão encerrada antes de 5 minutos (sem pontuação de XP).', { icon: 'ℹ️' });
      }
    } catch {
      toast.error('Erro ao registrar sessão.');
    }

    // Reset state
    setStarted(false);
    setFinished(false);
    setRemaining(duration * 60);
    setElapsedSeconds(0);
    pausedElapsedRef.current = 0;
    sessionIdRef.current = null;
    finishingRef.current = false;
  }, [elapsedSeconds, duration, finished, total, subject, saveFocusSessionWithReward]);

  // Auto-notify on completion
  useEffect(() => {
    if (finished) {
      toast.success('⏰ Tempo esgotado! Clique em "Salvar sessão" para receber seu XP!', { duration: 5000 });
    }
  }, [finished]);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  // Update page title during focus
  useEffect(() => {
    if (started) {
      document.title = `${formatTimer(remaining)} — Modo Foco | CETEP`;
    } else {
      document.title = 'Modo Foco | CETEP Tech Study';
    }
    return () => { document.title = 'CETEP Tech Study'; };
  }, [remaining, started]);

  const secondsUntilValid = Math.max(0, minRequiredSeconds - elapsedSeconds);

  return (
    <div>
      {!started ? (
        /* ── Setup screen ── */
        <div>
          <div className="page-header">
            <div className="page-header-left">
              <div className="academic-kicker">
                <Timer size={14} />
                Gestão de Tempo · Método Pomodoro Guiado
              </div>
              <h1>Sessão de Foco</h1>
              <p>Selecione a disciplina da matriz curricular e dedique tempo concentrado sem distrações.</p>
            </div>
          </div>

          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            {/* Subject selection (LDB + SUPROT/SEC-BA) */}
            <div className="card" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="focus-subject-select" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 700 }}>
                <BookOpen size={16} style={{ color: 'var(--color-primary)' }} />
                Qual matéria você vai focar agora?
              </label>
              <select
                id="focus-subject-select"
                className="form-select"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              >
                {SUBJECT_GROUPS.map(group => (
                  <optgroup key={group.id} label={group.label}>
                    {group.subjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Preset selection */}
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 16 }}>Escolha a duração</h3>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                {PRESETS.map(p => (
                  <button
                    key={p.minutes}
                    onClick={() => selectPreset(p.minutes)}
                    style={{
                      flex: 1,
                      minWidth: 80,
                      padding: '14px 8px',
                      borderRadius: 10,
                      border: `2px solid ${duration === p.minutes && !customActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: duration === p.minutes && !customActive ? 'var(--color-primary-light)' : 'var(--color-bg-input)',
                      color: duration === p.minutes && !customActive ? 'var(--color-primary)' : 'var(--color-text)',
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    id={`focus-preset-${p.minutes}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Timer size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: 34 }}
                    type="number"
                    min={5}
                    max={240}
                    placeholder="Personalizado (mín. 5 min)"
                    value={custom}
                    onChange={e => setCustom(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && applyCustom()}
                    id="focus-custom-input"
                  />
                </div>
                <button className="btn btn-secondary" onClick={applyCustom} id="focus-custom-apply-btn">Aplicar</button>
              </div>
              {customActive && (
                <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                  ✓ Tempo personalizado: {duration} min selecionado
                </p>
              )}

              <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <span>⚡ Ciclo completo: <strong>+{duration >= 25 ? 20 : 15} XP</strong></span>
                <span>⏱️ Parcial (mín. 5 min): <strong>+5 XP</strong></span>
              </div>
            </div>

            {/* Tips */}
            <div className="card" style={{ marginBottom: 24, background: 'var(--color-primary-light)', border: '1px solid var(--color-primary-muted)' }}>
              <h4 style={{ color: 'var(--color-primary)', marginBottom: 8 }}>💡 Dicas AEE para focar sem sobrecarga</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 0 }}>
                {[
                  'Deixe o celular longe ou no modo silencioso',
                  'Tenha água e um caderno por perto',
                  'Trabalhe em apenas UM pequeno passo por sessão',
                  'Estude pelo menos 5 minutos para validar sua ofensiva diária (🔥)',
                ].map((tip, i) => (
                  <li key={i} style={{ display: 'flex', gap: 8, fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
                    <span style={{ color: 'var(--color-primary)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span> {tip}
                  </li>
                ))}
              </ul>
            </div>

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', padding: '16px' }}
              onClick={startTimer}
              id="focus-start-btn"
            >
              <Play size={22} /> Iniciar foco em {subject} ({duration} min)
            </button>
          </div>
        </div>
      ) : (
        /* ── Active Focus Screen ── */
        <div className="focus-overlay">
          {/* Session label */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: running ? 'var(--color-success)' : 'var(--color-warning)', animation: running ? 'pulse 1.5s infinite' : 'none' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {finished ? 'Sessão completa!' : running ? 'Em foco' : 'Pausado'}
              </span>
            </div>
            <p style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.95rem', marginBottom: 2 }}>{subject}</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>Meta: {duration} minutos</p>
          </div>

          {/* Ring timer */}
          <div className="focus-ring">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" className="focus-ring-bg" />
              <circle
                cx="50" cy="50" r="45"
                className="focus-ring-fill"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
              />
            </svg>
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <div className="focus-timer">{formatTimer(remaining)}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                {formatTimer(elapsedSeconds)} decorridos
              </div>
            </div>
          </div>

          {/* Early finish warning modal/banner (Anti-XP Farm protection) */}
          {confirmEarlyExit && !finished && (
            <div
              className="card"
              role="alert"
              style={{
                maxWidth: 420,
                border: '2px solid var(--color-warning)',
                background: 'var(--color-warning-light)',
                padding: 16,
                textAlign: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
                <ShieldAlert size={18} style={{ color: 'var(--color-warning)' }} />
                Sessão ainda muito curta ({formatTimer(elapsedSeconds)})
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                Para evitar cliques acidentais e proteger seu progresso real, sessões com menos de <strong>5 minutos</strong> não concedem XP. Faltam apenas <strong>{formatTimer(secondsUntilValid)}</strong> para garantir +5 XP!
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" onClick={resumeTimer} id="focus-continue-btn">
                  <Play size={14} /> Continuar focando
                </button>
                <button className="btn btn-secondary btn-sm" onClick={resetTimer} id="focus-discard-btn">
                  Encerrar sem salvar
                </button>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="focus-controls">
            {!finished && (
              running ? (
                <button className="btn btn-secondary btn-lg" onClick={pauseTimer} id="focus-pause-btn">
                  <Pause size={20} /> Pausar
                </button>
              ) : (
                <button className="btn btn-primary btn-lg" onClick={resumeTimer} id="focus-resume-btn">
                  <Play size={20} /> Retomar
                </button>
              )
            )}

            <button className="btn btn-secondary btn-lg" onClick={resetTimer} id="focus-reset-btn">
              <RotateCcw size={18} /> Reiniciar
            </button>

            <button className="btn btn-success btn-lg" onClick={handleFinishRequest} id="focus-finish-btn">
              <Square size={18} /> {finished ? `Salvar (+${duration >= 25 ? 20 : 15} XP)` : elapsedSeconds >= minRequiredSeconds ? 'Finalizar (+5 XP)' : 'Finalizar agora'}
            </button>
          </div>

          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', textAlign: 'center', maxWidth: 320 }}>
            {finished
              ? '🎉 Parabéns! Clique em "Salvar" para registrar seu tempo de estudo e XP.'
              : elapsedSeconds >= minRequiredSeconds
                ? '✓ Tempo mínimo de 5 min atingido! Se precisar parar agora, você já garante +5 XP.'
                : `Estude pelo menos 5 minutos para validar a sessão no seu histórico e ganhar XP.`}
          </p>
        </div>
      )}
    </div>
  );
}
