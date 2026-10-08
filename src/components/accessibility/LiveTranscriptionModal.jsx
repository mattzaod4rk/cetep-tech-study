import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Copy, Trash2, X, Maximize2, Minimize2, Type, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LiveTranscriptionModal({ isOpen, onClose }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [captionSize, setCaptionSize] = useState('large'); // 'medium', 'large', 'huge'
  const [isSupported, setIsSupported] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [copied, setCopied] = useState(false);
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let currentInterim = '';
      let finalChunk = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalChunk += event.results[i][0].transcript + ' ';
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      if (finalChunk) {
        setTranscript(prev => prev + finalChunk);
      }
      setInterimText(currentInterim);
    };

    recognition.onerror = (event) => {
      console.warn('SpeechRecognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Permissão de microfone negada. Autorize no navegador.');
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // If user intended to stay listening, restart
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, []);

  // Auto-scroll when new text arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interimText]);

  // Start listening automatically when modal opens if supported
  useEffect(() => {
    if (isOpen && isSupported && recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        // Already started or busy
      }
    }
    if (!isOpen && isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (e) {}
    }
  }, [isOpen]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Reconhecimento de voz não suportado neste navegador.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
      setInterimText('');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        toast.error('Erro ao iniciar microfone. Tente novamente.');
      }
    }
  };

  const handleCopy = () => {
    const fullText = (transcript + ' ' + interimText).trim();
    if (!fullText) {
      toast.error('Nenhum texto para copiar.');
      return;
    }
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success('Transcrição copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setTranscript('');
    setInterimText('');
    toast.success('Transcrição limpa.');
  };

  if (!isOpen) return null;

  const fontSizes = {
    medium: { text: '1.2rem', label: 'Médio' },
    large: { text: '1.65rem', label: 'Grande (Baixa Visão)' },
    huge: { text: '2.2rem', label: 'Gigante (Acessibilidade Máxima)' }
  };

  return (
    <div
      role="dialog"
      aria-labelledby="transcription-title"
      aria-modal="true"
      style={{
        position: 'fixed',
        bottom: isMinimized ? '20px' : '30px',
        right: '24px',
        left: isMinimized ? 'auto' : '24px',
        maxWidth: isMinimized ? '340px' : '900px',
        margin: '0 auto',
        zIndex: 9999,
        background: '#0a0d14',
        color: '#ffffff',
        border: '3px solid #ffea00',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.85), 0 0 20px rgba(255, 234, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      {/* ─── Header ────────────────────────────────────────── */}
      <div
        style={{
          background: '#121826',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid rgba(255, 234, 0, 0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: isListening ? '#e53935' : '#455a64',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: isListening ? 'pulse 1.5s infinite' : 'none',
            }}
          >
            {isListening ? <Mic size={18} color="#fff" /> : <MicOff size={18} color="#fff" />}
          </div>
          <div>
            <h2 id="transcription-title" style={{ fontSize: '1rem', fontWeight: 800, color: '#ffea00', margin: 0 }}>
              Transcrição de Voz ao Vivo (AEE)
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#b0bec5' }}>
              {isListening ? 'Ouvindo e legendando em tempo real...' : 'Microfone pausado'}
            </span>
          </div>
        </div>

        {/* Action controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Audio visualizer dots */}
          {isListening && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '0 8px' }}>
              <span className="audio-wave-bar" style={{ animationDelay: '0s' }} />
              <span className="audio-wave-bar" style={{ animationDelay: '0.2s' }} />
              <span className="audio-wave-bar" style={{ animationDelay: '0.4s' }} />
              <span className="audio-wave-bar" style={{ animationDelay: '0.1s' }} />
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsMinimized(prev => !prev)}
            style={{
              background: 'transparent',
              color: '#fff',
              border: '1px solid #455a64',
              borderRadius: 8,
              padding: '6px',
              cursor: 'pointer',
            }}
            title={isMinimized ? 'Expandir janela' : 'Minimizar janela'}
            aria-label={isMinimized ? 'Expandir' : 'Minimizar'}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#b71c1c',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
            title="Fechar transcrição"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ─── Body (When not minimized) ─────────────────────── */}
      {!isMinimized && (
        <>
          {/* Toolbar for Font size and options */}
          <div
            style={{
              background: '#1a2233',
              padding: '8px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Type size={16} color="#ffea00" />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e0e0e0', marginRight: 4 }}>
                Tamanho da Legenda:
              </span>
              {(['medium', 'large', 'huge']).map(sizeKey => (
                <button
                  key={sizeKey}
                  type="button"
                  onClick={() => setCaptionSize(sizeKey)}
                  style={{
                    background: captionSize === sizeKey ? '#ffea00' : '#263238',
                    color: captionSize === sizeKey ? '#000' : '#fff',
                    border: '1px solid #ffea00',
                    borderRadius: 6,
                    padding: '3px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {fontSizes[sizeKey].label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  background: '#263238',
                  color: '#fff',
                  border: '1px solid #78909c',
                  borderRadius: 6,
                  padding: '5px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {copied ? <Check size={14} color="#69f0ae" /> : <Copy size={14} />}
                Copiar
              </button>
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: '#263238',
                  color: '#ff8a80',
                  border: '1px solid #d32f2f',
                  borderRadius: 6,
                  padding: '5px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Trash2 size={14} />
                Limpar
              </button>
            </div>
          </div>

          {/* Transcript Display Area */}
          <div
            ref={scrollRef}
            tabIndex={0}
            role="region"
            aria-live="polite"
            style={{
              minHeight: '160px',
              maxHeight: '340px',
              overflowY: 'auto',
              padding: '20px',
              background: '#000000',
              color: '#ffffff',
              fontSize: fontSizes[captionSize].text,
              lineHeight: 1.6,
              fontFamily: "'Segoe UI', Arial, sans-serif",
              letterSpacing: '0.02em',
              fontWeight: 600,
            }}
          >
            {!isSupported ? (
              <div style={{ textAlign: 'center', color: '#ffb74d', padding: '24px 10px' }}>
                <AlertCircle size={36} style={{ margin: '0 auto 10px', display: 'block' }} />
                <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  Navegador sem suporte ao Reconhecimento de Fala nativo.
                </p>
                <p style={{ fontSize: '0.9rem', color: '#cfd8dc' }}>
                  Recomendamos utilizar o <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong> no computador da escola para ativar a transcrição com microfone.
                </p>
              </div>
            ) : !transcript && !interimText ? (
              <div style={{ textAlign: 'center', color: '#78909c', padding: '30px 10px' }}>
                <Volume2 size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
                <p style={{ fontSize: '1.2rem', color: '#cfd8dc' }}>
                  {isListening ? 'Fale próximo ao microfone... O que for dito aparecerá aqui.' : 'Clique no botão abaixo para iniciar a captação de voz.'}
                </p>
                <p style={{ fontSize: '0.85rem', color: '#90a4ae', marginTop: 6 }}>
                  Ideal para estudantes com baixa audição acompanharem a explicação do professor em sala de aula.
                </p>
              </div>
            ) : (
              <div>
                <span style={{ color: '#ffffff' }}>{transcript}</span>
                <span style={{ color: '#ffea00', fontStyle: 'italic', background: 'rgba(255, 234, 0, 0.15)', padding: '0 4px', borderRadius: 4 }}>
                  {interimText}
                </span>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div
            style={{
              background: '#121826',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '2px solid rgba(255, 234, 0, 0.4)',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: '#b0bec5' }}>
              💡 <strong>Dica AEE:</strong> Aumente o tamanho da legenda se tiver baixa visão associada.
            </div>

            <button
              type="button"
              onClick={toggleListening}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 10,
                border: 'none',
                background: isListening ? '#c62828' : '#2e7d32',
                color: '#fff',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: isListening ? '0 0 14px rgba(229, 57, 53, 0.6)' : '0 0 14px rgba(46, 125, 50, 0.6)',
              }}
            >
              {isListening ? (
                <>
                  <MicOff size={18} /> Pausar Legenda
                </>
              ) : (
                <>
                  <Mic size={18} /> Ativar Legenda / Ouvir
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
