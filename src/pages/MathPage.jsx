import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Volume2,
  CheckCircle2,
  HelpCircle,
  PlayCircle,
  BookOpen,
  Calculator,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Timer,
  Plus,
  Trash2,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import * as DataService from '../services/DataService.js';
import * as TeacherService from '../services/TeacherService.js';
import { STUDY_SUBJECT_TABS, resolveStudySubjectTab } from '../data/cetepStudyCatalog.js';
import { doesSubjectMatchStudyTab } from '../utils/subjects.js';
import toast from 'react-hot-toast';

const CUSTOM_VIDEOS_KEY = 'cetep_custom_videos';

const MATH_TOOLS = [
  { id: 'fracoes', title: 'Frações e Porcentagem', sub: 'Barra visual de equivalência' },
  { id: 'regra3', title: 'Regra de Três Simples', sub: 'Proporção e multiplicação em X' },
  { id: 'equacoes', title: 'Equações de 1º e 2º Grau', sub: 'Isolamento e Bhaskara em 3 etapas' },
  { id: 'graficos', title: 'Gráficos e Média por Unidade', sub: 'Leitura guiada e simulador CETEP' },
];

const INFO_TOOLS = [
  { id: 'binario', title: 'Sistema Binário (8 Bits)', sub: 'Arquitetura de Computadores' },
  { id: 'redes', title: 'Taxa de Download (Mbps / MBs)', sub: 'Redes de Computadores' },
  { id: 'logica', title: 'Operador MOD (%) e Layout CSS', sub: 'Lógica de Programação e Web' },
];

function speakText(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    toast.error('Leitura em voz alta não suportada neste navegador.');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = 0.98;
  window.speechSynthesis.speak(utterance);
}

export default function MathPage() {
  const { user } = useAuth();
  const { completeStudyExerciseWithReward } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialTab = searchParams.get('tab') || 'matematica';
  const resolvedInitial = resolveStudySubjectTab ? resolveStudySubjectTab(initialTab) : (STUDY_SUBJECT_TABS.find(t => t.id === initialTab) || STUDY_SUBJECT_TABS[0]);
  const [activeSubjectId, setActiveSubjectId] = useState(resolvedInitial.id);

  const activeSubject = STUDY_SUBJECT_TABS.find(t => t.id === activeSubjectId) || STUDY_SUBJECT_TABS[0];

  // Seção ativa na coluna principal:
  // 'lab' (ferramenta interativa) | 'passos' (aulas em passos) | 'exercicios' | 'videos' | 'turma' (conteúdos publicados pelo professor)
  const [subTab, setSubTab] = useState(() => (activeSubject.hasInteractiveLab ? 'lab' : 'passos'));
  const [mathTool, setMathTool] = useState('fracoes');
  const [infoTool, setInfoTool] = useState('binario');

  // Conteúdos e comunicados publicados pelos professores nas turmas em que o estudante está matriculado
  const [teacherClassFeed, setTeacherClassFeed] = useState({
    enrolledClasses: [],
    contents: [],
    announcements: [],
  });

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    TeacherService.getStudentEnrolledClassesFeed(user)
      .then(feed => {
        if (mounted && feed) {
          setTeacherClassFeed({
            enrolledClasses: feed.enrolledClasses || [],
            contents: feed.contents || [],
            announcements: feed.announcements || [],
          });
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      const target = resolveStudySubjectTab
        ? resolveStudySubjectTab(tabFromUrl)
        : STUDY_SUBJECT_TABS.find(t => t.id === tabFromUrl);
      if (target && target.id !== activeSubjectId) {
        setActiveSubjectId(target.id);
        setSubTab(target.hasInteractiveLab ? 'lab' : 'passos');
      }
    }
  }, [searchParams, activeSubjectId]);

  const handleSelectSubject = (subjectId) => {
    const target = resolveStudySubjectTab
      ? resolveStudySubjectTab(subjectId)
      : (STUDY_SUBJECT_TABS.find(t => t.id === subjectId) || STUDY_SUBJECT_TABS[0]);
    setActiveSubjectId(target.id);
    setSearchParams({ tab: target.id });
    setSubTab(target.hasInteractiveLab ? 'lab' : 'passos');
  };

  // Progresso de exercícios concluídos
  const [completedExercises, setCompletedExercises] = useState(() => {
    if (!user?.id) return [];
    return DataService.getStudyProgress(user.id)?.completedExercises || [];
  });

  // Estado dos módulos passo a passo
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [moduleStepMap, setModuleStepMap] = useState({});

  // Estado dos exercícios guiados
  const [exerciseChoiceMap, setExerciseChoiceMap] = useState({});
  const [exerciseHintsMap, setExerciseHintsMap] = useState({});
  const [exerciseFeedbackMap, setExerciseFeedbackMap] = useState({});

  // Videoaulas personalizadas
  const [customVideos, setCustomVideos] = useState(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_VIDEOS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoTopic, setNewVideoTopic] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');

  // ── Estados do Simulador de Matemática (LDB) ──────────────────────────────
  const [fracNum, setFracNum] = useState(3);
  const [fracDen, setFracDen] = useState(4);

  const [r3A, setR3A] = useState(15);
  const [r3B, setR3B] = useState(6);
  const [r3C, setR3C] = useState(30);
  const [r3LabelA, setR3LabelA] = useState('Minutos');
  const [r3LabelB, setR3LabelB] = useState('Questões');

  const [eqMode, setEqMode] = useState('1grau');
  const [eq1A, setEq1A] = useState(2);
  const [eq1B, setEq1B] = useState(4);
  const [eq1C, setEq1C] = useState(14);
  const [eq2A, setEq2A] = useState(1);
  const [eq2B, setEq2B] = useState(-5);
  const [eq2C, setEq2C] = useState(6);
  const [eq2RevealedStep, setEq2RevealedStep] = useState(1);

  const [chartHighlight, setChartHighlight] = useState('all');
  const [notaU1, setNotaU1] = useState(6.5);
  const [notaU2, setNotaU2] = useState(7.0);
  const [notaU3, setNotaU3] = useState(8.0);

  // ── Estados do Simulador de Informática (SUPROT/SEC-BA) ───────────────────
  const [bits, setBits] = useState([0, 0, 0, 0, 1, 0, 1, 0]);
  const [storageGB, setStorageGB] = useState(2);

  const [netMbps, setNetMbps] = useState(100);
  const [fileSizeMB, setFileSizeMB] = useState(250);

  const [modA, setModA] = useState(17);
  const [modB, setModB] = useState(5);
  const [cssCols, setCssCols] = useState(4);
  const [screenPx, setScreenPx] = useState(1200);

  // ── Handlers de Exercícios Guiados (Anti-Farm +10 XP) ─────────────────────
  const handleRevealHint = (exId, maxHints) => {
    setExerciseHintsMap(prev => ({
      ...prev,
      [exId]: Math.min(maxHints, (prev[exId] || 0) + 1),
    }));
  };

  const handleCheckExercise = (exercise) => {
    const selected = exerciseChoiceMap[exercise.id];
    if (typeof selected !== 'number') {
      toast.error('Selecione uma alternativa antes de verificar.');
      return;
    }

    if (selected === exercise.correctIndex) {
      const result = completeStudyExerciseWithReward(exercise.id, 10);
      setExerciseFeedbackMap(prev => ({
        ...prev,
        [exercise.id]: { correct: true, text: exercise.explanation },
      }));
      if (result.awarded) {
        setCompletedExercises(result.progress.completedExercises || []);
        toast.success(`Resposta correta (+${result.points} XP).`, { duration: 4000 });
        if (result.newAchievements?.length > 0) {
          result.newAchievements.forEach(a => {
            setTimeout(() => toast.success(`Conquista: ${a.title}`, { duration: 5000 }), 800);
          });
        }
      } else {
        toast.success('Resposta correta (exercício já validado anteriormente).');
      }
    } else {
      setExerciseFeedbackMap(prev => ({
        ...prev,
        [exercise.id]: {
          correct: false,
          text: 'Resposta incorreta. Consulte uma dica abaixo e tente novamente.',
        },
      }));
    }
  };

  // ── Handler para salvar sugestão de videoaula personalizada ───────────────
  const handleAddCustomVideo = (e) => {
    e.preventDefault();
    if (!newVideoTitle.trim() || !newVideoUrl.trim()) {
      toast.error('Preencha o título e o link da videoaula.');
      return;
    }
    const entry = {
      id: `custom-vid-${Date.now()}`,
      title: newVideoTitle.trim(),
      topic: newVideoTopic.trim() || activeSubject.shortLabel,
      url: newVideoUrl.trim(),
      channel: 'Sugestão adicionada na plataforma',
      duration: 'Aula externa',
      notes: 'Link complementar salvo neste navegador.',
      isCustom: true,
    };
    const listForSubject = customVideos[activeSubject.id] || [];
    const updated = {
      ...customVideos,
      [activeSubject.id]: [...listForSubject, entry],
    };
    setCustomVideos(updated);
    localStorage.setItem(CUSTOM_VIDEOS_KEY, JSON.stringify(updated));
    setNewVideoTitle('');
    setNewVideoTopic('');
    setNewVideoUrl('');
    toast.success('Videoaula adicionada.');
  };

  const handleDeleteCustomVideo = (vidId) => {
    const listForSubject = (customVideos[activeSubject.id] || []).filter(v => v.id !== vidId);
    const updated = { ...customVideos, [activeSubject.id]: listForSubject };
    setCustomVideos(updated);
    localStorage.setItem(CUSTOM_VIDEOS_KEY, JSON.stringify(updated));
    toast.success('Videoaula removida.');
  };

  // Cálculos Matemática
  const safeDen = Math.max(1, Number(fracDen) || 1);
  const safeNum = Math.min(safeDen, Math.max(0, Number(fracNum) || 0));
  const fracDecimal = safeNum / safeDen;
  const fracPercent = (fracDecimal * 100).toFixed(1).replace(/\.0$/, '');

  const r3Result = Number(r3A) !== 0 ? ((Number(r3B) * Number(r3C)) / Number(r3A)) : null;

  const eq1RightAfterSub = Number(eq1C) - Number(eq1B);
  const eq1X = Number(eq1A) !== 0 ? eq1RightAfterSub / Number(eq1A) : null;

  const delta = Number(eq2B) ** 2 - 4 * Number(eq2A) * Number(eq2C);
  const eq2HasRealRoots = Number(eq2A) !== 0 && delta >= 0;
  const eq2X1 = eq2HasRealRoots ? (-Number(eq2B) + Math.sqrt(delta)) / (2 * Number(eq2A)) : null;
  const eq2X2 = eq2HasRealRoots ? (-Number(eq2B) - Math.sqrt(delta)) / (2 * Number(eq2A)) : null;

  const chartData = [
    { day: 'Seg', minutes: 20 },
    { day: 'Ter', minutes: 45 },
    { day: 'Qua', minutes: 30 },
    { day: 'Qui', minutes: 60 },
    { day: 'Sex', minutes: 35 },
  ];
  const mediaUnidades = ((Number(notaU1) + Number(notaU2) + Number(notaU3)) / 3);

  // Cálculos Informática
  const bitWeights = [128, 64, 32, 16, 8, 4, 2, 1];
  const binaryDecimalValue = bits.reduce((acc, bit, idx) => acc + (bit ? bitWeights[idx] : 0), 0);
  const binaryString = bits.join('');

  const realMBps = Math.max(0.1, Number(netMbps) || 0) / 8;
  const downloadSeconds = realMBps > 0 ? (Math.max(1, Number(fileSizeMB) || 0) / realMBps) : 0;

  const safeModB = Math.max(1, Math.floor(Number(modB) || 1));
  const safeModA = Math.floor(Number(modA) || 0);
  const modQuotient = Math.floor(safeModA / safeModB);
  const modRemainder = safeModA % safeModB;

  const allVideosForSubject = [
    ...(activeSubject.videoSuggestions || []),
    ...(customVideos[activeSubject.id] || []),
    ...(activeSubject.id === 'filosofia_sociologia' ? (customVideos.humanas || []) : []),
  ];

  const subjectContentsFromTeachers = teacherClassFeed.contents.filter(cnt =>
    doesSubjectMatchStudyTab(cnt.subject, activeSubject.id)
  );

  const currentTools = activeSubject.id === 'matematica'
    ? MATH_TOOLS
    : activeSubject.id === 'informatica'
      ? INFO_TOOLS
      : [];

  const activeToolId = activeSubject.id === 'matematica' ? mathTool : infoTool;
  const setActiveToolId = activeSubject.id === 'matematica' ? setMathTool : setInfoTool;

  const activeModule = activeSubject.modules[selectedModuleIndex] || activeSubject.modules[0];

  return (
    <div>
      {/* ─── 1. Cabeçalho Limpo + Abas de Disciplina Integradas ─── */}
      <div className="page-header" style={{ marginBottom: 18, paddingBottom: 14 }}>
        <div className="page-header-left">
          <div className="academic-kicker">
            <GraduationCap size={14} />
            {activeSubject.legalBasis}
          </div>
          <h1>Cadernos de Estudo</h1>
          <p>{activeSubject.description}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => speakText(`${activeSubject.label}. ${activeSubject.description}`)}
          >
            <Volume2 size={14} /> Ouvir resumo
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/focus?subject=${encodeURIComponent(activeSubject.label)}`)}
            id="study-start-focus-btn"
          >
            <Timer size={14} /> Focar em {activeSubject.shortLabel}
          </button>
        </div>
      </div>

      {/* ─── Barra Única de Disciplinas (Sem Badges Poluídos, Alinhada) ─── */}
      <div
        role="tablist"
        aria-label="Disciplinas"
        style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          marginBottom: 20,
          paddingBottom: 12,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {STUDY_SUBJECT_TABS.map(tab => {
          const isActive = tab.id === activeSubject.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                handleSelectSubject(tab.id);
                setSelectedModuleIndex(0);
              }}
              id={`study-tab-${tab.id}`}
              className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
            >
              {tab.shortLabel}
            </button>
          );
        })}
      </div>

      {/* ─── 2. Layout Master-Detail: Índice Lateral (Esquerda) + Conteúdo Único (Direita) ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          gap: 22,
          alignItems: 'start',
        }}
        className="study-master-detail"
      >
        {/* COLUNA ESQUERDA: Sumário do Caderno */}
        <aside className="card" style={{ padding: '14px 12px' }}>
          {currentTools.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--color-text-muted)',
                  padding: '0 8px 6px',
                }}
              >
                Simuladores Práticos
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {currentTools.map((tool, idx) => {
                  const selected = subTab === 'lab' && activeToolId === tool.id;
                  return (
                    <button
                      key={tool.id}
                      id={`${activeSubject.id === 'matematica' ? 'math' : 'info'}-tool-${tool.id}`}
                      onClick={() => {
                        setSubTab('lab');
                        setActiveToolId(tool.id);
                      }}
                      style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: 6,
                        background: selected ? 'var(--color-primary-light)' : 'transparent',
                        borderLeft: `3px solid ${selected ? 'var(--color-primary)' : 'transparent'}`,
                        color: selected ? 'var(--color-primary)' : 'var(--color-text)',
                        cursor: 'pointer',
                        transition: 'background 0.12s',
                      }}
                    >
                      <div style={{ fontSize: '0.83rem', fontWeight: selected ? 700 : 600 }}>
                        {idx + 1}. {tool.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 1 }}>
                        {tool.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-muted)',
                padding: '0 8px 6px',
              }}
            >
              Material da Disciplina
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <button
                id="subtab-passos-btn"
                onClick={() => setSubTab('passos')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 10px',
                  borderRadius: 6,
                  background: subTab === 'passos' ? 'var(--color-primary-light)' : 'transparent',
                  borderLeft: `3px solid ${subTab === 'passos' ? 'var(--color-primary)' : 'transparent'}`,
                  color: subTab === 'passos' ? 'var(--color-primary)' : 'var(--color-text)',
                  fontWeight: subTab === 'passos' ? 700 : 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={15} /> Explicações Passo a Passo
                </span>
                <span className="badge badge-neutral">{activeSubject.modules.length}</span>
              </button>

              <button
                id="subtab-exercicios-btn"
                onClick={() => setSubTab('exercicios')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 10px',
                  borderRadius: 6,
                  background: subTab === 'exercicios' ? 'var(--color-primary-light)' : 'transparent',
                  borderLeft: `3px solid ${subTab === 'exercicios' ? 'var(--color-primary)' : 'transparent'}`,
                  color: subTab === 'exercicios' ? 'var(--color-primary)' : 'var(--color-text)',
                  fontWeight: subTab === 'exercicios' ? 700 : 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={15} /> Exercícios Guiados
                </span>
                <span className="badge badge-neutral">{activeSubject.exercises.length}</span>
              </button>

              <button
                id="subtab-videos-btn"
                onClick={() => setSubTab('videos')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 10px',
                  borderRadius: 6,
                  background: subTab === 'videos' ? 'var(--color-primary-light)' : 'transparent',
                  borderLeft: `3px solid ${subTab === 'videos' ? 'var(--color-primary)' : 'transparent'}`,
                  color: subTab === 'videos' ? 'var(--color-primary)' : 'var(--color-text)',
                  fontWeight: subTab === 'videos' ? 700 : 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PlayCircle size={15} /> Videoaulas de Apoio
                </span>
                <span className="badge badge-neutral">{allVideosForSubject.length}</span>
              </button>

              <button
                id="subtab-turma-btn"
                onClick={() => setSubTab('turma')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 10px',
                  borderRadius: 6,
                  background: subTab === 'turma' ? 'var(--color-primary-light)' : 'transparent',
                  borderLeft: `3px solid ${subTab === 'turma' ? 'var(--color-primary)' : 'transparent'}`,
                  color: subTab === 'turma' ? 'var(--color-primary)' : 'var(--color-text)',
                  fontWeight: subTab === 'turma' ? 700 : 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GraduationCap size={15} /> Conteúdos da Turma
                </span>
                <span className={`badge ${subjectContentsFromTeachers.length > 0 ? 'badge-primary' : 'badge-neutral'}`}>
                  {subjectContentsFromTeachers.length}
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* COLUNA DIREITA: Palco Principal Único (Sem barras empilhadas) */}
        <main style={{ minWidth: 0 }}>
          {/* Destaque automático quando o professor publicou conteúdos para esta disciplina */}
          {subjectContentsFromTeachers.length > 0 && subTab !== 'turma' && (
            <div
              className="card"
              style={{
                marginBottom: 16,
                padding: '12px 16px',
                borderLeft: '4px solid var(--color-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ fontSize: '0.86rem' }}>
                <strong>📚 {subjectContentsFromTeachers.length} conteúdo(s) publicado(s) pelo professor em {activeSubject.shortLabel}:</strong>{' '}
                {subjectContentsFromTeachers.map(c => c.title).join(' · ')}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setSubTab('turma')}
              >
                Ver materiais da turma
              </button>
            </div>
          )}
          {/* ══════════════════════════════════════════════════════════════════
              1. SIMULADORES DE MATEMÁTICA (LDB)
             ══════════════════════════════════════════════════════════════════ */}
          {subTab === 'lab' && activeSubject.id === 'matematica' && (
            <>
              {/* FERRAMENTA 1: Barra Visual de Frações, Decimais e Porcentagem */}
              {mathTool === 'fracoes' && (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                    <div>
                      <span className="badge badge-primary" style={{ marginBottom: 6 }}>Simulador 1 · Nivelamento</span>
                      <h2>Fração, Decimal e Porcentagem</h2>
                      <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)' }}>
                        Ajuste os controles ou clique diretamente nos blocos da barra para visualizar a equivalência.
                      </p>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        speakText(
                          `Você selecionou ${safeNum} sobre ${safeDen}. Em número decimal isso vale ${fracDecimal.toFixed(2)}, o que corresponde a ${fracPercent} por cento da barra.`
                        )
                      }
                    >
                      <Volume2 size={14} /> Ouvir explicação
                    </button>
                  </div>

                  <div className="grid-2" style={{ marginBottom: 18, padding: 14, borderRadius: 8, background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)' }}>
                    <div>
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Partes preenchidas (Numerador)</span>
                        <strong>{safeNum}</strong>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={safeDen}
                        value={safeNum}
                        onChange={e => setFracNum(Number(e.target.value))}
                        style={{ width: '100%', marginTop: 6 }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total de divisões iguais (Denominador)</span>
                        <strong>{safeDen}</strong>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={12}
                        value={safeDen}
                        onChange={e => {
                          const nextDen = Number(e.target.value);
                          setFracDen(nextDen);
                          if (fracNum > nextDen) setFracNum(nextDen);
                        }}
                        style={{ width: '100%', marginTop: 6 }}
                      />
                    </div>
                  </div>

                  {/* Barra SVG dividida em fatias */}
                  <div style={{ marginBottom: 20 }}>
                    <svg viewBox="0 0 600 58" style={{ width: '100%', height: 58 }}>
                      {Array.from({ length: safeDen }, (_, i) => {
                        const sliceW = 600 / safeDen;
                        const active = i < safeNum;
                        return (
                          <g key={i} onClick={() => setFracNum(i + 1)} style={{ cursor: 'pointer' }}>
                            <rect
                              x={i * sliceW + 2}
                              y={4}
                              width={Math.max(4, sliceW - 4)}
                              height={50}
                              rx={5}
                              fill={active ? 'var(--color-primary)' : 'var(--color-bg-subtle)'}
                              stroke="var(--color-border)"
                              strokeWidth="1.5"
                            />
                            <text
                              x={i * sliceW + sliceW / 2}
                              y={34}
                              textAnchor="middle"
                              fill={active ? '#ffffff' : 'var(--color-text-muted)'}
                              fontSize="13"
                              fontWeight="700"
                            >
                              1/{safeDen}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* 3 cartões de equivalência */}
                  <div className="grid-3">
                    <div className="stat-card" style={{ textAlign: 'center' }}>
                      <div className="stat-label">1. Fração</div>
                      <div className="stat-value" style={{ color: 'var(--color-primary)', fontSize: '1.75rem' }}>
                        {safeNum}/{safeDen}
                      </div>
                      <div className="stat-sub">{safeNum} parte(s) de {safeDen}</div>
                    </div>
                    <div className="stat-card" style={{ textAlign: 'center' }}>
                      <div className="stat-label">2. Decimal (Divisão)</div>
                      <div className="stat-value" style={{ fontSize: '1.75rem' }}>
                        {fracDecimal.toFixed(2).replace('.', ',')}
                      </div>
                      <div className="stat-sub">Cálculo: {safeNum} ÷ {safeDen}</div>
                    </div>
                    <div className="stat-card" style={{ textAlign: 'center' }}>
                      <div className="stat-label">3. Porcentagem (× 100)</div>
                      <div className="stat-value" style={{ color: 'var(--color-success)', fontSize: '1.75rem' }}>
                        {fracPercent}%
                      </div>
                      <div className="stat-sub">Cálculo: {fracDecimal.toFixed(2).replace('.', ',')} × 100</div>
                    </div>
                  </div>
                </div>
              )}

              {/* FERRAMENTA 2: Montador Guiado de Regra de Três */}
              {mathTool === 'regra3' && (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                    <div>
                      <span className="badge badge-primary" style={{ marginBottom: 6 }}>Simulador 2 · Proporcionalidade</span>
                      <h2>Regra de Três Simples</h2>
                      <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)' }}>
                        Alinhe grandezas da mesma espécie na mesma coluna para montar a multiplicação cruzada.
                      </p>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        speakText(
                          `Se ${r3A} ${r3LabelA} correspondem a ${r3B} ${r3LabelB}, então para ${r3C} ${r3LabelA} multiplicamos cruzado: ${r3B} vezes ${r3C} dividido por ${r3A}, resultando em ${r3Result !== null ? r3Result.toFixed(2) : 'indefinido'}.`
                        )
                      }
                    >
                      <Volume2 size={14} /> Ouvir passo a passo
                    </button>
                  </div>

                  <div className="grid-2" style={{ marginBottom: 14 }}>
                    <div>
                      <label className="form-label">Grandeza da Coluna 1</label>
                      <input className="form-input" value={r3LabelA} onChange={e => setR3LabelA(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Grandeza da Coluna 2</label>
                      <input className="form-input" value={r3LabelB} onChange={e => setR3LabelB(e.target.value)} />
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      gap: 12,
                      alignItems: 'center',
                      padding: 16,
                      borderRadius: 8,
                      background: 'var(--color-bg-subtle)',
                      border: '1px solid var(--color-border)',
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <label className="form-label">Valor A ({r3LabelA})</label>
                      <input type="number" className="form-input" value={r3A} onChange={e => setR3A(e.target.value)} />
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text-muted)', fontSize: '0.9rem', paddingTop: 18 }}>→</div>
                    <div>
                      <label className="form-label">Valor B ({r3LabelB})</label>
                      <input type="number" className="form-input" value={r3B} onChange={e => setR3B(e.target.value)} />
                    </div>

                    <div>
                      <label className="form-label">Valor C ({r3LabelA})</label>
                      <input type="number" className="form-input" value={r3C} onChange={e => setR3C(e.target.value)} />
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text-muted)', fontSize: '0.9rem', paddingTop: 18 }}>→</div>
                    <div>
                      <label className="form-label">Resultado X ({r3LabelB})</label>
                      <div
                        style={{
                          padding: '9px 12px',
                          borderRadius: 7,
                          background: 'var(--color-primary-light)',
                          border: '1px solid var(--color-primary)',
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: 'var(--color-primary)',
                        }}
                      >
                        X = {r3Result !== null ? Number(r3Result.toFixed(2)) : '—'} {r3LabelB}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ padding: '10px 14px', borderRadius: 6, background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', fontSize: '0.88rem' }}>
                      <strong>Etapa 1 (Multiplicação cruzada):</strong> {r3A} · X = {r3B} × {r3C}
                    </div>
                    <div style={{ padding: '10px 14px', borderRadius: 6, background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', fontSize: '0.88rem' }}>
                      <strong>Etapa 2 (Produto):</strong> {r3A} · X = {Number(r3B) * Number(r3C)}
                    </div>
                    <div style={{ padding: '10px 14px', borderRadius: 6, background: 'var(--color-success-light)', border: '1px solid var(--color-border)', fontSize: '0.9rem', fontWeight: 600 }}>
                      <strong>Etapa 3 (Isolar X):</strong> X = {Number(r3B) * Number(r3C)} ÷ {r3A} ={' '}
                      <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                        {r3Result !== null ? Number(r3Result.toFixed(2)) : 'Divisão por zero'} {r3LabelB}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* FERRAMENTA 3: Equações de 1º e 2º Grau Passo a Passo */}
              {mathTool === 'equacoes' && (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                    <div>
                      <span className="badge badge-primary" style={{ marginBottom: 6 }}>Simulador 3 · Álgebra Ensino Médio</span>
                      <h2>Resolução Guiada de Equações</h2>
                    </div>
                    <div style={{ display: 'inline-flex', gap: 4, padding: 3, borderRadius: 7, background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)' }}>
                      <button
                        className={`btn btn-sm ${eqMode === '1grau' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setEqMode('1grau')}
                      >
                        1º Grau (ax + b = c)
                      </button>
                      <button
                        className={`btn btn-sm ${eqMode === '2grau' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => {
                          setEqMode('2grau');
                          setEq2RevealedStep(1);
                        }}
                      >
                        2º Grau (Bhaskara)
                      </button>
                    </div>
                  </div>

                  {eqMode === '1grau' ? (
                    <div>
                      <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                        Equação atual: <strong>{eq1A}x + ({eq1B}) = {eq1C}</strong>. Isole a incógnita <strong>x</strong> aplicando a operação inversa em cada etapa.
                      </p>
                      <div className="grid-3" style={{ marginBottom: 16 }}>
                        <div>
                          <label className="form-label">Coeficiente a</label>
                          <input type="number" className="form-input" value={eq1A} onChange={e => setEq1A(e.target.value)} />
                        </div>
                        <div>
                          <label className="form-label">Termo b</label>
                          <input type="number" className="form-input" value={eq1B} onChange={e => setEq1B(e.target.value)} />
                        </div>
                        <div>
                          <label className="form-label">Resultado c</label>
                          <input type="number" className="form-input" value={eq1C} onChange={e => setEq1C(e.target.value)} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ padding: 12, borderRadius: 6, background: 'var(--color-bg-input)', border: '1px solid var(--color-border)' }}>
                          <strong>Etapa 1 (Equação inicial):</strong> <code>{eq1A}x + ({eq1B}) = {eq1C}</code>
                        </div>
                        <div style={{ padding: 12, borderRadius: 6, background: 'var(--color-bg-input)', border: '1px solid var(--color-border)' }}>
                          <strong>Etapa 2 (Transpor o termo {eq1B}):</strong>{' '}
                          <code>
                            {eq1A}x = {eq1C} - ({eq1B}) → {eq1A}x = {eq1RightAfterSub}
                          </code>
                        </div>
                        <div style={{ padding: 12, borderRadius: 6, background: 'var(--color-success-light)', border: '1px solid var(--color-border)', fontWeight: 700 }}>
                          <strong>Etapa 3 (Dividir pelo coeficiente {eq1A}):</strong>{' '}
                          <code>
                            x = {eq1RightAfterSub} ÷ {eq1A} = {eq1X !== null ? Number(eq1X.toFixed(2)) : 'Indefinido (a=0)'}
                          </code>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                        Equação atual: <strong>{eq2A}x² + ({eq2B})x + ({eq2C}) = 0</strong>. Avance pelas 3 etapas para evitar erros de sinal.
                      </p>

                      <div className="grid-3" style={{ marginBottom: 16 }}>
                        <div>
                          <label className="form-label">Coeficiente a (x²)</label>
                          <input type="number" className="form-input" value={eq2A} onChange={e => setEq2A(e.target.value)} />
                        </div>
                        <div>
                          <label className="form-label">Coeficiente b (x)</label>
                          <input type="number" className="form-input" value={eq2B} onChange={e => setEq2B(e.target.value)} />
                        </div>
                        <div>
                          <label className="form-label">Termo independente c</label>
                          <input type="number" className="form-input" value={eq2C} onChange={e => setEq2C(e.target.value)} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                        {[1, 2, 3].map(stepNum => (
                          <button
                            key={stepNum}
                            className={`btn btn-sm ${eq2RevealedStep >= stepNum ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setEq2RevealedStep(stepNum)}
                          >
                            Etapa {stepNum}: {stepNum === 1 ? 'Identificar a, b, c' : stepNum === 2 ? 'Calcular Δ (Delta)' : 'Raízes x₁ e x₂'}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {eq2RevealedStep >= 1 && (
                          <div style={{ padding: 12, borderRadius: 6, background: 'var(--color-bg-input)', border: '1px solid var(--color-border)' }}>
                            <strong>Etapa 1 — Coeficientes identificados:</strong>
                            <div style={{ marginTop: 4, fontWeight: 700, color: 'var(--color-primary)' }}>
                              a = {eq2A} &nbsp;|&nbsp; b = {eq2B} &nbsp;|&nbsp; c = {eq2C}
                            </div>
                          </div>
                        )}

                        {eq2RevealedStep >= 2 && (
                          <div style={{ padding: 12, borderRadius: 6, background: 'var(--color-bg-input)', border: '1px solid var(--color-border)' }}>
                            <strong>Etapa 2 — Discriminante (Δ = b² - 4·a·c):</strong>
                            <div style={{ marginTop: 4 }}>
                              <code>
                                Δ = ({eq2B})² - 4 · ({eq2A}) · ({eq2C}) = {Number(eq2B) ** 2} - ({4 * Number(eq2A) * Number(eq2C)}) ={' '}
                                <strong>{delta}</strong>
                              </code>
                            </div>
                            <div style={{ marginTop: 4, fontSize: '0.82rem', color: delta >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                              {delta > 0
                                ? `Δ > 0 (${delta}): duas raízes reais distintas.`
                                : delta === 0
                                  ? 'Δ = 0: uma única raiz real.'
                                  : 'Δ < 0: não possui raízes no conjunto dos números reais.'}
                            </div>
                          </div>
                        )}

                        {eq2RevealedStep >= 3 && (
                          <div style={{ padding: 12, borderRadius: 6, background: 'var(--color-success-light)', border: '1px solid var(--color-border)' }}>
                            <strong>Etapa 3 — Fórmula de Bhaskara: x = (-b ± √Δ) ÷ (2·a)</strong>
                            {eq2HasRealRoots ? (
                              <div style={{ marginTop: 6, fontWeight: 700 }}>
                                <div>
                                  x₁ = (-({eq2B}) + √{delta}) ÷ (2 · {eq2A}) ={' '}
                                  <span style={{ color: 'var(--color-primary)' }}>{Number(eq2X1.toFixed(2))}</span>
                                </div>
                                <div style={{ marginTop: 2 }}>
                                  x₂ = (-({eq2B}) - √{delta}) ÷ (2 · {eq2A}) ={' '}
                                  <span style={{ color: 'var(--color-primary)' }}>{Number(eq2X2.toFixed(2))}</span>
                                </div>
                              </div>
                            ) : (
                              <p style={{ marginTop: 4, fontSize: '0.85rem' }}>
                                Como Δ é negativo ({delta}) ou a = 0, a equação não possui raízes reais.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* FERRAMENTA 4: Leitura Guiada de Gráficos + Simulador de Média CETEP */}
              {mathTool === 'graficos' && (
                <div className="grid-2">
                  <div className="card">
                    <span className="badge badge-primary" style={{ marginBottom: 6 }}>Estatística & Leitura Visual</span>
                    <h3 style={{ marginBottom: 4 }}>Interpretação Guiada de Gráfico</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                      Selecione um foco de análise para destacar os dados no gráfico:
                    </p>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                      <button
                        className={`btn btn-sm ${chartHighlight === 'peak' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setChartHighlight('peak')}
                      >
                        1. Ponto Máximo
                      </button>
                      <button
                        className={`btn btn-sm ${chartHighlight === 'jump' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setChartHighlight('jump')}
                      >
                        2. Maior Variação
                      </button>
                      <button
                        className={`btn btn-sm ${chartHighlight === 'avg' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setChartHighlight('avg')}
                      >
                        3. Média (38 min)
                      </button>
                    </div>

                    <svg viewBox="0 0 360 175" style={{ width: '100%', height: 175, background: 'var(--color-bg-subtle)', borderRadius: 8, border: '1px solid var(--color-border)', padding: 6 }}>
                      {chartHighlight === 'avg' && (
                        <g>
                          <line x1="30" y1={145 - (38 / 60) * 105} x2="340" y2={145 - (38 / 60) * 105} stroke="var(--color-warning)" strokeWidth="2" strokeDasharray="4,4" />
                          <text x="335" y={139 - (38 / 60) * 105} textAnchor="end" fontSize="11" fontWeight="700" fill="var(--color-warning)">
                            Média: 38 min
                          </text>
                        </g>
                      )}
                      {chartData.map((d, i) => {
                        const barH = (d.minutes / 60) * 105;
                        const x = 45 + i * 62;
                        const y = 145 - barH;
                        const isHighlighted =
                          chartHighlight === 'all' ||
                          (chartHighlight === 'peak' && d.day === 'Qui') ||
                          (chartHighlight === 'jump' && (d.day === 'Qua' || d.day === 'Qui')) ||
                          chartHighlight === 'avg';
                        return (
                          <g key={d.day}>
                            <rect
                              x={x}
                              y={y}
                              width={36}
                              height={barH}
                              rx={4}
                              fill={isHighlighted ? 'var(--color-primary)' : 'var(--color-border)'}
                            />
                            <text x={x + 18} y={y - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-text)">
                              {d.minutes}m
                            </text>
                            <text x={x + 18} y={164} textAnchor="middle" fontSize="11" fill="var(--color-text-secondary)">
                              {d.day}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    <p style={{ marginTop: 10, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      {chartHighlight === 'peak' && 'Valor máximo: Quinta-feira registra o maior tempo (60 minutos).'}
                      {chartHighlight === 'jump' && 'Maior crescimento: entre Quarta (30m) e Quinta (60m), aumento de +30 min.'}
                      {chartHighlight === 'avg' && 'Média aritmética: soma dos 5 dias (190 min) dividida por 5 = 38 min/dia.'}
                      {chartHighlight === 'all' && 'Clique nos botões acima para destacar cada leitura estatística.'}
                    </p>
                  </div>

                  {/* Simulador de Média das 3 Unidades do CETEP */}
                  <div className="card">
                    <span className="badge badge-primary" style={{ marginBottom: 6 }}>Avaliação Escolar</span>
                    <h3 style={{ marginBottom: 4 }}>Cálculo de Média das Unidades</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                      Informe as notas das 3 unidades para calcular sua média aritmética:
                    </p>

                    <div className="grid-3" style={{ marginBottom: 16 }}>
                      <div>
                        <label className="form-label">I Unidade</label>
                        <input type="number" step="0.1" min="0" max="10" className="form-input" value={notaU1} onChange={e => setNotaU1(e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">II Unidade</label>
                        <input type="number" step="0.1" min="0" max="10" className="form-input" value={notaU2} onChange={e => setNotaU2(e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">III Unidade</label>
                        <input type="number" step="0.1" min="0" max="10" className="form-input" value={notaU3} onChange={e => setNotaU3(e.target.value)} />
                      </div>
                    </div>

                    <div
                      style={{
                        padding: 16,
                        borderRadius: 8,
                        border: '1px solid var(--color-border)',
                        background: mediaUnidades >= 5 ? 'var(--color-success-light)' : 'var(--color-warning-light)',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                        Média = ({notaU1} + {notaU2} + {notaU3}) ÷ 3
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text)', margin: '4px 0', fontVariantNumeric: 'tabular-nums' }}>
                        {mediaUnidades.toFixed(1).replace('.', ',')}
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                        {mediaUnidades >= 7
                          ? 'Desempenho igual ou superior a 7,0.'
                          : mediaUnidades >= 5
                            ? 'Média igual ou superior a 5,0.'
                            : `Faltam ${(15 - (Number(notaU1) + Number(notaU2) + Number(notaU3))).toFixed(1).replace('.', ',')} pontos na soma das unidades para atingir média 5,0.`}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              2. SIMULADORES DE INFORMÁTICA (SUPROT / SEC-BA)
             ══════════════════════════════════════════════════════════════════ */}
          {subTab === 'lab' && activeSubject.id === 'informatica' && (
            <>
              {infoTool === 'binario' && (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                    <div>
                      <span className="badge badge-primary" style={{ marginBottom: 6 }}>Arquitetura de Computadores (80h)</span>
                      <h2>Conversor de 1 Byte (8 Bits): Binário ↔ Decimal</h2>
                      <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)' }}>
                        Clique nos bits para alternar entre <strong>1</strong> (ligado) e <strong>0</strong> (desligado) e observe a soma das potências de base 2.
                      </p>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        speakText(`O byte ${binaryString} em binário equivale ao número ${binaryDecimalValue} em decimal.`)
                      }
                    >
                      <Volume2 size={14} /> Ouvir resultado
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(8, minmax(48px, 1fr))',
                      gap: 8,
                      overflowX: 'auto',
                      marginBottom: 18,
                    }}
                  >
                    {bits.map((bit, idx) => {
                      const weight = bitWeights[idx];
                      return (
                        <button
                          key={weight}
                          onClick={() => {
                            const next = [...bits];
                            next[idx] = next[idx] ? 0 : 1;
                            setBits(next);
                          }}
                          style={{
                            padding: '10px 6px',
                            borderRadius: 7,
                            border: `1.5px solid ${bit ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            background: bit ? 'var(--color-primary)' : 'var(--color-bg-input)',
                            color: bit ? '#ffffff' : 'var(--color-text)',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>2^{7 - idx}</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, margin: '2px 0' }}>+{weight}</div>
                          <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 4 }}>{bit}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid-2">
                    <div className="stat-card" style={{ textAlign: 'center' }}>
                      <div className="stat-label">Valor Decimal (Soma dos bits 1)</div>
                      <div className="stat-value" style={{ color: 'var(--color-primary)', fontSize: '2rem' }}>
                        {binaryDecimalValue}
                      </div>
                      <div className="stat-sub">Binário: <code>{binaryString}₂</code></div>
                    </div>

                    <div className="stat-card">
                      <label className="form-label">Conversor de Armazenamento (GB → MB)</label>
                      <input
                        type="number"
                        min="1"
                        max="1024"
                        className="form-input"
                        value={storageGB}
                        onChange={e => setStorageGB(e.target.value)}
                      />
                      <div style={{ marginTop: 6, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                        <strong>{storageGB} GB</strong> = <strong>{(Number(storageGB) * 1024).toLocaleString('pt-BR')} MB</strong> (1 Byte = 8 bits)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {infoTool === 'redes' && (
                <div className="card">
                  <span className="badge badge-primary" style={{ marginBottom: 6 }}>Redes de Computadores I e II (120h)</span>
                  <h2 style={{ marginBottom: 4 }}>Taxa de Transferência: Mbps ÷ 8 = MB/s</h2>
                  <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                    Links de rede são medidos em <em>Megabits por segundo (Mbps)</em> e arquivos em <em>MegaBytes (MB)</em>. Como 1 Byte = 8 bits, dividimos por 8.
                  </p>

                  <div className="grid-2" style={{ marginBottom: 16 }}>
                    <div>
                      <label className="form-label">Velocidade da Rede (Mbps)</label>
                      <input type="number" min="1" className="form-input" value={netMbps} onChange={e => setNetMbps(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Tamanho do Arquivo (MB)</label>
                      <input type="number" min="1" className="form-input" value={fileSizeMB} onChange={e => setFileSizeMB(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="stat-card" style={{ textAlign: 'center' }}>
                      <div className="stat-label">Taxa Real de Download (MB/s)</div>
                      <div className="stat-value" style={{ color: 'var(--color-primary)' }}>
                        {realMBps.toFixed(2).replace('.', ',')} MB/s
                      </div>
                      <div className="stat-sub">Cálculo: {netMbps} Mbps ÷ 8 bits</div>
                    </div>
                    <div className="stat-card" style={{ textAlign: 'center' }}>
                      <div className="stat-label">Tempo Estimado</div>
                      <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                        {downloadSeconds.toFixed(1).replace('.', ',')} seg
                      </div>
                      <div className="stat-sub">Cálculo: {fileSizeMB} MB ÷ {realMBps.toFixed(2).replace('.', ',')} MB/s</div>
                    </div>
                  </div>
                </div>
              )}

              {infoTool === 'logica' && (
                <div className="grid-2">
                  <div className="card">
                    <span className="badge badge-primary" style={{ marginBottom: 6 }}>Lógica de Programação</span>
                    <h3 style={{ marginBottom: 4 }}>Operador Resto da Divisão (A % B)</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                      Verifique o quociente inteiro, o resto da divisão e a paridade:
                    </p>
                    <div className="grid-2" style={{ marginBottom: 14 }}>
                      <div>
                        <label className="form-label">Dividendo (A)</label>
                        <input type="number" className="form-input" value={modA} onChange={e => setModA(e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">Divisor (B)</label>
                        <input type="number" min="1" className="form-input" value={modB} onChange={e => setModB(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 7, background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', fontSize: '0.88rem' }}>
                      <div>Quociente inteiro: <code>Math.floor({safeModA} / {safeModB}) = {modQuotient}</code></div>
                      <div style={{ marginTop: 4, fontWeight: 700, color: 'var(--color-primary)' }}>
                        Resto (MOD): <code>{safeModA} % {safeModB} = {modRemainder}</code>
                      </div>
                      <div style={{ marginTop: 4, color: 'var(--color-text-secondary)' }}>
                        Paridade de {safeModA}: <strong>{safeModA % 2 === 0 ? 'PAR (resto 0)' : 'ÍMPAR (resto 1)'}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <span className="badge badge-primary" style={{ marginBottom: 6 }}>Desenvolvimento Web</span>
                    <h3 style={{ marginBottom: 4 }}>Proporção de Colunas em CSS</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                      Cálculo de largura percentual e em pixels para grades responsivas:
                    </p>
                    <div className="grid-2" style={{ marginBottom: 14 }}>
                      <div>
                        <label className="form-label">Largura do Container (px)</label>
                        <input type="number" min="320" className="form-input" value={screenPx} onChange={e => setScreenPx(e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">Nº de Colunas</label>
                        <input type="number" min="1" max="12" className="form-input" value={cssCols} onChange={e => setCssCols(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 7, background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-primary)' }}>
                        Cada coluna: {(100 / Math.max(1, Number(cssCols) || 1)).toFixed(2)}% ({Math.round(Number(screenPx) / Math.max(1, Number(cssCols) || 1))}px)
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                        {Array.from({ length: Math.min(12, Math.max(1, Number(cssCols) || 1)) }, (_, i) => (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              background: 'var(--color-primary)',
                              color: '#fff',
                              fontSize: '0.68rem',
                              textAlign: 'center',
                              padding: '5px 2px',
                              borderRadius: 4,
                            }}
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              3. EXPLICAÇÕES PASSO A PASSO (UM MÓDULO POR VEZ, FOCO LIMPO)
             ══════════════════════════════════════════════════════════════════ */}
          {subTab === 'passos' && activeModule && (
            <div className="card">
              {/* Se houver mais de 1 módulo, seletor limpo de capítulos no topo do card */}
              {activeSubject.modules.length > 1 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--color-border)' }}>
                  {activeSubject.modules.map((m, idx) => (
                    <button
                      key={m.id}
                      className={`btn btn-sm ${idx === selectedModuleIndex ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelectedModuleIndex(idx)}
                    >
                      Módulo {idx + 1}: {m.tag}
                    </button>
                  ))}
                </div>
              )}

              {(() => {
                const currentStepIdx = moduleStepMap[activeModule.id] || 0;
                const currentStep = activeModule.steps[currentStepIdx] || activeModule.steps[0];
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                      <div>
                        <span className="badge badge-primary" style={{ marginBottom: 4 }}>{activeModule.tag}</span>
                        <h2>{activeModule.title}</h2>
                        <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)' }}>{activeModule.subtitle}</p>
                      </div>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => speakText(`${activeModule.title}. ${currentStep.title}. ${currentStep.text}`)}
                      >
                        <Volume2 size={14} /> Ouvir etapa
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                      {activeModule.steps.map((_, idx) => (
                        <button
                          key={idx}
                          className={`btn btn-sm ${idx === currentStepIdx ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setModuleStepMap(prev => ({ ...prev, [activeModule.id]: idx }))}
                        >
                          Etapa {idx + 1} de {activeModule.steps.length}
                        </button>
                      ))}
                    </div>

                    <div
                      style={{
                        padding: 18,
                        borderRadius: 8,
                        background: 'var(--color-bg-subtle)',
                        border: '1px solid var(--color-border)',
                        borderLeft: '4px solid var(--color-primary)',
                      }}
                    >
                      <h3 style={{ marginBottom: 6, color: 'var(--color-primary)' }}>{currentStep.title}</h3>
                      <p style={{ fontSize: '0.94rem', lineHeight: 1.6, marginBottom: 12 }}>{currentStep.text}</p>
                      {currentStep.formula && (
                        <div
                          style={{
                            padding: '10px 14px',
                            borderRadius: 6,
                            background: 'var(--color-bg-card)',
                            border: '1px solid var(--color-border)',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            fontSize: '0.92rem',
                          }}
                        >
                          {currentStep.formula}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={currentStepIdx === 0}
                        onClick={() => setModuleStepMap(prev => ({ ...prev, [activeModule.id]: Math.max(0, currentStepIdx - 1) }))}
                      >
                        <ChevronLeft size={14} /> Etapa anterior
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={currentStepIdx >= activeModule.steps.length - 1}
                        onClick={() =>
                          setModuleStepMap(prev => ({
                            ...prev,
                            [activeModule.id]: Math.min(activeModule.steps.length - 1, currentStepIdx + 1),
                          }))
                        }
                      >
                        Próxima etapa <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              4. EXERCÍCIOS GUIADOS COM DICAS PROGRESSIVAS (+10 XP)
             ══════════════════════════════════════════════════════════════════ */}
          {subTab === 'exercicios' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {activeSubject.exercises.map((ex, index) => {
                const isCompleted = completedExercises.includes(ex.id);
                const selectedOption = exerciseChoiceMap[ex.id];
                const hintsOpened = exerciseHintsMap[ex.id] || 0;
                const feedback = exerciseFeedbackMap[ex.id];

                return (
                  <div key={ex.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span className="badge badge-neutral">Questão {index + 1}</span>
                        {ex.subject && <span className="chip">{ex.subject}</span>}
                        {ex.topic && <span className="chip">{ex.topic}</span>}
                        {ex.difficulty && (
                          <span className={`badge ${ex.difficulty === 'Avançado' ? 'badge-danger' : ex.difficulty === 'Intermediário' ? 'badge-warning' : 'badge-primary'}`}>
                            {ex.difficulty}
                          </span>
                        )}
                        <h4>{ex.title}</h4>
                        {isCompleted ? (
                          <span className="badge badge-success">Concluído (+10 XP)</span>
                        ) : (
                          <span className="badge badge-primary">+10 XP</span>
                        )}
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => speakText(`${ex.title}. ${ex.question}`)}
                      >
                        <Volume2 size={14} /> Ouvir
                      </button>
                    </div>

                    <p style={{ fontSize: '0.92rem', marginBottom: 14, color: 'var(--color-text)' }}>{ex.question}</p>

                    <div className="grid-2" style={{ gap: 8, marginBottom: 14 }}>
                      {ex.options.map((opt, idx) => {
                        const isSelected = selectedOption === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => setExerciseChoiceMap(prev => ({ ...prev, [ex.id]: idx }))}
                            id={`exercise-${ex.id}-opt-${idx}`}
                            style={{
                              textAlign: 'left',
                              padding: '10px 12px',
                              borderRadius: 6,
                              border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                              background: isSelected ? 'var(--color-primary-light)' : 'var(--color-bg-input)',
                              color: 'var(--color-text)',
                              fontWeight: isSelected ? 700 : 500,
                              fontSize: '0.88rem',
                              cursor: 'pointer',
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {hintsOpened > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                        {ex.hints.slice(0, hintsOpened).map((hint, hIdx) => (
                          <div
                            key={hIdx}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 6,
                              background: 'var(--color-warning-light)',
                              border: '1px solid var(--color-border)',
                              fontSize: '0.84rem',
                              color: 'var(--color-text)',
                            }}
                          >
                            {hint}
                          </div>
                        ))}
                      </div>
                    )}

                    {feedback && (
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: 6,
                          marginBottom: 12,
                          border: '1px solid var(--color-border)',
                          background: feedback.correct ? 'var(--color-success-light)' : 'var(--color-warning-light)',
                          fontWeight: 600,
                          fontSize: '0.86rem',
                        }}
                      >
                        {feedback.text}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleCheckExercise(ex)}
                        id={`exercise-${ex.id}-check-btn`}
                      >
                        <CheckCircle2 size={14} /> Verificar resposta
                      </button>
                      {hintsOpened < ex.hints.length && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRevealHint(ex.id, ex.hints.length)}
                        >
                          <HelpCircle size={14} /> Ver dica ({hintsOpened + 1}/{ex.hints.length})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              5. VIDEOAULAS DE APOIO
             ══════════════════════════════════════════════════════════════════ */}
          {subTab === 'videos' && (
            <div>
              <div className="grid-2" style={{ marginBottom: 18 }}>
                {allVideosForSubject.map(vid => (
                  <div key={vid.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span className="badge badge-primary">{vid.topic}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{vid.duration}</span>
                      </div>
                      <h4 style={{ marginBottom: 4 }}>{vid.title}</h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>{vid.channel}</p>
                      <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>{vid.notes}</p>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                      <a
                        href={vid.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm"
                      >
                        <ExternalLink size={14} /> Acessar aula
                      </a>
                      {vid.isCustom && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDeleteCustomVideo(vid.id)}
                          title="Remover videoaula"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="card">
                <h3 style={{ marginBottom: 4 }}>Cadastrar Videoaula em {activeSubject.shortLabel}</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                  Adicione links de aulas do YouTube para consulta rápida nesta disciplina.
                </p>
                <form onSubmit={handleAddCustomVideo} className="grid-3" style={{ alignItems: 'end' }}>
                  <div>
                    <label className="form-label">Título da aula</label>
                    <input
                      className="form-input"
                      placeholder="Ex: Revisão de Frações"
                      value={newVideoTitle}
                      onChange={e => setNewVideoTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Tópico</label>
                    <input
                      className="form-input"
                      placeholder={`Ex: ${activeSubject.shortLabel}`}
                      value={newVideoTopic}
                      onChange={e => setNewVideoTopic(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">URL do Vídeo</label>
                      <input
                        className="form-input"
                        placeholder="https://youtube.com/..."
                        value={newVideoUrl}
                        onChange={e => setNewVideoUrl(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
                      <Plus size={15} /> Salvar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              6. CONTEÚDOS E MATERIAIS PUBLICADOS PELO PROFESSOR NA TURMA
             ══════════════════════════════════════════════════════════════════ */}
          {subTab === 'turma' && (
            <div className="card">
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ marginBottom: 4 }}>Conteúdos da Turma em {activeSubject.shortLabel}</h2>
                <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Materiais, apostilas e links publicados pelos seus professores para a sua turma.
                </p>
              </div>

              {subjectContentsFromTeachers.length === 0 ? (
                <div style={{
                  padding: '28px 20px',
                  borderRadius: 10,
                  background: 'var(--color-bg-subtle)',
                  border: '1px dashed var(--color-border)',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.88rem',
                }}>
                  Nenhum material específico de <strong>{activeSubject.shortLabel}</strong> foi publicado pelos professores da sua turma até o momento.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {subjectContentsFromTeachers.map(cnt => (
                    <div
                      key={cnt.id}
                      style={{
                        padding: '16px 18px',
                        borderRadius: 10,
                        background: 'var(--color-bg-input)',
                        border: '1px solid var(--color-border)',
                        borderLeft: '4px solid var(--color-primary)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                        <div>
                          <h3 style={{ fontSize: '1rem', margin: '0 0 4px' }}>{cnt.title}</h3>
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                            {cnt.className && <strong>{cnt.className} · </strong>}
                            Disciplina: {cnt.subject} · Prof. {cnt.authorName} ·{' '}
                            {cnt.createdAt ? new Date(cnt.createdAt).toLocaleDateString('pt-BR') : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => speakText(`${cnt.title}. ${cnt.description || ''}`)}
                        >
                          <Volume2 size={14} /> Ouvir
                        </button>
                      </div>
                      {cnt.description && (
                        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', margin: '8px 0 12px', whiteSpace: 'pre-wrap' }}>
                          {cnt.description}
                        </p>
                      )}
                      {cnt.resourceUrl && (
                        <a
                          href={cnt.resourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-primary btn-sm"
                        >
                          <ExternalLink size={14} /> Abrir material / videoaula
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
