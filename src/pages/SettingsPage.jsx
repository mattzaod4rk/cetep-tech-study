import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Upload,
  Sun,
  Moon,
  Monitor,
  Type,
  User,
  Lock,
  Trash2,
  Eye,
  Mic,
  Database,
  CheckCircle2,
  MailCheck,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import * as DataService from '../services/DataService.js';
import { deleteAllUserFirestoreData } from '../services/FirestoreSyncService.js';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const {
    user,
    isCloudEnabled,
    usingEmulator,
    updateProfile,
    changePassword,
    resendVerification,
    checkEmailVerified,
    logout,
  } = useAuth();
  const { settings, updateSettings, setIsTranscriptionOpen, refreshGamification, syncRevision } = useApp();
  const fileRef = useRef();

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [legacyAccounts, setLegacyAccounts] = useState([]);
  const [migratingId, setMigratingId] = useState(null);

  const reloadLegacyAccounts = React.useCallback(() => {
    if (!user) return;
    setLegacyAccounts(DataService.getLegacyLocalAccounts(user.id));
  }, [user]);

  useEffect(() => {
    setProfileForm({ name: user?.name || '', email: user?.email || '' });
    reloadLegacyAccounts();
  }, [user, syncRevision, reloadLegacyAccounts]);

  // ── Profile update ────────────────────────────────────
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      toast.error('Nome é obrigatório.');
      return;
    }
    setProfileLoading(true);
    try {
      await updateProfile({ name: profileForm.name.trim() });
      toast.success('Perfil atualizado e sincronizado!');
    } catch (err) {
      toast.error(err.message || 'Erro ao atualizar perfil.');
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Password change ───────────────────────────────────
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!passwordForm.current) {
      toast.error('Informe a senha atual.');
      return;
    }
    if (passwordForm.newPass.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.error('As senhas não coincidem.');
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword(passwordForm.current, passwordForm.newPass);
      setPasswordForm({ current: '', newPass: '', confirm: '' });
      toast.success('Senha alterada com sucesso!');
    } catch (err) {
      toast.error(err.message || 'Senha atual incorreta.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // ── Email verification ────────────────────────────────
  const handleResendVerification = async () => {
    setVerifyLoading(true);
    try {
      await resendVerification();
      toast.success(`Link de verificação reenviado para ${user.email}!`);
    } catch (err) {
      toast.error(err.message || 'Não foi possível reenviar o e-mail.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleCheckVerified = async () => {
    setVerifyLoading(true);
    try {
      const ok = await checkEmailVerified();
      if (ok) {
        toast.success('E-mail verificado com sucesso!');
      } else {
        toast('Seu e-mail ainda consta como pendente. Clique no link enviado para sua caixa de entrada.');
      }
    } catch {
      toast.error('Erro ao verificar status do e-mail.');
    } finally {
      setVerifyLoading(false);
    }
  };

  // ── Export data ───────────────────────────────────────
  const handleExport = (targetUserId = user.id, labelSuffix = '') => {
    try {
      const data = DataService.exportAllData(targetUserId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `cetep-backup${labelSuffix ? `-${labelSuffix}` : ''}-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup JSON exportado com sucesso!');
    } catch {
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
        refreshGamification();
        toast.success('Dados importados e sincronizados sem duplicidades!');
      } catch {
        toast.error('Arquivo inválido. Verifique se é um backup JSON do CETEP Tech Study.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Migrate legacy localStorage account ───────────────
  const handleMigrateLegacy = async (legacyAccount) => {
    setMigratingId(legacyAccount.id);
    try {
      const summary = await DataService.migrateLegacyAccountToFirebase(legacyAccount.id, user.id);
      refreshGamification();
      reloadLegacyAccounts();
      toast.success(
        `Migração concluída! +${summary.tasksAdded} tarefas, +${summary.agendaAdded} eventos e ${summary.totalPointsAfter} XP sincronizados.`
      );
    } catch (err) {
      toast.error(err.message || 'Erro ao migrar dados locais.');
    } finally {
      setMigratingId(null);
    }
  };

  const handleConfirmClearLegacy = (legacyAccount) => {
    try {
      DataService.confirmAndClearLegacyAccount(legacyAccount.id, user.id);
      reloadLegacyAccounts();
      toast.success(`Dados locais antigos de "${legacyAccount.name}" removidos após confirmação.`);
    } catch (err) {
      toast.error(err.message || 'Não foi possível limpar os dados locais.');
    }
  };

  // ── Delete account ────────────────────────────────────
  const handleDeleteAccount = async () => {
    const keys = [
      'cetep_tasks',
      'cetep_agenda',
      'cetep_focus_sessions',
      'cetep_gamification',
      'cetep_settings',
      'cetep_weekly_plan',
      'cetep_study_progress',
    ];
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

    if (isCloudEnabled) {
      await deleteAllUserFirestoreData(user.id);
    }
    await logout();
    toast.success('Seus dados foram excluídos.');
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
    <div style={{ maxWidth: 800 }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Configurações, Conta e Acessibilidade</h1>
          <p>Gerencie sua conta Firebase, migração de dados locais e recursos inclusivos do AEE.</p>
        </div>
      </div>

      {/* ─── 1. Conta Firebase & Segurança ──────────────────── */}
      <Section title="🔐 Conta, Autenticação e Segurança" icon={<ShieldCheck size={18} />}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          borderRadius: 10,
          background: 'var(--color-bg-subtle)',
          border: '1px solid var(--color-border)',
          marginBottom: 18,
          fontSize: '0.84rem',
        }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
              UID do Usuário: <code style={{ fontSize: '0.78rem' }}>{user?.uid || user?.id}</code>
            </div>
            <div style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Perfil: <strong>{user?.role === 'professor' ? 'Professor / AEE' : 'Estudante'}</strong> · Ambiente:{' '}
              <strong>
                {isCloudEnabled
                  ? (usingEmulator ? 'Firebase Emulator Suite (Local)' : 'Cloud Firestore (southamerica-east1)')
                  : 'Armazenamento Local'}
              </strong>
            </div>
          </div>

          {isCloudEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {user?.emailVerified ? (
                <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px' }}>
                  <CheckCircle2 size={14} /> E-mail verificado
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleResendVerification}
                    disabled={verifyLoading}
                  >
                    <MailCheck size={14} /> Reenviar verificação
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleCheckVerified}
                    disabled={verifyLoading}
                  >
                    <RefreshCw size={14} /> Já confirmei
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="grid-2" style={{ gap: 20 }}>
          <form onSubmit={handleProfileSave}>
            <h4 style={{ fontSize: '0.92rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={15} /> Dados do Perfil
            </h4>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-name">Nome completo</label>
              <input
                id="settings-name"
                className="form-input"
                value={profileForm.name}
                onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-email">E-mail da conta</label>
              <input
                id="settings-email"
                className="form-input"
                value={profileForm.email}
                disabled
                style={{ opacity: 0.75 }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={profileLoading}>
              {profileLoading ? 'Salvando...' : 'Salvar nome'}
            </button>
          </form>

          <form onSubmit={handlePasswordSave}>
            <h4 style={{ fontSize: '0.92rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={15} /> Alterar Senha
            </h4>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-cur-pass">Senha atual</label>
              <input
                id="settings-cur-pass"
                type="password"
                className="form-input"
                value={passwordForm.current}
                onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-new-pass">Nova senha (mín. 6 caracteres)</label>
              <input
                id="settings-new-pass"
                type="password"
                className="form-input"
                value={passwordForm.newPass}
                onChange={e => setPasswordForm(f => ({ ...f, newPass: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-conf-pass">Confirmar nova senha</label>
              <input
                id="settings-conf-pass"
                type="password"
                className="form-input"
                value={passwordForm.confirm}
                onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm" disabled={passwordLoading}>
              {passwordLoading ? 'Alterando...' : 'Atualizar senha'}
            </button>
          </form>
        </div>
      </Section>

      {/* ─── 2. Migração do Armazenamento Local (Beta -> Firebase) ─── */}
      <Section title="🔄 Migração de Contas Locais (Versão Beta → Firebase)" icon={<Database size={18} />}>
        <div style={{
          padding: '12px 14px',
          borderRadius: 10,
          background: 'var(--color-bg-subtle)',
          border: '1px solid var(--color-border)',
          marginBottom: 16,
          fontSize: '0.84rem',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5,
        }}>
          <strong style={{ color: 'var(--color-text)', display: 'block', marginBottom: 4 }}>
            Como os estudantes da versão Beta devem migrar para o Firebase:
          </strong>
          1. Crie sua nova conta no CETEP Tech Study usando <strong>E-mail e Senha</strong> ou <strong>Login com Google</strong>.<br />
          2. Abaixo, o sistema identifica automaticamente os dados que estavam salvos neste navegador (sem copiar senhas antigas).<br />
          3. Clique em <strong>Importar para minha conta Firebase</strong>: suas tarefas, agenda, XP e sequência serão sincronizados sem duplicações.<br />
          4. Seus dados antigos permanecem preservados neste navegador até você conferir tudo e clicar em <strong>Confirmar e limpar dados antigos</strong>.
        </div>

        {legacyAccounts.length === 0 ? (
          <div style={{ fontSize: '0.86rem', color: 'var(--color-text-muted)', padding: '8px 0' }}>
            ✓ Nenhuma conta local antiga pendente de migração foi encontrada neste navegador.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {legacyAccounts.map(acc => (
              <div
                key={acc.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-input)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {acc.name}
                    {acc.alreadyMigrated && (
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                        ✓ Migrada
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    {acc.email} · <strong>{acc.tasksCount}</strong> tarefas · <strong>{acc.agendaCount}</strong> eventos ·{' '}
                    <strong>{acc.focusSessionsCount}</strong> sessões de foco · <strong>{acc.points} XP</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleExport(acc.id, `beta-${acc.name.toLowerCase().replace(/\s+/g, '-')}`)}
                  >
                    <Download size={14} /> Backup JSON
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleMigrateLegacy(acc)}
                    disabled={migratingId === acc.id}
                    id={`migrate-legacy-${acc.id}`}
                  >
                    <Upload size={14} />
                    {migratingId === acc.id
                      ? 'Migrando...'
                      : acc.alreadyMigrated
                      ? 'Sincronizar novamente'
                      : 'Importar para minha conta Firebase'}
                  </button>
                  {acc.alreadyMigrated && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleConfirmClearLegacy(acc)}
                      style={{ color: 'var(--color-danger)' }}
                    >
                      <Trash2 size={14} /> Confirmar e limpar local
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ─── 3. Acessibilidade e Apoio AEE ──────────────── */}
      <Section title="♿ Acessibilidade e Apoio AEE" icon={<Eye size={18} />}>
        <div style={{
          background: 'var(--color-bg-subtle)',
          border: '2px solid var(--color-border)',
          borderRadius: '12px',
          padding: '16px 18px',
          marginBottom: '20px',
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
        </div>
      </Section>

      {/* ─── 4. Export / Import ─────────────────────── */}
      <Section title="💾 Portabilidade e Backup (JSON)">
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
          Exporte uma cópia completa dos seus dados em formato JSON ou importe um backup anterior (sem duplicar tarefas ou sessões já salvas).
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => handleExport(user.id)} id="settings-export-btn">
            <Download size={16} /> Exportar backup (JSON)
          </button>
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} id="settings-import-btn">
            <Upload size={16} /> Importar backup (JSON)
          </button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </Section>

      {/* ─── 5. Danger Zone ─────────────────────────── */}
      <Section title="⚠️ Zona de perigo">
        {!showDeleteConfirm ? (
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Excluir sua conta remove todos os seus dados salvos. Esta ação não pode ser desfeita.
            </p>
            <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)} id="settings-delete-account-btn">
              <Trash2 size={16} /> Excluir meus dados e sair
            </button>
          </div>
        ) : (
          <div className="alert alert-danger">
            <div>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>Tem certeza? Todos os seus dados serão excluídos.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-danger btn-sm" onClick={handleDeleteAccount} id="settings-confirm-delete-btn">
                  Sim, excluir tudo
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowDeleteConfirm(false)}>
                  Cancelar
                </button>
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
