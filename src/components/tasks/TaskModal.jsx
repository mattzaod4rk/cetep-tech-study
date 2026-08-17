import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import * as DataService from '../../services/DataService.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import toast from 'react-hot-toast';

const SUBJECTS = ['Algoritmos', 'Redes', 'Hardware', 'S.O.', 'Banco de Dados', 'Web', 'Programação', 'Inglês Técnico', 'Outro'];

export default function TaskModal({ onClose, onSave, task = null }) {
  const { user } = useAuth();
  const isEdit = !!task;

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    subject: task?.subject || '',
    deadline: task?.deadline || '',
    priority: task?.priority || 'medium',
    subtasks: task?.subtasks || [],
  });
  const [newSubtask, setNewSubtask] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    set('subtasks', [...form.subtasks, { id: `sub-${Date.now()}`, title: newSubtask.trim(), completed: false }]);
    setNewSubtask('');
  };

  const removeSubtask = (id) => {
    set('subtasks', form.subtasks.filter(s => s.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('O título é obrigatório.'); return; }
    setLoading(true);
    try {
      if (isEdit) {
        DataService.updateTask(user.id, task.id, form);
        toast.success('Tarefa atualizada!');
      } else {
        DataService.createTask(user.id, form);
        toast.success('Tarefa criada!');
      }
      onSave();
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar tarefa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
        <div className="modal-header">
          <h2 className="modal-title" id="task-modal-title">
            {isEdit ? 'Editar tarefa' : 'Nova tarefa'}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}

            <div className="form-group">
              <label className="form-label" htmlFor="task-title">Título *</label>
              <input id="task-title" className="form-input" placeholder="Ex: Estudar capítulo 3 de Algoritmos" value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="task-desc">Descrição (opcional)</label>
              <textarea id="task-desc" className="form-textarea" placeholder="Detalhes adicionais..." value={form.description} onChange={e => set('description', e.target.value)} style={{ minHeight: 70 }} />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="task-subject">Matéria</label>
                <select id="task-subject" className="form-select" value={form.subject} onChange={e => set('subject', e.target.value)}>
                  <option value="">Sem matéria</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="task-priority">Prioridade</label>
                <select id="task-priority" className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                  <option value="low">🟢 Baixa</option>
                  <option value="medium">🟡 Média</option>
                  <option value="high">🔴 Alta</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="task-deadline">Prazo</label>
              <input id="task-deadline" type="date" className="form-input" value={form.deadline} onChange={e => set('deadline', e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>

            {/* Subtasks */}
            <div>
              <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Subtarefas</label>
              {form.subtasks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  {form.subtasks.map(st => (
                    <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-bg-subtle)', borderRadius: 8 }}>
                      <span style={{ flex: 1, fontSize: '0.9rem' }}>{st.title}</span>
                      <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeSubtask(st.id)} aria-label={`Remover subtarefa: ${st.title}`} style={{ padding: 4 }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="Adicionar subtarefa..."
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
                  style={{ flex: 1 }}
                  id="task-subtask-input"
                />
                <button type="button" className="btn btn-secondary" onClick={addSubtask} id="task-add-subtask-btn">
                  Adicionar
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="task-save-btn">
              {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
