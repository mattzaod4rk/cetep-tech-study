import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Pencil, Trash2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import * as DataService from '../services/DataService.js';
import { formatDateBR, relativeDays, isOverdue } from '../utils/dates.js';
import TaskModal from '../components/tasks/TaskModal.jsx';
import toast from 'react-hot-toast';

const SUBJECTS = ['', 'Algoritmos', 'Redes', 'Hardware', 'S.O.', 'Banco de Dados', 'Web', 'Programação', 'Inglês Técnico', 'Outro'];

export default function TasksPage() {
  const { user } = useAuth();
  const { awardPoints } = useApp();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: 'all', priority: '', subject: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    try {
      setTasks(DataService.getTasks(user.id));
    } catch (e) {
      toast.error('Erro ao carregar tarefas.');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const handleComplete = (taskId) => {
    DataService.completeTask(user.id, taskId);
    const result = awardPoints(10, 'task');
    toast.success('Tarefa concluída! +10 pts 🎉');
    if (result.newAchievements?.length > 0) {
      result.newAchievements.forEach(a => {
        setTimeout(() => toast.success(`🏆 Conquista desbloqueada: ${a.title}!`, { duration: 5000 }), 600);
      });
    }
    load();
  };

  const handleReopen = (taskId) => {
    DataService.reopenTask(user.id, taskId);
    toast.success('Tarefa reaberta.');
    load();
  };

  const handleDelete = (taskId) => {
    DataService.deleteTask(user.id, taskId);
    toast.success('Tarefa excluída.');
    setConfirmDelete(null);
    load();
  };

  const handleToggleSubtask = (taskId, subtaskId) => {
    const updated = DataService.toggleSubtask(user.id, taskId, subtaskId);
    const subtask = updated.subtasks.find(s => s.id === subtaskId);
    if (subtask?.completed) {
      awardPoints(5, 'subtask');
      toast.success('+5 pts pela subtarefa! ⭐');
    }
    load();
  };

  const handleAddSubtask = (taskId, title) => {
    if (!title.trim()) return;
    DataService.addSubtask(user.id, taskId, title);
    load();
  };

  // Filter & search
  const filtered = tasks.filter(t => {
    if (filters.status === 'pending' && t.status !== 'pending') return false;
    if (filters.status === 'completed' && t.status !== 'completed') return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.subject && t.subject !== filters.subject) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.subject?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pending = filtered.filter(t => t.status === 'pending');
  const completed = filtered.filter(t => t.status === 'completed');

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Tarefas</h1>
          <p>{pending.length} pendente{pending.length !== 1 ? 's' : ''} · {completed.length} concluída{completed.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditTask(null); setShowModal(true); }} id="tasks-new-btn">
          <Plus size={18} /> Nova tarefa
        </button>
      </div>

      {/* ─── Filters ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 34 }} placeholder="Buscar tarefa..." value={search} onChange={e => setSearch(e.target.value)} id="tasks-search-input" />
        </div>

        <select className="form-select" style={{ width: 'auto', flex: '0 0 auto' }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} id="tasks-filter-status">
          <option value="all">Todas</option>
          <option value="pending">Pendentes</option>
          <option value="completed">Concluídas</option>
        </select>

        <select className="form-select" style={{ width: 'auto', flex: '0 0 auto' }} value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))} id="tasks-filter-priority">
          <option value="">Qualquer prioridade</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>

        <select className="form-select" style={{ width: 'auto', flex: '0 0 auto' }} value={filters.subject} onChange={e => setFilters(f => ({ ...f, subject: e.target.value }))} id="tasks-filter-subject">
          {SUBJECTS.map(s => <option key={s} value={s}>{s || 'Qualquer matéria'}</option>)}
        </select>
      </div>

      {/* ─── Pending tasks ───────────────────────── */}
      {pending.length === 0 && completed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <h3>Nenhuma tarefa pendente!</h3>
          <p>Você está em dia. Que tal criar uma nova tarefa para organizar seus estudos?</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} id="tasks-empty-create-btn">
            <Plus size={16} /> Criar tarefa
          </button>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <section>
              <h3 style={{ marginBottom: 12, color: 'var(--color-text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                Pendentes ({pending.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {pending.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    expanded={expandedTask === task.id}
                    onExpand={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                    onComplete={() => handleComplete(task.id)}
                    onEdit={() => { setEditTask(task); setShowModal(true); }}
                    onDelete={() => setConfirmDelete(task.id)}
                    onToggleSubtask={(sid) => handleToggleSubtask(task.id, sid)}
                    onAddSubtask={(title) => handleAddSubtask(task.id, title)}
                  />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h3 style={{ marginBottom: 12, color: 'var(--color-text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                Concluídas ({completed.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {completed.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    expanded={expandedTask === task.id}
                    onExpand={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                    onReopen={() => handleReopen(task.id)}
                    onDelete={() => setConfirmDelete(task.id)}
                    onToggleSubtask={(sid) => handleToggleSubtask(task.id, sid)}
                    onAddSubtask={(title) => handleAddSubtask(task.id, title)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ─── Modals ──────────────────────────────── */}
      {showModal && (
        <TaskModal
          task={editTask}
          onClose={() => { setShowModal(false); setEditTask(null); }}
          onSave={() => { setShowModal(false); setEditTask(null); load(); }}
        />
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h2 className="modal-title">Excluir tarefa</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setConfirmDelete(null)} aria-label="Fechar"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p>Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)} id="tasks-confirm-delete-btn">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Task Item Component ──────────────────────────────────────────────────────
function TaskItem({ task, expanded, onExpand, onComplete, onReopen, onEdit, onDelete, onToggleSubtask, onAddSubtask }) {
  const [newSubtask, setNewSubtask] = useState('');
  const completed = task.status === 'completed';
  const overdue = !completed && task.deadline && isOverdue(task.deadline);

  const priorityLabel = { high: 'Alta', medium: 'Média', low: 'Baixa' };
  const priorityBadge = { high: 'badge-danger', medium: 'badge-warning', low: 'badge-success' };

  const subtasksTotal = task.subtasks?.length || 0;
  const subtasksDone = task.subtasks?.filter(s => s.completed).length || 0;

  return (
    <div className={`task-item ${completed ? 'completed' : ''}`} style={{ flexDirection: 'column', gap: 0 }}>
      <div className={`task-left-bar priority-bar-${task.priority}`} />
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%', paddingLeft: 6 }}>
        {/* Checkbox */}
        <div style={{ paddingTop: 2 }}>
          {!completed ? (
            <button
              className="checkbox-wrapper"
              onClick={onComplete}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              aria-label={`Concluir tarefa: ${task.title}`}
            >
              <div className="checkbox-custom" />
            </button>
          ) : (
            <div className="checkbox-custom checked" aria-hidden="true" />
          )}
        </div>

        {/* Content */}
        <div className="task-content" style={{ cursor: 'pointer' }} onClick={onExpand}>
          <div className={`task-title ${completed ? 'line-through text-muted' : ''}`}>{task.title}</div>
          <div className="task-meta" style={{ marginTop: 4 }}>
            {task.subject && <span className="chip">{task.subject}</span>}
            <span className={`badge ${priorityBadge[task.priority]}`}>{priorityLabel[task.priority]}</span>
            {task.deadline && (
              <span style={{ fontSize: '0.8rem', color: overdue ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: overdue ? 600 : 400 }}>
                {overdue ? '⚠ ' : ''}{relativeDays(task.deadline)}
              </span>
            )}
            {subtasksTotal > 0 && (
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {subtasksDone}/{subtasksTotal} subtarefas
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="task-actions">
          {completed ? (
            <button className="btn btn-ghost btn-sm" onClick={onReopen} title="Reabrir tarefa" aria-label="Reabrir tarefa">
              <RotateCcw size={14} />
            </button>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={onEdit} title="Editar tarefa" aria-label="Editar tarefa">
              <Pencil size={14} />
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onDelete} title="Excluir tarefa" aria-label="Excluir tarefa" style={{ color: 'var(--color-danger)' }}>
            <Trash2 size={14} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onExpand} aria-label={expanded ? 'Recolher' : 'Expandir'} aria-expanded={expanded}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ paddingLeft: 44, paddingTop: 12, width: '100%', borderTop: '1px solid var(--color-border)', marginTop: 12 }}>
          {task.description && (
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: 12 }}>{task.description}</p>
          )}

          {/* Subtasks */}
          {subtasksTotal > 0 && (
            <>
              <div style={{ marginBottom: 8 }}>
                <div className="progress-bar" style={{ height: 4 }}>
                  <div className="progress-fill progress-fill-success" style={{ width: subtasksTotal ? `${(subtasksDone / subtasksTotal) * 100}%` : '0%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {task.subtasks.map(st => (
                  <div key={st.id} className="checkbox-wrapper" onClick={() => onToggleSubtask(st.id)} style={{ cursor: 'pointer', padding: '6px 0' }}>
                    <div className={`checkbox-custom ${st.completed ? 'checked' : ''}`} />
                    <span style={{ fontSize: '0.9rem', textDecoration: st.completed ? 'line-through' : 'none', color: st.completed ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Add subtask */}
          {!completed && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                className="form-input"
                placeholder="Adicionar subtarefa..."
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { onAddSubtask(newSubtask); setNewSubtask(''); } }}
                style={{ flex: 1, fontSize: '0.88rem', padding: '7px 12px' }}
              />
              <button className="btn btn-secondary btn-sm" onClick={() => { onAddSubtask(newSubtask); setNewSubtask(''); }}>
                + Subtarefa
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function X({ size = 20 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  );
}
