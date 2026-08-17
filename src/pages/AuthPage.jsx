import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import toast from 'react-hot-toast';

const SUBJECTS = ['Algoritmos', 'Redes', 'Hardware', 'SO', 'BD', 'Web', 'Programação', 'Outro'];

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'aluno' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (mode === 'register' && !form.name.trim()) errs.name = 'Nome é obrigatório.';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'E-mail inválido.';
    if (form.password.length < 6) errs.password = 'Senha deve ter pelo menos 6 caracteres.';
    if (mode === 'register' && form.password !== form.confirm) errs.confirm = 'As senhas não coincidem.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        const user = await login({ email: form.email, password: form.password });
        toast.success(`Bem-vindo de volta, ${user.name.split(' ')[0]}! 👋`);
        navigate(user.role === 'professor' ? '/teacher' : '/dashboard');
      } else {
        const user = await register({ name: form.name, email: form.email, password: form.password, role: form.role });
        toast.success(`Conta criada! Bem-vindo ao CETEP Tech Study, ${user.name.split(' ')[0]}! 🎉`);
        navigate(user.role === 'professor' ? '/teacher' : '/dashboard');
      }
    } catch (err) {
      toast.error(err.message || 'Algo deu errado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    setForm({ name: '', email: '', password: '', confirm: '', role: 'aluno' });
    setErrors({});
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: 60, height: 60,
            background: 'var(--color-primary)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: 'var(--shadow-md)',
          }}>
            <GraduationCap size={30} color="white" />
          </div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>CETEP Tech Study</h1>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
            Plataforma de apoio ao Técnico em Informática
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px' }}>
          {/* Mode toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--color-bg-subtle)',
            borderRadius: 10,
            padding: 4,
            marginBottom: 28,
          }}>
            {['login', 'register'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode()}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: mode === m ? 'var(--color-bg-card)' : 'transparent',
                  color: mode === m ? 'var(--color-text)' : 'var(--color-text-muted)',
                  boxShadow: mode === m ? 'var(--shadow-xs)' : 'none',
                  border: 'none',
                }}
              >
                {m === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Name (register only) */}
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

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="auth-email">E-mail</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  id="auth-email"
                  className="form-input"
                  style={{ paddingLeft: 36 }}
                  type="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="auth-pass">Senha</label>
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

            {/* Confirm password (register only) */}
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

            {/* Role selector (register only) */}
            {mode === 'register' && (
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">Tipo de conta</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[
                    { value: 'aluno', emoji: '🎓', label: 'Sou aluno' },
                    { value: 'professor', emoji: '🏫', label: 'Sou professor' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set('role', opt.value)}
                      style={{
                        flex: 1,
                        padding: '12px 8px',
                        borderRadius: 10,
                        border: `2px solid ${form.role === opt.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: form.role === opt.value ? 'var(--color-primary-light)' : 'var(--color-bg-input)',
                        color: form.role === opt.value ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span style={{ fontSize: '1.4rem' }}>{opt.emoji}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: 4 }}
              disabled={loading}
              id="auth-submit-btn"
            >
              {loading ? (
                <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Aguarde...</>
              ) : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
            {mode === 'login' ? 'Não tem conta ainda?' : 'Já tem uma conta?'}{' '}
            <button
              type="button"
              onClick={switchMode}
              style={{ color: 'var(--color-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {mode === 'login' ? 'Criar conta' : 'Entrar'}
            </button>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
          Seus dados ficam salvos apenas neste navegador. Exporte-os nas Configurações.
        </p>
      </div>
    </div>
  );
}
