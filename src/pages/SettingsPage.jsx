import React, { useState, useRef } from 'react';
import { Download, Upload, Sun, Moon, Monitor, Type, User, Lock, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import * as DataService from '../services/DataService.js';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const { settings, updateSettings } = useApp();
  const fileRef = useRef();

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Profile update ────────────────────────────────────
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) { toast.error('Nome é obrigatório.'); return; }
    setProfileLoading(true);
    try {
      await updateProfile({ name: profileForm.name, email: profileForm.email });
      toast.success('Perfil atualizado!');
    } catch (err) {
      toast.error(err.message || 'Erro ao atualizar perfil.');
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Password change ───────────────────────────────────
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!passwordForm.current) { toast.error('Informe a senha atual.'); return; }
    if (passwordForm.newPass.length < 6) { toast.error('Nova senha deve ter pelo menos 6 caracteres.'); return; }
    if (passwordForm.newPass !== passwordForm.confirm) { toast.error('As senhas não coincidem.'); return; }
    setPasswordLoading(true);
    try {
      // Verify current password then update
      await DataService.login({ email: user.email, password: passwordForm.current });
      await updateProfile({ password: passwordForm.newPass });
      setPasswordForm({ current: '', newPass: '', confirm: '' });
      toast.success('Senha alterada com sucesso!');
    } catch (err) {
      toast.error('Senha atual incorreta.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // ── Export data ───────────────────────────────────────
  const handleExport = () => {
    try {
      const data = DataService.exportAllData(user.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cetep-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Dados exportados com sucesso!');
    } catch (e) {
      toast.error('Erro ao exportar dados.');
    }
  };

  // ── Import data ───────────────────────────────────────
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        DataService.importAllData(user.id, data);
        toast.success('Dados importados com sucesso! Recarregue a página para ver as mudanças.');
      } catch (err) {
        toast.error('Arquivo inválido. Verifique se é um backup CETEP Tech Study.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Delete account ────────────────────────────────────
  const handleDeleteAccount = () => {
    // Clear all user data
    const keys = ['cetep_tasks', 'cetep_agenda', 'cetep_focus_sessions', 'cetep_gamification', 'cetep_settings'];
    keys.forEach(key => {
      try {
        const all = JSON.parse(localStorage.getItem(key) || '{}');
        delete all[user.id];
        localStorage.setItem(key, JSON.stringify(all));
      } catch {}
    });
    // Remove from users list
    const users = JSON.parse(localStorage.getItem('cetep_users') || '[]');
    const filtered = users.filter(u => u.id !== user.id);
    localStorage.setItem('cetep_users', JSON.stringify(filtered));
    logout();
    toast.success('Conta excluída.');
  };

  const THEME_OPTIONS = [
    { value: 'light', label: 'Claro', icon: <Sun size={18} /> },
    { value: 'dark', label: 'Escuro', icon: <Moon size={18} /> },
    { value: 'highcontrast', label: 'Alto Contraste', icon: <Monitor size={18} /> },
  ];

  const FONT_OPTIONS = [
    { value: 'small', label: 'Pequeno' },
    { value: 'medium', label: 'Médio' },
    { value: 'large', label: 'Grande' },
  ];

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Configurações</h1>
          <p>Personalize sua experiência no CETEP Tech Study.</p>
        </div>
      </div>

      {/* ─── Profile ─────────────────────────────── */}
      <Section title="👤 Perfil" icon={<User size={18} />}>
        <form onSubmit={handleProfileSave}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="settings-name">Nome</label>
              <input id="settings-name" className="form-input" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-email">E-mail</label>
              <input id="settings-email" type="email" className="form-input" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={profileLoading} id="settings-profile-save-btn">
            {profileLoading ? 'Salvando...' : 'Salvar perfil'}
          </button>
        </form>
      </Section>

      {/* ─── Password ────────────────────────────── */}
      <Section title="🔒 Alterar senha" icon={<Lock size={18} />}>
        <form onSubmit={handlePasswordSave}>
          <div className="form-group">
            <label className="form-label" htmlFor="settings-curr-pass">Senha atual</label>
            <input id="settings-curr-pass" type="password" className="form-input" value={passwordForm.current} onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))} placeholder="••••••" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="settings-new-pass">Nova senha</label>
              <input id="settings-new-pass" type="password" className="form-input" value={passwordForm.newPass} onChange={e => setPasswordForm(f => ({ ...f, newPass: e.target.value }))} placeholder="Mín. 6 caracteres" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-confirm-pass">Confirmar senha</label>
              <input id="settings-confirm-pass" type="password" className="form-input" value={passwordForm.confirm} onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Repita a nova senha" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={passwordLoading} id="settings-password-save-btn">
            {passwordLoading ? 'Alterando...' : 'Alterar senha'}
          </button>
        </form>
      </Section>

      {/* ─── Theme ───────────────────────────────── */}
      <Section title="🎨 Aparência" icon={<Sun size={18} />}>
        <div className="form-group">
          <label className="form-label">Tema</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {THEME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateSettings({ theme: opt.value })}
                id={`settings-theme-${opt.value}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 16px', borderRadius: 10,
                  border: `2px solid ${settings.theme === opt.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: settings.theme === opt.value ? 'var(--color-primary-light)' : 'var(--color-bg-input)',
                  color: settings.theme === opt.value ? 'var(--color-primary)' : 'var(--color-text)',
                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            <Type size={14} style={{ display: 'inline', marginRight: 4 }} />
            Tamanho da fonte (acessibilidade)
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            {FONT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateSettings({ fontSize: opt.value })}
                id={`settings-font-${opt.value}`}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 10,
                  border: `2px solid ${settings.fontSize === opt.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: settings.fontSize === opt.value ? 'var(--color-primary-light)' : 'var(--color-bg-input)',
                  color: settings.fontSize === opt.value ? 'var(--color-primary)' : 'var(--color-text)',
                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  fontSize: opt.value === 'small' ? '0.82rem' : opt.value === 'large' ? '1.05rem' : '0.95rem',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
            Acessível para diferentes necessidades visuais. Recomendado "Grande" para baixa visão.
          </p>
        </div>
      </Section>

      {/* ─── Export / Import ─────────────────────── */}
      <Section title="💾 Portabilidade de dados">
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
          Exporte seus dados para fazer backup ou para transferir para outro dispositivo.
          Na importação, os dados existentes serão substituídos pelos do arquivo.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleExport} id="settings-export-btn">
            <Download size={16} /> Exportar dados (JSON)
          </button>
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} id="settings-import-btn">
            <Upload size={16} /> Importar dados
          </button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 10 }}>
          Seus dados ficam salvos apenas neste navegador. Exporte regularmente para não perdê-los ao limpar o cache.
        </p>
      </Section>

      {/* ─── Danger Zone ─────────────────────────── */}
      <Section title="⚠️ Zona de perigo">
        {!showDeleteConfirm ? (
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Excluir sua conta remove todos os seus dados localmente. Esta ação não pode ser desfeita.
            </p>
            <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)} id="settings-delete-account-btn">
              <Trash2 size={16} /> Excluir minha conta
            </button>
          </div>
        ) : (
          <div className="alert alert-danger">
            <div>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>Tem certeza? Todos os seus dados serão excluídos.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-danger btn-sm" onClick={handleDeleteAccount} id="settings-confirm-delete-btn">Sim, excluir tudo</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>{title}</h3>
      {children}
    </div>
  );
}
