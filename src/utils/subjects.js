/**
 * Matriz Curricular Oficial — CETEP Recôncavo II Alberto Torres (Cruz das Almas - BA)
 * Baseada na LDB (Art. 35 / BNCC Ensino Médio) e no Catálogo SUPROT / SEC-BA
 * para o Curso Técnico em Informática (Eixo Informação e Comunicação).
 */

export const SUBJECT_GROUPS = [
  {
    id: 'fgb_ldb',
    label: 'Formação Geral Básica (Ensino Médio — LDB / BNCC)',
    shortLabel: 'Ensino Médio (LDB)',
    subjects: [
      'Matemática e suas Tecnologias',
      'Português / Redação e Linguagens',
      'Física',
      'Química',
      'Biologia',
      'História',
      'Geografia',
      'Filosofia e Sociologia',
      'Inglês Técnico / Língua Estrangeira',
    ],
  },
  {
    id: 'tec_suprot',
    label: 'Formação Técnica em Informática (SUPROT / SEC-BA)',
    shortLabel: 'Técnico em Informática (CETEP)',
    subjects: [
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
 * Sugestão padrão de Planejamento Semanal equilibrado para o estudante
 * do Técnico em Informática integrado ao Ensino Médio no CETEP Alberto Torres.
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
    subjects: ['Matemática e suas Tecnologias', 'Banco de Dados'],
    goalMinutes: 30,
    note: 'Equações, gráficos e modelagem de tabelas',
  },
  4: {
    subjects: ['Redes de Computadores', 'Física'],
    goalMinutes: 25,
    note: 'Taxa de transferência (Mbps/MBs) e grandezas físicas',
  },
  5: {
    subjects: ['Desenvolvimento Web', 'História'],
    goalMinutes: 25,
    note: 'Proporções CSS/layout e revisão de humanas',
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
 * Verifica se uma matéria tem trilha interativa direta na Área de Estudos (/math)
 */
export function getStudyHubTabForSubject(subject = '') {
  const s = subject.toLowerCase();
  if (s.includes('matemática') || s.includes('revisão')) return 'matematica';
  if (
    s.includes('programação') ||
    s.includes('arquitetura') ||
    s.includes('manutenção') ||
    s.includes('redes') ||
    s.includes('banco de dados') ||
    s.includes('web') ||
    s.includes('sistemas') ||
    s.includes('informática')
  ) {
    return 'informatica';
  }
  if (s.includes('física')) return 'fisica';
  if (s.includes('história') || s.includes('geografia') || s.includes('filosofia') || s.includes('sociologia')) {
    return 'humanas';
  }
  if (s.includes('português') || s.includes('redação') || s.includes('inglês')) {
    return 'linguagens';
  }
  if (s.includes('química') || s.includes('biologia')) {
    return 'natureza';
  }
  return 'matematica';
}
