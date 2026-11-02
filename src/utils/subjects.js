/**
 * Matriz Curricular Oficial — CETEP Recôncavo II Alberto Torres (Cruz das Almas - BA)
 * Baseada na LDB (Art. 35 / BNCC Ensino Médio) e no Catálogo SUPROT / SEC-BA
 * para o Curso Técnico em Informática (Eixo Informação e Comunicação).
 *
 * Organização unificada das 8 áreas dos Cadernos de Estudo, Planejamento Semanal,
 * Publicação de Conteúdos, Atividades e Filtros:
 * 1. Matemática
 * 2. Informática
 * 3. Física
 * 4. História
 * 5. Geografia
 * 6. Filosofia e Sociologia (antiga categoria Humanas, com retrocompatibilidade)
 * 7. Linguagens
 * 8. Química e Biologia
 */

export const STUDY_CATEGORIES = [
  { id: 'matematica', label: 'Matemática' },
  { id: 'informatica', label: 'Informática' },
  { id: 'fisica', label: 'Física' },
  { id: 'historia', label: 'História' },
  { id: 'geografia', label: 'Geografia' },
  { id: 'filosofia_sociologia', label: 'Filosofia e Sociologia' },
  { id: 'linguagens', label: 'Linguagens' },
  { id: 'natureza', label: 'Química e Biologia' },
];

export const SUBJECT_GROUPS = [
  {
    id: 'fgb_ldb',
    label: 'Formação Geral Básica (Ensino Médio — LDB / BNCC)',
    shortLabel: 'Ensino Médio (LDB)',
    subjects: [
      'Matemática e suas Tecnologias',
      'Física',
      'História',
      'Geografia',
      'Filosofia e Sociologia',
      'Filosofia',
      'Sociologia',
      'Português / Redação e Linguagens',
      'Inglês Técnico / Língua Estrangeira',
      'Química e Biologia',
      'Química',
      'Biologia',
    ],
  },
  {
    id: 'tec_suprot',
    label: 'Formação Técnica em Informática (SUPROT / SEC-BA)',
    shortLabel: 'Técnico em Informática (CETEP)',
    subjects: [
      'Informática',
      'Lógica de Programação',
      'Fundamentos e Arquitetura de Computadores',
      'Manutenção de Computadores',
      'Sistemas Operacionais',
      'Redes de Computadores',
      'Banco de Dados',
      'Desenvolvimento Web',
      'Análise e Projeto de Sistemas',
      'Segurança da Informação e Ética',
      'Empreendedorismo e Gestão em TI',
      'TCC / Projeto Experimental',
    ],
  },
  {
    id: 'geral',
    label: 'Organização Pessoal e AEE',
    shortLabel: 'Geral',
    subjects: [
      'Revisão / Nivelamento',
      'Geral',
    ],
  },
];

export const SUBJECTS = SUBJECT_GROUPS.flatMap((group) => group.subjects);

/**
 * Normaliza referências antigas (ex: 'Humanas' ou 'humanas') para a nova nomenclatura
 * sem perder conteúdos ou classificações já salvas.
 */
export function normalizeLegacySubjectName(subject = '') {
  const trimmed = String(subject || '').trim();
  if (!trimmed) return 'Geral';
  if (trimmed.toLowerCase() === 'humanas' || trimmed.toLowerCase() === 'ciências humanas') {
    return 'Filosofia e Sociologia';
  }
  return trimmed;
}

/**
 * Sugestão padrão de Planejamento Semanal equilibrado para o estudante
 * do Técnico em Informática integrado ao Ensino Médio no CETEP Alberto Torres.
 * Contempla a organização atualizada com História, Geografia e Filosofia e Sociologia.
 * (Chaves: 0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb)
 */
export const DEFAULT_WEEKLY_PLAN = {
  1: {
    subjects: ['Matemática e suas Tecnologias', 'Lógica de Programação'],
    goalMinutes: 30,
    note: 'Nivelamento de matemática básica + algoritmos',
  },
  2: {
    subjects: ['Fundamentos e Arquitetura de Computadores', 'Português / Redação e Linguagens'],
    goalMinutes: 25,
    note: 'Sistema binário, hardware e leitura interpretativa',
  },
  3: {
    subjects: ['História', 'Geografia', 'Banco de Dados'],
    goalMinutes: 30,
    note: 'Contexto histórico, território e modelagem de dados',
  },
  4: {
    subjects: ['Redes de Computadores', 'Física'],
    goalMinutes: 25,
    note: 'Taxa de transferência (Mbps/MBs) e grandezas físicas',
  },
  5: {
    subjects: ['Filosofia e Sociologia', 'Química e Biologia', 'Desenvolvimento Web'],
    goalMinutes: 25,
    note: 'Ética, cidadania, sustentabilidade e layout web',
  },
  6: {
    subjects: ['Revisão / Nivelamento'],
    goalMinutes: 20,
    note: 'Revisão leve da semana no seu ritmo',
  },
  0: {
    subjects: [],
    goalMinutes: 0,
    note: 'Descanso e recarga de energia',
  },
};

/**
 * Retorna o ID da aba correspondente nos Cadernos de Estudo (/math?tab=...)
 * para qualquer disciplina da matriz curricular (incluindo retrocompatibilidade com 'humanas').
 */
export function getStudyHubTabForSubject(subject = '') {
  const s = String(subject || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (s.includes('historia')) return 'historia';
  if (s.includes('geografia')) return 'geografia';
  if (s.includes('filosofia') || s.includes('sociologia') || s.includes('humanas')) {
    return 'filosofia_sociologia';
  }
  if (s.includes('fisica')) return 'fisica';
  if (s.includes('portugues') || s.includes('redacao') || s.includes('ingles') || s.includes('linguagens')) {
    return 'linguagens';
  }
  if (s.includes('quimica') || s.includes('biologia') || s.includes('natureza')) {
    return 'natureza';
  }
  if (
    s.includes('programacao') ||
    s.includes('arquitetura') ||
    s.includes('manutencao') ||
    s.includes('redes') ||
    s.includes('banco de dados') ||
    s.includes('web') ||
    s.includes('sistemas') ||
    s.includes('informatica') ||
    s.includes('seguranca') ||
    s.includes('empreendedorismo') ||
    s.includes('tcc')
  ) {
    return 'informatica';
  }
  if (s.includes('matematica') || s.includes('revisao')) return 'matematica';
  return 'matematica';
}

/**
 * Verifica se um conteúdo/atividade de determinada disciplina pertence a uma aba dos Cadernos de Estudo.
 */
export function doesSubjectMatchStudyTab(subject = '', tabId = '') {
  const normalizedTab = tabId === 'humanas' ? 'filosofia_sociologia' : tabId;
  return getStudyHubTabForSubject(subject) === normalizedTab;
}
