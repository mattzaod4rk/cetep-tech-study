import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Square, Timer } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import * as DataService from '../services/DataService.js';
import { formatTimer } from '../utils/dates.js';
import toast from 'react-hot-toast';

const PRESETS = [
  { label: '10 min', minutes: 10 },
  { label: '25 min', minutes: 25 },
  { label: '50 min', minutes: 50 },
];

export default function FocusPage() {
  const { user } = useAuth();
  const { awardPoints } = useApp();

  const [duration, setDuration] = useState(25); // minutes
  const [custom, setCustom] = useState('');
  const [customActive, setCustomActive] = useState(false);
  const [remaining, setRemaining] = useState(25 * 60); // seconds
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedElapsedRef = useRef(0);

  const total = duration * 60;
  const progress = 1 - remaining / total;
  const circumference = 2 * Math.PI * 45; // r=45

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
    if (isNaN(min) || min < 1 || min > 240) {
      toast.error('Digite um tempo entre 1 e 240 minutos.');
      return;
    }
    setDuration(min);
    setRemaining(min * 60);
    setCustomActive(true);
    setFinished(false);
  };

  const startTimer = useCallback(() => {
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
    setRunning(false);
    setStarted(false);
    setFinished(false);
    setRemaining(duration * 60);
    setElapsedSeconds(0);
    pausedElapsedRef.current = 0;
  };

  const finishSession = useCallback(() => {
    clearInterval(intervalRef.current);
    setRunning(false);

    const durationMinutes = Math.max(1, Math.ceil(elapsedSeconds / 60));

    try {
      DataService.saveFocusSession(user.id, {
        durationMinutes,
        plannedMinutes: duration,
        completed: finished,
      });
      const result = awardPoints(15, 'focus');
      toast.success(`🎯 Sessão registrada! +15 pts (${durationMinutes} min estudados)`, { duration: 4000 });
      if (result.newAchievements?.length > 0) {
        result.newAchievements.forEach(a => {
          setTimeout(() => toast.success(`🏆 Conquista: ${a.title}!`, { duration: 5000 }), 1000);
        });
      }
    } catch (e) {
      toast.error('Erro ao registrar sessão.');
    }

    // Reset
    setStarted(false);
    setFinished(false);
    setRemaining(duration * 60);
    setElapsedSeconds(0);
    pausedElapsedRef.current = 0;
  }, [elapsedSeconds, duration, finished, user.id, awardPoints]);

  // Auto-finish on completion
  useEffect(() => {
    if (finished) {
      toast.success('⏰ Tempo esgotado! Incrível foco!', { duration: 5000 });
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

  return (
    <div>
      {!started ? (
        /* ── Setup screen ── */
        <div>
          <div className="page-header">
            <div className="page-header-left">
              <h1>Modo Foco</h1>
              <p>Elimine distrações e concentre-se no que importa.</p>
            </div>
          </div>

          <div style={{ maxWidth: 480, margin: '0 auto' }}>
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
                    min={1}
                    max={240}
                    placeholder="Personalizado (min)"
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
            </div>

            {/* Tips */}
            <div className="card" style={{ marginBottom: 24, background: 'var(--color-primary-light)', border: '1px solid var(--color-primary-muted)' }}>
              <h4 style={{ color: 'var(--color-primary)', marginBottom: 8 }}>💡 Dicas para focar melhor</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 0 }}>
                {[
                  'Deixe o celular longe ou no modo silencioso',
                  'Tenha água e um caderno por perto',
                  'Escolha UMA tarefa para trabalhar nesta sessão',
                  'Após a sessão, faça uma pausa curta de 5-10 min',
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
              <Play size={22} /> Iniciar sessão de {duration} minutos
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
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Sessão de {duration} minutos</p>
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

            <button className="btn btn-success btn-lg" onClick={finishSession} id="focus-finish-btn">
              <Square size={18} /> {finished ? 'Salvar sessão' : 'Finalizar agora'}
            </button>
          </div>

          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', textAlign: 'center', maxWidth: 280 }}>
            {finished
              ? '🎉 Parabéns! Clique em "Salvar sessão" para registrar seu progresso.'
              : 'Clique em "Finalizar agora" para registrar sua sessão mesmo antes do tempo acabar.'}
          </p>
        </div>
      )}
    </div>
  );
}
