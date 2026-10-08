import React, { useState, useRef } from 'react';
import { Download, Upload, Sun, Moon, Monitor, Type, User, Lock, Trash2, Eye, Mic, Volume2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import * as DataService from '../services/DataService.js';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const { settings, updateSettings, setIsTranscriptionOpen } = useApp();
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
    const keys = ['cetep_tasks', 'cetep_agenda', 'cetep_focus_sessions', 'cetep_gamification', 'cetep_settings'];
    keys.forEach(key => {
      try {
        const all = JSON.parse(localStorage.getItem(key) || '{}');
        delete all[user.id];
        localStorage.setItem(key, JSON.stringify(all));
      } catch {}
    });
    const users = JSON.parse(localStorage.getItem('cetep_users') || '[]');
    const filtered = users.filter(u => u.id !== user.id);
    localStorage.setItem('cetep_users', JSON.stringify(filtered));
    logout();
    toast.success('Conta excluída.');
  };

  const THEME_OPTIONS = [
    { value: 'light', label: 'Claro (Padrão)', icon: <Sun size={18} />, desc: 'Interface moderna e balanceada' },
    { value: 'dark', label: 'Escuro', icon: <Moon size={18} />, desc: 'Menor cansaço visual à noite' },
    { value: 'highcontrast', label: 'Alto Contraste Amarelo', icon: <Monitor size={18} />, desc: 'Preto & Amarelo (Máxima distinção visual AEE)' },
    { value: 'highcontrast-white', label: 'Alto Contraste Branco', icon: <Sun size={18} />, desc: 'Preto & Branco puro (Sem tons de cinza)' },
  ];

  const FONT_OPTIONS = [
    { value: 'medium', label: 'Padrão (100%)', badge: 'Normal', desc: 'Proporção padrão' },
    { value: 'large', label: 'Grande (130%)', badge: 'Baixa Visão', desc: 'Aumento real e nítido' },
    { value: 'xlarge', label: 'Muito Grande (165%)', badge: 'Baixíssima Visão', desc: 'Ampliação para dificuldade visual acentuada' },
    { value: 'huge', label: 'Máxima (200%)', badge: 'WCAG AAA', desc: 'Dobro do tamanho com adaptação de layout' },
  ];

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Configurações e Acessibilidade</h1>
          <p>Personalize sua experiência no CETEP Tech Study com recursos inclusivos do AEE.</p>
        </div>
      </div>

      {/* ─── AEE & Accessibility Focus Section ──────────────── */}
      <Section title="♿ Acessibilidade e Apoio AEE" icon={<Eye size={18} />}>
        {/* Hearing Impairment Speech Transcription */}
        <div style={{
          background: 'var(--color-bg-subtle)',
          border: '2px solid var(--color-border)',
          borderRadius: '12px',
          padding: '16px 18px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Mic size={20} color="var(--color-primary)" />
                <strong style={{ fontSize: '1rem', color: 'var(--color-text)' }}>
                  Transcrição de Voz ao Vivo (Para Baixa Audição)
                </strong>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Legenda instantânea via microfone para estudantes com perda auditiva acompanharem aulas expositivas do professor e discussões em grupo em tempo real.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsTranscriptionOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
            >
              <Mic size={16} /> Abrir Transcrição / Legenda
            </button>
          </div>
        </div>

        {/* High Contrast Choices */}
        <div className="form-group" style={{ marginBottom: 22 }}>
          <label className="form-label" style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 8, display: 'block' }}>
            🎨 Opções de Contraste e Tema
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {THEME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateSettings({ theme: opt.value })}
                id={`settings-theme-${opt.value}`}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                  padding: '12px 14px', borderRadius: 10,
                  border: `2px solid ${settings.theme === opt.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: settings.theme === opt.value ? 'var(--color-primary-light)' : 'var(--color-bg-input)',
                  color: settings.theme === opt.value ? 'var(--color-primary)' : 'var(--color-text)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.92rem' }}>
                  {opt.icon} {opt.label}
                </div>
                <small style={{ fontSize: '0.78rem', opacity: 0.8, color: 'inherit' }}>
                  {opt.desc}
                </small>
              </button>
            ))}
          </div>
        </div>

        {/* Low and Very Low Vision Real Font Scale */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 8, display: 'block' }}>
            <Type size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Tamanho da Fonte (Baixa e Baixíssima Visão)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {FONT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateSettings({ fontSize: opt.value })}
                id={`settings-font-${opt.value}`}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                  padding: '12px 14px', borderRadius: 10,
                  border: `2px solid ${settings.fontSize === opt.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: settings.fontSize === opt.value ? 'var(--color-primary-light)' : 'var(--color-bg-input)',
                  color: settings.fontSize === opt.value ? 'var(--color-primary)' : 'var(--color-text)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{opt.label}</span>
                  <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>{opt.badge}</span>
                </div>
                <small style={{ fontSize: '0.76rem', color: 'inherit', opacity: 0.8 }}>
                  {opt.desc}
                </small>
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 10 }}>
            ✨ <strong>Efeito Real:</strong> Ao selecionar "Baixa Visão" ou "Baixíssima Visão", todos os textos, botões, formulários e cartões do site ampliam proporcionalmente em toda a plataforma.
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
