import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus, ChevronLeft, ChevronRight, Pencil, Trash2,
  AlertTriangle, Calendar, BookOpen, RotateCcw, Timer
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import * as DataService from '../services/DataService.js';
import {
  formatDateBR, relativeDays, isWithinDays, isOverdue,
  getMonthDays, SHORT_WEEKDAYS, WEEKDAYS, MONTH_NAMES, todayISO
} from '../utils/dates.js';
import { SUBJECT_GROUPS, getStudyHubTabForSubject } from '../utils/subjects.js';
import toast from 'react-hot-toast';

const EVENT_TYPES = ['Prova', 'Trabalho', 'Seminário', 'Atividade', 'Reunião'];
const PLAN_DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Seg a Dom

function EventModal({ event = null, onClose, onSave }) {
  const isEdit = !!event;
  const [form, setForm] = useState({
    title: event?.title || '',
    description: event?.description || '',
    type: event?.type || 'Atividade',
    date: event?.date || '',
    time: event?.time || '',
    subject: event?.subject || '',
    priority: event?.priority || 'medium',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Título é obrigatório.'); return; }
    if (!form.date) { setError('Data é obrigatória.'); return; }
    setLoading(true);
    setTimeout(() => { onSave(form); setLoading(false); }, 200);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="event-modal-title">
        <div className="modal-header">
          <h2 className="modal-title" id="event-modal-title">{isEdit ? 'Editar evento' : 'Novo evento'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar"><XIcon /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}

            <div className="form-group">
              <label className="form-label" htmlFor="event-title">Título *</label>
              <input id="event-title" className="form-input" placeholder="Ex: Prova de Lógica de Programação" value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="event-type">Tipo</label>
                <select id="event-type" className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="event-priority">Prioridade</label>
                <select id="event-priority" className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                  <option value="low">🟢 Baixa</option>
                  <option value="medium">🟡 Média</option>
                  <option value="high">🔴 Alta</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="event-date">Data *</label>
                <input id="event-date" type="date" className="form-input" value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="event-time">Horário (opcional)</label>
                <input id="event-time" type="time" className="form-input" value={form.time} onChange={e => set('time', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="event-subject">Matéria (LDB / SUPROT CETEP)</label>
              <select id="event-subject" className="form-select" value={form.subject} onChange={e => set('subject', e.target.value)}>
                <option value="">Sem matéria</option>
                {SUBJECT_GROUPS.map(group => (
                  <optgroup key={group.id} label={group.label}>
                    {group.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="event-desc">Descrição (opcional)</label>
              <textarea id="event-desc" className="form-textarea" style={{ minHeight: 70 }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Anotações sobre o evento..." />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="event-save-btn">
              {loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AgendaPage() {
  const { user } = useAuth();
  const { syncRevision } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(() =>
    searchParams.get('tab') === 'planner' ? 'planner' : 'events'
  );
  const [events, setEvents] = useState([]);
  const [weeklyPlan, setWeeklyPlan] = useState(() => DataService.getWeeklyPlan(user.id));
  const [selectedSubjectToAdd, setSelectedSubjectToAdd] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [calDate, setCalDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'planner' && activeTab !== 'planner') {
      setActiveTab('planner');
    }
  }, [searchParams, activeTab]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'planner' ? { tab: 'planner' } : {});
  };

  const load = useCallback(() => {
    setLoading(true);
    try {
      setEvents(DataService.getAgendaEvents(user.id));
      setWeeklyPlan(DataService.getWeeklyPlan(user.id));
    } catch {
      toast.error('Erro ao carregar agenda.');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load, syncRevision]);

  const handleSave = (formData) => {
    if (editEvent) {
      DataService.updateAgendaEvent(user.id, editEvent.id, formData);
      toast.success('Evento atualizado!');
    } else {
      DataService.createAgendaEvent(user.id, formData);
      toast.success('Evento criado!');
    }
    setShowModal(false);
    setEditEvent(null);
    load();
  };

  const handleDelete = (id) => {
    DataService.deleteAgendaEvent(user.id, id);
    toast.success('Evento excluído.');
    setConfirmDelete(null);
    load();
  };

  // ── Handlers do Planejamento Semanal por Matéria (CETEP) ──────────────────
  const updateDayPlan = (dayIdx, updater) => {
    const currentDay = weeklyPlan?.[dayIdx] || { subjects: [], goalMinutes: 25, note: '' };
    const updatedDay = updater(currentDay);
    const nextPlan = { ...weeklyPlan, [dayIdx]: updatedDay };
    setWeeklyPlan(nextPlan);
    DataService.saveWeeklyPlan(user.id, nextPlan);
  };

  const handleAddSubjectToDay = (dayIdx) => {
    const chosen = selectedSubjectToAdd[dayIdx];
    if (!chosen) return;
    updateDayPlan(dayIdx, current => {
      if (current.subjects.includes(chosen)) return current;
      return { ...current, subjects: [...current.subjects, chosen] };
    });
    toast.success(`Matéria adicionada para ${WEEKDAYS[dayIdx]}!`);
  };

  const handleRemoveSubjectFromDay = (dayIdx, subjectToRemove) => {
    updateDayPlan(dayIdx, current => ({
      ...current,
      subjects: current.subjects.filter(s => s !== subjectToRemove),
    }));
  };

  const handleResetPlan = () => {
    const preset = DataService.resetWeeklyPlan(user.id);
    setWeeklyPlan(preset);
    toast.success('Grade padrão do CETEP Alberto Torres restaurada!');
  };

  const today = todayISO();
  const todayWeekday = new Date().getDay();
  const todayEvents = events.filter(e => e.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const urgentEvents = events.filter(e => e.date > today && isWithinDays(e.date, 3));
  const upcomingEvents = events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')).slice(0, 10);

  // Calendar
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const days = getMonthDays(year, month);

  const eventDates = new Set(events.map(e => e.date));

  const selectedDayEvents = selectedDay
    ? events.filter(e => e.date === selectedDay).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    : [];

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="academic-kicker">
            <Calendar size={14} />
            Calendário Escolar & Grade de Estudos CETEP
          </div>
          <h1>Horário & Agenda</h1>
          <p>Organize avaliações, entregas e seu planejamento semanal por componente curricular.</p>
        </div>
        {activeTab === 'events' ? (
          <button className="btn btn-primary" onClick={() => { setEditEvent(null); setShowModal(true); }} id="agenda-new-btn">
            <Plus size={16} /> Novo registro
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={handleResetPlan} id="agenda-reset-plan-btn">
            <RotateCcw size={15} /> Restaurar Grade Padrão CETEP
          </button>
        )}
      </div>

      {/* Abas: Eventos vs. Planejamento Semanal por Matéria */}
      <div
        style={{
          display: 'inline-flex',
          gap: 4,
          padding: 4,
          borderRadius: 8,
          background: 'var(--color-bg-subtle)',
          border: '1px solid var(--color-border)',
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <button
          className={`btn btn-sm ${activeTab === 'events' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => switchTab('events')}
          id="agenda-tab-events"
        >
          <Calendar size={15} /> Calendário de Avaliações ({events.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'planner' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => switchTab('planner')}
          id="agenda-tab-planner"
        >
          <BookOpen size={15} /> Grade Semanal por Disciplina (CETEP)
        </button>
      </div>

      {activeTab === 'planner' ? (
        /* ── ABA DE PLANEJAMENTO SEMANAL POR MATÉRIA (SUGESTÃO DOS ESTUDANTES) ── */
        <div>
          <div
            className="card"
            style={{
              marginBottom: 20,
              background: 'var(--color-primary-light)',
              border: '1px solid var(--color-primary-muted)',
            }}
          >
            <h3 style={{ color: 'var(--color-primary)', marginBottom: 4 }}>
              📚 Planejamento Semanal — Ensino Médio (LDB) + Técnico em Informática (SUPROT/SEC-BA)
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
              Escolha 1 ou 2 matérias por dia e uma meta curta de minutos. O seu <strong>Dashboard</strong> e o <strong>Modo Foco</strong> destacarão automaticamente o que estudar hoje sem sobrecarga!
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {PLAN_DAYS_ORDER.map(dayIdx => {
              const dayPlan = weeklyPlan?.[dayIdx] || { subjects: [], goalMinutes: 0, note: '' };
              const isToday = dayIdx === todayWeekday;
              return (
                <div
                  key={dayIdx}
                  className="card"
                  style={{
                    border: isToday ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ fontSize: '1.05rem' }}>{WEEKDAYS[dayIdx]}</h3>
                        {isToday && <span className="badge badge-primary">Hoje</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <label style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>Meta:</label>
                        <select
                          className="form-select"
                          style={{ width: 95, padding: '4px 8px', fontSize: '0.82rem' }}
                          value={dayPlan.goalMinutes || 0}
                          onChange={e =>
                            updateDayPlan(dayIdx, curr => ({ ...curr, goalMinutes: Number(e.target.value) }))
                          }
                        >
                          {[0, 10, 15, 20, 25, 30, 45, 50, 60].map(m => (
                            <option key={m} value={m}>{m === 0 ? 'Livre' : `${m} min`}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Matérias planejadas no dia */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, minHeight: 32 }}>
                      {dayPlan.subjects?.length === 0 ? (
                        <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                          Nenhuma matéria definida (Descanso / Livre)
                        </span>
                      ) : (
                        dayPlan.subjects.map(subj => (
                          <span
                            key={subj}
                            className="chip"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              background: 'var(--color-primary-light)',
                              color: 'var(--color-primary)',
                              fontWeight: 600,
                            }}
                          >
                            {subj}
                            <button
                              type="button"
                              onClick={() => handleRemoveSubjectFromDay(dayIdx, subj)}
                              style={{
                                border: 'none',
                                background: 'none',
                                color: 'inherit',
                                cursor: 'pointer',
                                fontWeight: 800,
                                padding: 0,
                              }}
                              title={`Remover ${subj}`}
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Adicionar matéria ao dia */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      <select
                        className="form-select"
                        style={{ fontSize: '0.82rem', padding: '6px 8px' }}
                        value={selectedSubjectToAdd[dayIdx] || ''}
                        onChange={e => setSelectedSubjectToAdd(prev => ({ ...prev, [dayIdx]: e.target.value }))}
                      >
                        <option value="">+ Escolher matéria CETEP...</option>
                        {SUBJECT_GROUPS.map(g => (
                          <optgroup key={g.id} label={g.shortLabel}>
                            {g.subjects.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleAddSubjectToDay(dayIdx)}
                      >
                        Adicionar
                      </button>
                    </div>

                    {/* Lembrete rápido do dia */}
                    <input
                      className="form-input"
                      style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                      placeholder="Anotação curta (ex: Revisar frações e binário)"
                      value={dayPlan.note || ''}
                      onChange={e => updateDayPlan(dayIdx, curr => ({ ...curr, note: e.target.value }))}
                    />
                  </div>

                  {/* Ações rápidas se tiver matéria */}
                  {dayPlan.subjects?.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, paddingTop: 6, borderTop: '1px solid var(--color-border)' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() =>
                          navigate(
                            `/focus?subject=${encodeURIComponent(dayPlan.subjects[0])}&minutes=${dayPlan.goalMinutes || 25}`
                          )
                        }
                      >
                        <Timer size={14} /> Focar
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/math?tab=${getStudyHubTabForSubject(dayPlan.subjects[0])}`)}
                      >
                        <BookOpen size={14} /> Estudar conteúdo
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── ABA DE EVENTOS E CALENDÁRIO ── */
        <>
          {urgentEvents.length > 0 && (
            <div className="alert alert-warning" role="alert">
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Atenção! Evento{urgentEvents.length > 1 ? 's' : ''} nos próximos 3 dias:</strong>{' '}
                {urgentEvents.map(e => `${e.title} (${formatDateBR(e.date)})`).join(' · ')}
              </div>
            </div>
          )}

          <div className="grid-2" style={{ gap: 24 }}>
            {/* ─── Left column ─────────────────────────── */}
            <div>
              {/* Today's events */}
              <section style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 12 }}>Hoje — {formatDateBR(today)}</h3>
                {todayEvents.length === 0 ? (
                  <div className="card card-flat" style={{ padding: '20px', textAlign: 'center' }}>
                    <p className="text-secondary" style={{ fontSize: '0.9rem' }}>📅 Nenhum evento hoje.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {todayEvents.map(ev => <EventCard key={ev.id} event={ev} onEdit={() => { setEditEvent(ev); setShowModal(true); }} onDelete={() => setConfirmDelete(ev.id)} />)}
                  </div>
                )}
              </section>

              {/* Upcoming events */}
              <section>
                <h3 style={{ marginBottom: 12 }}>Próximos eventos</h3>
                {upcomingEvents.length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px' }}>
                    <div className="empty-state-icon">🗓️</div>
                    <h3>Nenhum evento futuro</h3>
                    <p>Cadastre provas, trabalhos e atividades para não perder nenhum prazo.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {upcomingEvents.map(ev => <EventCard key={ev.id} event={ev} onEdit={() => { setEditEvent(ev); setShowModal(true); }} onDelete={() => setConfirmDelete(ev.id)} />)}
                  </div>
                )}
              </section>
            </div>

            {/* ─── Right: Calendar ──────────────────────── */}
            <div>
              <div className="calendar">
                <div className="calendar-header">
                  <button className="btn btn-ghost btn-icon" onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} aria-label="Mês anterior">
                    <ChevronLeft size={18} />
                  </button>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {MONTH_NAMES[month]} {year}
                  </h3>
                  <button className="btn btn-ghost btn-icon" onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} aria-label="Próximo mês">
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="calendar-grid" style={{ padding: '0 8px 8px' }}>
                  {SHORT_WEEKDAYS.map(wd => (
                    <div key={wd} className="calendar-day-header">{wd}</div>
                  ))}
                  {days.map((d, i) => {
                    if (!d) return <div key={`empty-${i}`} />;
                    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const isToday = iso === today;
                    const isSelected = iso === selectedDay;
                    const hasEvent = eventDates.has(iso);
                    return (
                      <div
                        key={iso}
                        className={`calendar-day ${isToday ? 'today' : ''} ${isSelected && !isToday ? 'selected' : ''} ${hasEvent ? 'has-event' : ''}`}
                        onClick={() => setSelectedDay(iso === selectedDay ? null : iso)}
                        role="button"
                        tabIndex={0}
                        aria-label={`${d.getDate()} de ${MONTH_NAMES[month]}${hasEvent ? ' (tem evento)' : ''}`}
                        onKeyDown={e => e.key === 'Enter' && setSelectedDay(iso === selectedDay ? null : iso)}
                      >
                        {d.getDate()}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected day events */}
              {selectedDay && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ marginBottom: 10 }}>Eventos em {formatDateBR(selectedDay)}</h4>
                  {selectedDayEvents.length === 0 ? (
                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>Nenhum evento neste dia.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selectedDayEvents.map(ev => (
                        <EventCard key={ev.id} event={ev} onEdit={() => { setEditEvent(ev); setShowModal(true); }} onDelete={() => setConfirmDelete(ev.id)} compact />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ─── Modals ──────────────────────────────── */}
      {showModal && (
        <EventModal
          event={editEvent}
          onClose={() => { setShowModal(false); setEditEvent(null); }}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h2 className="modal-title">Excluir evento</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setConfirmDelete(null)} aria-label="Fechar"><XIcon /></button>
            </div>
            <div className="modal-body"><p>Tem certeza que deseja excluir este evento?</p></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)} id="agenda-confirm-delete-btn">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ event, onEdit, onDelete, compact }) {
  const isUrgent = isWithinDays(event.date, 2);
  const overdue = isOverdue(event.date);
  const typeEmoji = { Prova: '📝', Trabalho: '📋', Seminário: '🎤', Atividade: '📌', Reunião: '🤝' };

  return (
    <div className="card card-flat" style={{ padding: compact ? '10px 14px' : '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span>{typeEmoji[event.type] || '📅'}</span>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{event.title}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className={`badge ${overdue ? 'badge-danger' : isUrgent ? 'badge-warning' : 'badge-neutral'}`}>
              {overdue ? '⚠ ' : ''}{relativeDays(event.date)}
            </span>
            <span className="chip">{event.type}</span>
            {event.subject && <span className="chip">{event.subject}</span>}
            {event.time && <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>🕐 {event.time}</span>}
          </div>
          {event.description && !compact && (
            <p style={{ marginTop: 6, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{event.description}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button className="btn btn-ghost btn-icon" style={{ padding: 6 }} onClick={onEdit} aria-label="Editar evento"><Pencil size={14} /></button>
          <button className="btn btn-ghost btn-icon" style={{ padding: 6, color: 'var(--color-danger)' }} onClick={onDelete} aria-label="Excluir evento"><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

function XIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>;
}
