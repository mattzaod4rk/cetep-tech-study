import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import * as DataService from '../services/DataService.js';
import {
  formatDateBR, relativeDays, isWithinDays, isOverdue,
  getMonthDays, SHORT_WEEKDAYS, MONTH_NAMES, todayISO
} from '../utils/dates.js';
import toast from 'react-hot-toast';

const EVENT_TYPES = ['Prova', 'Trabalho', 'Seminário', 'Atividade', 'Reunião'];
const SUBJECTS = ['Algoritmos', 'Redes', 'Hardware', 'S.O.', 'Banco de Dados', 'Web', 'Programação', 'Inglês Técnico', 'Outro'];

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
              <input id="event-title" className="form-input" placeholder="Ex: Prova de Algoritmos" value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
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
              <label className="form-label" htmlFor="event-subject">Matéria</label>
              <select id="event-subject" className="form-select" value={form.subject} onChange={e => set('subject', e.target.value)}>
                <option value="">Sem matéria</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
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
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [calDate, setCalDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    try {
      setEvents(DataService.getAgendaEvents(user.id));
    } catch (e) {
      toast.error('Erro ao carregar agenda.');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

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

  const today = todayISO();
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
          <h1>Agenda</h1>
          <p>{events.length} evento{events.length !== 1 ? 's' : ''} cadastrado{events.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditEvent(null); setShowModal(true); }} id="agenda-new-btn">
          <Plus size={18} /> Novo evento
        </button>
      </div>

      {/* ─── Alerts ──────────────────────────────── */}
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
