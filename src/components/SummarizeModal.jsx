import React, { useState } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { summarizeText } from '../utils/summarizer.js';

export default function SummarizeModal({ onClose }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSummarize = () => {
    if (!text.trim() || text.trim().length < 50) return;
    setLoading(true);
    setTimeout(() => {
      const out = summarizeText(text, 5);
      setResult(out);
      setLoading(false);
    }, 400);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }} role="dialog" aria-modal="true" aria-labelledby="summarize-modal-title">
        <div className="modal-header">
          <h2 className="modal-title" id="summarize-modal-title">
            <span style={{ marginRight: 8 }}>📄</span> Resumir texto
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </div>

        <div className="modal-body">
          {!result ? (
            <>
              <p className="text-secondary" style={{ marginBottom: 14, fontSize: '0.9rem' }}>
                Cole aqui o texto que deseja resumir — extraímos as ideias principais automaticamente.
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="summarize-input">Texto original</label>
                <textarea
                  id="summarize-input"
                  className="form-textarea"
                  style={{ minHeight: 200 }}
                  placeholder="Cole ou digite o texto aqui (mínimo 50 caracteres)..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  autoFocus
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{text.length} caracteres</span>
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={handleSummarize}
                disabled={loading || text.trim().length < 50}
                id="summarize-submit-btn"
              >
                {loading ? 'Resumindo...' : 'Gerar resumo'}
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Lightbulb size={16} className="text-primary" /> Ideias principais
                </h4>
                <ol style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 0 }}>
                  {result.sentences.map((s, i) => (
                    <li key={i} style={{
                      display: 'flex', gap: 12, padding: '10px 14px',
                      background: 'var(--color-bg-subtle)', borderRadius: 8,
                      fontSize: '0.92rem', lineHeight: 1.5,
                    }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0 }}>{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>

              {result.keywords.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: 8 }}>Palavras-chave</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {result.keywords.map(k => (
                      <span key={k} className="chip" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderColor: 'var(--color-primary-muted)' }}>{k}</span>
                    ))}
                  </div>
                </div>
              )}

              <button className="btn btn-secondary" style={{ marginTop: 20 }} onClick={() => setResult(null)} id="summarize-redo-btn">
                Resumir outro texto
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
