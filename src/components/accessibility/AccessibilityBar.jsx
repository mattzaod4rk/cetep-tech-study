import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Sun, Moon, Mic, Type, Settings, Sparkles } from 'lucide-react';
import { useApp } from '../../contexts/AppContext.jsx';

export default function AccessibilityBar() {
  const {
    settings,
    updateSettings,
    increaseFontSize,
    decreaseFontSize,
    setIsTranscriptionOpen,
    isTranscriptionOpen
  } = useApp();
  const navigate = useNavigate();

  const currentTheme = settings.theme || 'light';
  const currentFont = settings.fontSize || 'medium';

  const fontLevels = [
    { id: 'medium', label: 'Padrão (100%)', short: 'A' },
    { id: 'large', label: 'Baixa Visão (130%)', short: 'A+' },
    { id: 'xlarge', label: 'Baixíssima Visão (165%)', short: 'A++' },
    { id: 'huge', label: 'Máxima (200%)', short: 'MAX' },
  ];

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
            Ajustes para Baixa Visão, Alto Contraste e Baixa Audição
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

          {/* Contrast Controls */}
          <div className="a11y-group" role="group" aria-label="Contraste de cor">
            <span className="a11y-label d-none-tablet">Contraste:</span>
            <button
              type="button"
              onClick={() => updateSettings({ theme: currentTheme === 'highcontrast' ? 'light' : 'highcontrast' })}
              className={`a11y-btn a11y-btn-contrast-yellow ${currentTheme === 'highcontrast' ? 'active' : ''}`}
              title="Alto Contraste Amarelo sobre Preto (Máxima distinção visual)"
              aria-label="Alto contraste preto e amarelo"
              aria-pressed={currentTheme === 'highcontrast'}
            >
              <span className="contrast-dot-yellow" aria-hidden="true" />
              <span>Alto Contraste</span>
            </button>

            <button
              type="button"
              onClick={() => updateSettings({ theme: currentTheme === 'highcontrast-white' ? 'light' : 'highcontrast-white' })}
              className={`a11y-btn a11y-btn-contrast-white ${currentTheme === 'highcontrast-white' ? 'active' : ''}`}
              title="Alto Contraste Preto sobre Branco Puro (Sem tons de cinza)"
              aria-label="Alto contraste preto e branco"
              aria-pressed={currentTheme === 'highcontrast-white'}
            >
              <span className="contrast-dot-white" aria-hidden="true" />
              <span className="d-none-mobile">Contraste P&B</span>
            </button>
          </div>

          <div className="a11y-divider" aria-hidden="true" />

          {/* Hearing Impairment Speech-to-Text Button */}
          <button
            type="button"
            onClick={() => setIsTranscriptionOpen(prev => !prev)}
            className={`a11y-btn a11y-btn-voice ${isTranscriptionOpen ? 'active' : ''}`}
            title="Abrir Transcrição de Voz ao Vivo (Legendas em tempo real para pessoas com baixa audição)"
            aria-label="Legendas e Transcrição de voz ao vivo para baixa audição"
            aria-expanded={isTranscriptionOpen}
          >
            <Mic size={15} aria-hidden="true" />
            <span>Transcrição de Voz (Legendas)</span>
          </button>

          {/* Settings shortcut */}
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="a11y-btn a11y-btn-icon"
            title="Ver todas as configurações de acessibilidade"
            aria-label="Configurações completas de acessibilidade"
          >
            <Settings size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
