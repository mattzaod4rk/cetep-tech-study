import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Sun, Moon, Monitor, Mic, Volume2, VolumeX, Settings, Sparkles } from 'lucide-react';
import { useApp } from '../../contexts/AppContext.jsx';
import toast from 'react-hot-toast';

export default function AccessibilityBar() {
  const {
    settings,
    updateSettings,
    setIsTranscriptionOpen,
    isTranscriptionOpen
  } = useApp();
  const navigate = useNavigate();

  const [isSpeaking, setIsSpeaking] = useState(false);

  const currentTheme = settings.theme || 'dark';
  const currentFont = settings.fontSize || 'medium';

  const fontLevels = [
    { id: 'medium', label: 'Padrão (100%)', short: 'A' },
    { id: 'large', label: 'Baixa Visão (130%)', short: 'A+' },
    { id: 'xlarge', label: 'Baixíssima Visão (165%)', short: 'A++' },
    { id: 'huge', label: 'Máxima (200%)', short: 'MAX' },
  ];

  // ── Text-to-Speech (TTS — Leitor de Tela) ─────────────────────────
  const handleReadPage = () => {
    if (!('speechSynthesis' in window)) {
      toast.error('Seu navegador não suporta síntese de voz (TTS).');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      toast('Leitura em voz alta pausada.', { icon: '⏹️' });
      return;
    }

    // Extract text from the page content
    const contentEl = document.querySelector('.page-content') || document.body;
    // Get headings, paragraphs, and cards text
    const textNodes = contentEl.querySelectorAll('h1, h2, h3, p, .task-title, .stat-value, .alert');
    let textToRead = '';

    if (textNodes.length > 0) {
      const parts = [];
      textNodes.forEach(node => {
        const text = node.innerText?.trim();
        if (text && text.length > 1 && !parts.includes(text)) {
          parts.push(text);
        }
      });
      textToRead = parts.slice(0, 15).join('. '); // Read up to 15 key blocks
    } else {
      textToRead = contentEl.innerText?.slice(0, 500) || 'Página sem texto para leitura.';
    }

    if (!textToRead.trim()) {
      toast.error('Nenhum texto encontrado para leitura.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt'));
    if (ptVoice) utterance.voice = ptVoice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      toast.success('🔊 Lendo conteúdo da página em voz alta...');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div
      className="accessibility-bar"
      role="region"
      aria-label="Barra de Acessibilidade e Apoio AEE"
    >
      <div className="accessibility-bar-inner">
        {/* Badge & Title */}
        <div className="a11y-badge-group">
          <span className="a11y-badge">
            <Eye size={14} aria-hidden="true" />
            <span>Acessibilidade AEE</span>
          </span>
          <span className="a11y-desc d-none-mobile">
            Ajustes visuais, auditivos e neurodiversos
          </span>
        </div>

        {/* Action Controls */}
        <div className="a11y-controls">
          {/* Font Controls */}
          <div className="a11y-group" role="group" aria-label="Tamanho da fonte">
            <span className="a11y-label d-none-tablet">Fonte:</span>
            {fontLevels.map(lvl => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => updateSettings({ fontSize: lvl.id })}
                className={`a11y-btn ${currentFont === lvl.id ? 'active' : ''}`}
                title={`Alterar tamanho do texto para ${lvl.label}`}
                aria-label={`Tamanho ${lvl.label}`}
                aria-pressed={currentFont === lvl.id}
              >
                {lvl.short}
              </button>
            ))}
          </div>

          <div className="a11y-divider" aria-hidden="true" />

          {/* Theme & Contrast Controls */}
          <div className="a11y-group" role="group" aria-label="Tema e Contraste">
            <span className="a11y-label d-none-tablet">Tema:</span>

            {/* Dark mode button */}
            <button
              type="button"
              onClick={() => updateSettings({ theme: 'dark' })}
              className={`a11y-btn ${currentTheme === 'dark' ? 'active' : ''}`}
              title="Modo Escuro (Menor cansaço visual)"
              aria-label="Modo Escuro"
              aria-pressed={currentTheme === 'dark'}
            >
              <Moon size={13} aria-hidden="true" />
              <span>Escuro</span>
            </button>

            {/* Light mode button */}
            <button
              type="button"
              onClick={() => updateSettings({ theme: 'light' })}
              className={`a11y-btn ${currentTheme === 'light' ? 'active' : ''}`}
              title="Modo Claro (Padrão)"
              aria-label="Modo Claro"
              aria-pressed={currentTheme === 'light'}
            >
              <Sun size={13} aria-hidden="true" />
              <span className="d-none-mobile">Claro</span>
            </button>

            {/* High contrast Yellow */}
            <button
              type="button"
              onClick={() => updateSettings({ theme: 'highcontrast' })}
              className={`a11y-btn a11y-btn-contrast-yellow ${currentTheme === 'highcontrast' ? 'active' : ''}`}
              title="Alto Contraste Amarelo sobre Preto (Máxima distinção visual AEE)"
              aria-label="Alto contraste preto e amarelo"
              aria-pressed={currentTheme === 'highcontrast'}
            >
              <span className="contrast-dot-yellow" aria-hidden="true" />
              <span>Alto Contraste</span>
            </button>

            {/* High contrast White/Black */}
            <button
              type="button"
              onClick={() => updateSettings({ theme: 'highcontrast-white' })}
              className={`a11y-btn a11y-btn-contrast-white ${currentTheme === 'highcontrast-white' ? 'active' : ''}`}
              title="Alto Contraste Preto sobre Branco Puro (Sem tons de cinza)"
              aria-label="Alto contraste preto e branco"
              aria-pressed={currentTheme === 'highcontrast-white'}
            >
              <span className="contrast-dot-white" aria-hidden="true" />
              <span className="d-none-mobile">P&B</span>
            </button>
          </div>

          <div className="a11y-divider" aria-hidden="true" />

          {/* Text-To-Speech (TTS — Ouvir Tela em Voz Alta) */}
          <button
            type="button"
            onClick={handleReadPage}
            className={`a11y-btn a11y-btn-tts ${isSpeaking ? 'active-speaking' : ''}`}
            title="Leitor de Texto em Voz Alta (TTS — Para estudantes com baixa visão, dislexia ou apoio na leitura)"
            aria-label={isSpeaking ? 'Parar leitura em voz alta' : 'Ouvir página em voz alta (TTS)'}
            aria-pressed={isSpeaking}
          >
            {isSpeaking ? <VolumeX size={15} color="#e53935" /> : <Volume2 size={15} />}
            <span>{isSpeaking ? 'Parar Leitura' : 'Ouvir Tela (TTS)'}</span>
          </button>

          {/* Hearing Impairment Speech-to-Text Button (STT — Legendas ao vivo) */}
          <button
            type="button"
            onClick={() => setIsTranscriptionOpen(prev => !prev)}
            className={`a11y-btn a11y-btn-voice ${isTranscriptionOpen ? 'active' : ''}`}
            title="Abrir Transcrição de Voz ao Vivo (Legendas em tempo real para pessoas com baixa audição)"
            aria-label="Legendas e Transcrição de voz ao vivo para baixa audição"
            aria-expanded={isTranscriptionOpen}
          >
            <Mic size={15} aria-hidden="true" />
            <span>Legendas (Audição)</span>
          </button>

          {/* Settings shortcut */}
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="a11y-btn a11y-btn-icon"
            title="Configurações completas de acessibilidade"
            aria-label="Configurações completas"
          >
            <Settings size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
