import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, User, Mail, Lock, ShieldCheck, KeyRound, ArrowLeft, Cloud, Database } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import * as DataService from '../services/DataService.js';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login, register, loginWithGoogle, resetPassword, isCloudEnabled, usingEmulator } = useAuth();
  const navigate = useNavigate();

  const legacyAccountsCount = DataService.getLegacyLocalAccounts(null).length;

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (mode === 'register' && !form.name.trim()) errs.name = 'Nome completo é obrigatório.';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Informe um e-mail válido.';
    if (mode !== 'reset') {
      if (form.password.length < 6) errs.password = 'A senha deve ter pelo menos 6 caracteres.';
      if (mode === 'register' && form.password !== form.confirm) errs.confirm = 'As senhas não coincidem.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'reset') {
        await resetPassword(form.email);
        toast.success('Link de redefinição de senha enviado! Verifique sua caixa de entrada e spam.');
        setMode('login');
        return;
      }

      if (mode === 'login') {
        const user = await login({ email: form.email, password: form.password });
        toast.success(`Bem-vindo de volta, ${user.name.split(' ')[0]}!`);
        navigate(user.role === 'professor' ? '/teacher' : '/dashboard');
      } else {
        // Segurança: cadastro público cria exclusivamente perfil de estudante ('aluno')
        const user = await register({ name: form.name, email: form.email, password: form.password });
        if (user.verificationSent) {
          toast.success(`Conta criada! Enviamos um link de confirmação para ${user.email}.`);
        } else {
          toast.success(`Conta criada! Bem-vindo ao CETEP Tech Study, ${user.name.split(' ')[0]}!`);
        }
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.message || 'Algo deu errado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const user = await loginWithGoogle();
      toast.success(`Conectado com Google como ${user.name.split(' ')[0]}!`);
      navigate(user.role === 'professor' ? '/teacher' : '/dashboard');
    } catch (err) {
      toast.error(err.message || 'Não foi possível entrar com o Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const switchMode = (targetMode) => {
    setMode(targetMode);
    setErrors({});
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: '450px' }}>
        {/* Identidade Institucional */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: 56, height: 56,
            background: 'var(--color-primary)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: 'var(--shadow-md)',
          }}>
            <GraduationCap size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '1.55rem', marginBottom: 4 }}>CETEP Tech Study</h1>
          <p className="text-secondary" style={{ fontSize: '0.88rem', margin: 0 }}>
            CETEP Recôncavo II Alberto Torres · Técnico em Informática
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '3px 10px', borderRadius: 999, background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', fontSize: '0.74rem', color: 'var(--color-text-secondary)' }}>
            <Cloud size={13} color="var(--color-primary)" />
            {isCloudEnabled
              ? (usingEmulator ? 'Firebase Emulator Suite (Ambiente Local Isolado)' : 'Sincronização em Nuvem Firebase Ativa')
              : 'Modo Local (Configure .env.local para sincronização em nuvem)'}
          </div>
        </div>

        {/* Card Principal */}
        <div className="card" style={{ padding: '28px 30px' }}>
          {mode !== 'reset' ? (
            <div style={{
              display: 'flex',
              background: 'var(--color-bg-subtle)',
              borderRadius: 10,
              padding: 4,
              marginBottom: 24,
            }}>
              {[
                { id: 'login', label: 'Entrar' },
                { id: 'register', label: 'Criar conta' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchMode(tab.id)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: mode === tab.id ? 'var(--color-bg-card)' : 'transparent',
                    color: mode === tab.id ? 'var(--color-text)' : 'var(--color-text-muted)',
                    boxShadow: mode === tab.id ? 'var(--shadow-xs)' : 'none',
                    border: 'none',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => switchMode('login')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', padding: 0, marginBottom: 10 }}
              >
                <ArrowLeft size={15} /> Voltar para o login
              </button>
              <h2 style={{ fontSize: '1.15rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <KeyRound size={18} color="var(--color-primary)" /> Recuperar senha
              </h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                Informe seu e-mail cadastrado para receber o link seguro de redefinição de senha.
              </p>
            </div>
          )}

          {/* Botão Google Sign-In (Suporta contas pessoais e Google Workspace escolar) */}
          {mode !== 'reset' && isCloudEnabled && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                id="auth-google-btn"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--color-border-strong)',
                  background: 'var(--color-bg-input)',
                  color: 'var(--color-text)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  marginBottom: 8,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.54-5.17 3.54-8.97z" />
                  <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96h-4.01v3.14C3.515 21.3 7.615 24 12.255 24z" />
                  <path fill="#FBBC05" d="M5.535 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62h-4.01C.555 8.56 0 10.72 0 12s.555 3.44 1.525 5.38l4.01-3.14z" />
                  <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0 7.615 0 3.515 2.7 1.525 6.62l4.01 3.14c.95-2.85 3.6-4.96 6.72-4.96z" />
                </svg>
                {googleLoading ? 'Conectando ao Google...' : 'Continuar com Google / E-mail Escolar'}
              </button>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: 16 }}>
                Compatível com Gmail pessoal e contas institucionais Google Workspace (ex: @enova.educacao.ba.gov.br)
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ou com e-mail e senha
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit}>
            {/* Nome (apenas no cadastro) */}
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label" htmlFor="auth-name">Nome completo</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input
                    id="auth-name"
                    className="form-input"
                    style={{ paddingLeft: 36 }}
                    placeholder="Seu nome completo"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    autoComplete="name"
                  />
                </div>
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>
            )}

            {/* E-mail */}
            <div className="form-group">
              <label className="form-label" htmlFor="auth-email">E-mail</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  id="auth-email"
                  className="form-input"
                  style={{ paddingLeft: 36 }}
                  type="email"
                  placeholder="seu@email.com ou conta institucional"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            {/* Senha */}
            {mode !== 'reset' && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" htmlFor="auth-pass" style={{ marginBottom: 0 }}>Senha</label>
                  {mode === 'login' && isCloudEnabled && (
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input
                    id="auth-pass"
                    className="form-input"
                    style={{ paddingLeft: 36, paddingRight: 44 }}
                    type={showPass ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}
                    aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>
            )}

            {/* Confirmar senha (apenas no cadastro) */}
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label" htmlFor="auth-confirm">Confirmar senha</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input
                    id="auth-confirm"
                    className="form-input"
                    style={{ paddingLeft: 36 }}
                    type={showPass ? 'text' : 'password'}
                    placeholder="Repita a senha"
                    value={form.confirm}
                    onChange={e => set('confirm', e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                {errors.confirm && <span className="form-error">{errors.confirm}</span>}
              </div>
            )}

            {/* Aviso de Controle de Acesso no Cadastro Público */}
            {mode === 'register' && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--color-bg-subtle)',
                border: '1px solid var(--color-border)',
                marginBottom: 16,
                fontSize: '0.78rem',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.45,
              }}>
                <ShieldCheck size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong>Perfil Estudante (AEE / CETEP):</strong> O cadastro público cria exclusivamente contas de estudante com dados isolados. Perfis docentes são atribuídos pela coordenação via servidor.
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: 4 }}
              disabled={loading || googleLoading}
              id="auth-submit-btn"
            >
              {loading ? (
                <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Aguarde...</>
              ) : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta de estudante' : 'Enviar link de recuperação'}
            </button>
          </form>

          {mode !== 'reset' && (
            <p style={{ textAlign: 'center', marginTop: 18, fontSize: '0.86rem', color: 'var(--color-text-secondary)' }}>
              {mode === 'login' ? 'Não tem conta ainda?' : 'Já tem uma conta?'}{' '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                style={{ color: 'var(--color-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {mode === 'login' ? 'Criar conta' : 'Entrar'}
              </button>
            </p>
          )}
        </div>

        {/* Aviso de Migração para Usuários Beta */}
        {legacyAccountsCount > 0 && (
          <div style={{
            marginTop: 16,
            padding: '12px 16px',
            borderRadius: 10,
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            fontSize: '0.8rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.45,
          }}>
            <Database size={17} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ color: 'var(--color-text)' }}>Encontramos dados locais da versão Beta neste navegador!</strong>
              <div>
                Crie sua nova conta Firebase (com E-mail ou Google) e acesse <strong>Configurações → Migração Beta</strong> para importar suas tarefas, agenda, XP e sequência sem perder nada.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
