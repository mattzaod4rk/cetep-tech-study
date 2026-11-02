// Testes sem dependências extras: rodam com `npm test` (node --test).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// localStorage mínimo para o adapter (que é a única camada que o acessa)
function installLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: k => { store.delete(k); },
    clear: () => store.clear(),
  };
}
installLocalStorage();

const DS = await import('../src/services/LocalStorageAdapter.js');
const { toLocalISODate, parseLocalDate, todayISO, SHORT_WEEKDAYS } = await import('../src/utils/dates.js');

const USER = 'user-1';
beforeEach(() => localStorage.clear());

const newTask = (title = 'Tarefa') =>
  DS.createTask(USER, { title, priority: 'medium', subtasks: [] });
const points = () => DS.getGamification(USER).points;

// ── BUG 1: datas / dia da semana ─────────────────────────────────────────────
test('toLocalISODate usa o dia local (não UTC)', () => {
  // 21/10/2026 23:30 local: em UTC-3 o toISOString() já viraria 22/10
  const lateNight = new Date(2026, 9, 21, 23, 30);
  assert.equal(toLocalISODate(lateNight), '2026-10-21');
});

test('parseLocalDate devolve o dia da semana correto (21/10/2026 é quarta)', () => {
  assert.equal(parseLocalDate('2026-10-21').getDay(), 3);
  assert.equal(SHORT_WEEKDAYS[parseLocalDate('2026-10-21').getDay()], 'Qua');
});

test('todayISO coincide com a data local atual', () => {
  assert.equal(todayISO(), toLocalISODate(new Date()));
});

test('getWeeklyStats: 7 dias locais consecutivos, último = hoje, com label correto', () => {
  const stats = DS.getWeeklyStats(USER);
  assert.equal(stats.days.length, 7);
  assert.equal(stats.days[6], todayISO());
  const todayWeekday = new Date().getDay();
  assert.equal(parseLocalDate(stats.days[6]).getDay(), todayWeekday);
  // dias consecutivos
  for (let i = 1; i < 7; i++) {
    const diff = (parseLocalDate(stats.days[i]) - parseLocalDate(stats.days[i - 1])) / 86400000;
    assert.equal(Math.round(diff), 1);
  }
});

test('getWeeklyStats: sessão de hoje cai no último dia', () => {
  DS.saveFocusSession(USER, { durationMinutes: 25, plannedMinutes: 25, completed: true });
  const stats = DS.getWeeklyStats(USER);
  assert.equal(stats.dailyMinutes[6], 25);
  assert.equal(stats.totalMinutesThisWeek, 25);
});

// ── BUG 2: XP duplicado ──────────────────────────────────────────────────────
test('concluir a tarefa concede +10 (+20 de conquista) uma única vez', () => {
  const t = newTask();
  const r = DS.completeTaskWithReward(USER, t.id);
  assert.equal(r.awarded, true);
  assert.equal(points(), 10 + 20); // 10 da tarefa + bônus "Primeira Tarefa"
});

test('cliques repetidos (mesma tarefa) não geram XP extra', () => {
  const t = newTask();
  DS.completeTaskWithReward(USER, t.id);
  const after = points();
  for (let i = 0; i < 20; i++) {
    const r = DS.completeTaskWithReward(USER, t.id);
    assert.equal(r.awarded, false);
  }
  assert.equal(points(), after);
});

test('ciclo concluir → reabrir → concluir não gera XP extra', () => {
  const t = newTask();
  DS.completeTaskWithReward(USER, t.id);
  const after = points();
  for (let i = 0; i < 5; i++) {
    DS.reopenTask(USER, t.id);
    const r = DS.completeTaskWithReward(USER, t.id);
    assert.equal(r.awarded, false);
  }
  assert.equal(points(), after);
  assert.equal(DS.getTasks(USER)[0].status, 'completed');
});

test('a proteção persiste no localStorage (simula recarregar a página)', () => {
  const t = newTask();
  DS.completeTaskWithReward(USER, t.id);
  const after = points();
  // "reload": a flag vem do localStorage, não de estado em memória
  const persisted = JSON.parse(localStorage.getItem('cetep_tasks'))[USER][0];
  assert.equal(persisted.xpAwarded, true);
  DS.reopenTask(USER, t.id);
  DS.completeTaskWithReward(USER, t.id);
  assert.equal(points(), after);
});

test('tarefas diferentes continuam pagando XP normalmente', () => {
  const a = newTask('A');
  const b = newTask('B');
  const c = newTask('C');
  DS.completeTaskWithReward(USER, a.id); // 10 + 20 (bônus)
  DS.completeTaskWithReward(USER, b.id); // +10
  DS.completeTaskWithReward(USER, c.id); // +10
  assert.equal(points(), 10 + 20 + 10 + 10);
});

test('tarefa legada já concluída (sem flag) é tratada como já paga', () => {
  const t = newTask();
  DS.completeTask(USER, t.id); // caminho antigo: concluída sem flag xpAwarded
  const before = points();
  const r = DS.completeTaskWithReward(USER, t.id);
  assert.equal(r.awarded, false);
  // reabrir uma legada e concluir de novo também não paga
  DS.reopenTask(USER, t.id);
  assert.equal(DS.completeTaskWithReward(USER, t.id).awarded, false);
  assert.equal(points(), before);
});

test('subtarefa: +5 só na primeira conclusão; marcar/desmarcar não farma', () => {
  const t = newTask();
  const withSub = DS.addSubtask(USER, t.id, 'Sub 1');
  const sid = withSub.subtasks[0].id;

  const first = DS.toggleSubtaskWithReward(USER, t.id, sid); // marca
  assert.equal(first.awarded, true);
  assert.equal(points(), 5);

  DS.toggleSubtaskWithReward(USER, t.id, sid); // desmarca
  for (let i = 0; i < 10; i++) {
    DS.toggleSubtaskWithReward(USER, t.id, sid); // marca
    DS.toggleSubtaskWithReward(USER, t.id, sid); // desmarca
  }
  const again = DS.toggleSubtaskWithReward(USER, t.id, sid); // marca de novo
  assert.equal(again.completed, true);
  assert.equal(again.awarded, false);
  assert.equal(points(), 5);
});

test('subtarefas diferentes pagam +5 cada', () => {
  const t = newTask();
  DS.addSubtask(USER, t.id, 'S1');
  const withSubs = DS.addSubtask(USER, t.id, 'S2');
  const [s1, s2] = withSubs.subtasks;
  DS.toggleSubtaskWithReward(USER, t.id, s1.id);
  DS.toggleSubtaskWithReward(USER, t.id, s2.id);
  assert.equal(points(), 10);
});

test('editar a tarefa (updateTask) preserva a flag de XP das subtarefas', () => {
  const t = newTask();
  const withSub = DS.addSubtask(USER, t.id, 'S1');
  const sid = withSub.subtasks[0].id;
  DS.toggleSubtaskWithReward(USER, t.id, sid);
  const current = DS.getTasks(USER)[0];
  // o TaskModal reenvia o array de subtarefas existente ao editar
  DS.updateTask(USER, t.id, { title: 'Novo título', subtasks: current.subtasks });
  DS.toggleSubtaskWithReward(USER, t.id, sid); // desmarca
  const r = DS.toggleSubtaskWithReward(USER, t.id, sid); // marca
  assert.equal(r.awarded, false);
  assert.equal(points(), 5);
});

// ── PASSO 1: Anti-Farm de XP no Modo Foco ────────────────────────────────────
test('Modo Foco: sessão encerrada antes de 5 minutos (300s) não salva nem dá XP', () => {
  const res = DS.saveFocusSessionWithReward(USER, {
    sessionId: 'sess-curta-1',
    elapsedSeconds: 12, // 12 segundos (tentativa de farm)
    plannedMinutes: 25,
    completed: false,
    subject: 'Matemática e suas Tecnologias',
  });
  assert.equal(res.saved, false);
  assert.equal(res.awarded, false);
  assert.equal(res.reason, 'too_short');
  assert.equal(points(), 0);
  assert.equal(DS.getFocusSessions(USER).length, 0);
});

test('Modo Foco: sessão parcial válida (>= 5 min) concede +5 XP (+25 conquista 1º foco) e impede duplicata por sessionId', () => {
  const res1 = DS.saveFocusSessionWithReward(USER, {
    sessionId: 'sess-parcial-1',
    elapsedSeconds: 360, // 6 minutos
    plannedMinutes: 25,
    completed: false,
    subject: 'Lógica de Programação',
  });
  assert.equal(res1.saved, true);
  assert.equal(res1.awarded, true);
  assert.equal(res1.points, 5);
  assert.equal(points(), 5 + 25); // 5 parcial + 25 conquista first_focus

  // Cliques repetidos com mesmo sessionId não geram XP extra
  const dup = DS.saveFocusSessionWithReward(USER, {
    sessionId: 'sess-parcial-1',
    elapsedSeconds: 360,
    plannedMinutes: 25,
    completed: false,
  });
  assert.equal(dup.saved, false);
  assert.equal(dup.awarded, false);
  assert.equal(dup.reason, 'duplicate');
  assert.equal(points(), 30);
});

// ── PASSO 2: Sequência Diária (Streak Duolingo) e Escudo de Sequência ────────
test('Streak: 3 dias consecutivos incrementam ofensiva e Escudo de Sequência protege 1 dia perdido', () => {
  const day1 = new Date(2026, 9, 10, 14, 0); // 10/10/2026
  const day2 = new Date(2026, 9, 11, 14, 0); // 11/10/2026
  const day3 = new Date(2026, 9, 12, 14, 0); // 12/10/2026

  DS.addPoints(USER, 10, 'task', day1);
  assert.equal(DS.getGamification(USER, day1).streakDays, 1);

  DS.addPoints(USER, 10, 'task', day2);
  assert.equal(DS.getGamification(USER, day2).streakDays, 2);

  DS.addPoints(USER, 10, 'task', day3);
  const gDay3 = DS.getGamification(USER, day3);
  assert.equal(gDay3.streakDays, 3);
  assert.equal(gDay3.achievements.includes('streak_3'), true);

  // Pula o dia 13/10/2026 e abre o app em 14/10/2026: Escudo de Sequência (🧊) protege!
  const day5 = new Date(2026, 9, 14, 14, 0);
  const gAfterOneMissedDay = DS.getGamification(USER, day5);
  assert.equal(gAfterOneMissedDay.streakStatus, 'shield_protected');
  assert.equal(gAfterOneMissedDay.streakDays, 3);
  assert.equal(gAfterOneMissedDay.shieldUsedDates.includes('2026-10-13'), true);

  // Se ficar muitos dias sem entrar (ex: 20/10/2026), a sequência zera
  const dayFar = new Date(2026, 9, 20, 14, 0);
  const gReset = DS.getGamification(USER, dayFar);
  assert.equal(gReset.streakDays, 0);
  assert.equal(gReset.bestStreak, 3); // Recorde preservado
});

// ── PASSO 3 & 4: Planejamento Semanal CETEP e Exercícios Guiados Anti-Farm ───
test('Planejamento Semanal CETEP e Exercícios Guiados (+10 XP único por exercício)', () => {
  const plan = DS.getWeeklyPlan(USER);
  assert.equal(Array.isArray(plan[1].subjects), true);
  assert.equal(plan[1].subjects.includes('Matemática e suas Tecnologias'), true);

  const r1 = DS.completeStudyExerciseWithReward(USER, 'ex-mat-1', 10);
  assert.equal(r1.awarded, true);
  assert.equal(r1.points, 10);
  assert.equal(points(), 10 + 20); // +10 exercício + 20 conquista first_math

  // Refazer o mesmo exercício não farma XP
  const r2 = DS.completeStudyExerciseWithReward(USER, 'ex-mat-1', 10);
  assert.equal(r2.awarded, false);
  assert.equal(r2.points, 0);
  assert.equal(points(), 30);
});

// ── PASSO 5: Segurança, Isolamento por UID, Anti-Escalação e Migração Beta ──
test('Isolamento por UID: estudante A nunca acessa nem modifica dados do estudante B', () => {
  const uidA = 'firebase-uid-aluno-a';
  const uidB = 'firebase-uid-aluno-b';

  DS.createTask(uidA, { title: 'Tarefa Secreta A', deadline: '2026-11-10', priority: 'high' });
  DS.createAgendaEvent(uidA, { title: 'Prova de Redes A', date: '2026-11-12', type: 'Prova' });
  DS.addPoints(uidA, 50, 'task');

  assert.equal(DS.getTasks(uidA).length, 1);
  assert.equal(DS.getTasks(uidB).length, 0);
  assert.equal(DS.getAgendaEvents(uidB).length, 0);
  assert.equal(DS.getGamification(uidB).points, 0);
});

test('Anti-escalação de privilégio: cadastro público e edição de perfil não concedem role professor', async () => {
  const created = await DS.register({
    name: 'Tentativa Admin',
    email: 'tentativa@escola.ba.gov.br',
    password: '123456',
    role: 'professor', // tentativa maliciosa no cliente
  });
  assert.equal(created.role, 'aluno');

  const updated = await DS.updateUserProfile(created.id, {
    name: 'Nome Atualizado',
    role: 'professor', // tentativa maliciosa de escalar role no update
  });
  assert.equal(updated.role, 'aluno');
});

test('Migração Beta -> Firebase: importa sem senhas antigas, impede duplicatas e exige confirmação antes de apagar', async () => {
  // Simula conta criada na versão antiga em localStorage
  const legacyUser = await DS.register({
    name: 'Estudante Beta',
    email: 'beta@cetep.ba.gov.br',
    password: 'senhaAntiga123',
  });
  const t1 = DS.createTask(legacyUser.id, { title: ' Lista de Frações', priority: 'high' });
  DS.createAgendaEvent(legacyUser.id, { title: 'Mostra Científica AEE', date: '2026-11-05' });
  DS.completeTaskWithReward(legacyUser.id, t1.id);

  // Nova conta autenticada via Firebase UID
  const firebaseUid = 'firebase-uid-novo-123';
  DS.setSessionUser({ uid: firebaseUid, name: 'Estudante Beta', email: 'beta@cetep.ba.gov.br', role: 'aluno' });

  const detected = DS.getLegacyLocalAccounts(firebaseUid);
  assert.equal(detected.length, 1);
  assert.equal(detected[0].id, legacyUser.id);
  assert.equal('password' in detected[0], false); // Senha antiga NUNCA exposta

  // Tentar apagar dados locais antes de migrar deve falhar por segurança
  assert.throws(() => DS.confirmAndClearLegacyAccount(legacyUser.id, firebaseUid));

  // 1ª Migração
  const mig1 = await DS.migrateLegacyAccountToFirebase(legacyUser.id, firebaseUid);
  assert.equal(mig1.tasksAdded, 1);
  assert.equal(mig1.agendaAdded, 1);
  assert.equal(DS.getTasks(firebaseUid).length, 1);
  assert.equal(DS.getGamification(firebaseUid).points, 30);

  // 2ª Migração repetida (idempotência: não duplica tarefas, eventos nem XP)
  const mig2 = await DS.migrateLegacyAccountToFirebase(legacyUser.id, firebaseUid);
  assert.equal(mig2.tasksAdded, 0);
  assert.equal(mig2.agendaAdded, 0);
  assert.equal(DS.getTasks(firebaseUid).length, 1);
  assert.equal(DS.getGamification(firebaseUid).points, 30);

  // Dados locais antigos continuam intactos até confirmação explícita
  assert.equal(DS.getTasks(legacyUser.id).length, 1);

  // Confirma e limpa dados locais antigos
  DS.confirmAndClearLegacyAccount(legacyUser.id, firebaseUid);
  assert.equal(DS.getTasks(legacyUser.id).length, 0);
  assert.equal(DS.getLegacyLocalAccounts(firebaseUid).length, 0);
});

// ── PASSO 6: RBAC (Aluno, Professor, Admin) e Painel Docente Real ────────────
const TS = await import('../src/services/TeacherService.js');
const { executeSecureClassStudentOperation } = await import('../api/class-students.js');

test('RBAC: Aluno é bloqueado em todas as operações docentes, administrativas e de matrícula', async () => {
  const studentUser = { uid: 'uid-aluno-1', name: 'Aluno CETEP', email: 'aluno@cetep.ba.gov.br', role: 'aluno' };

  await assert.rejects(() => TS.getAuthorizedClasses(studentUser), /Acesso negado/);
  await assert.rejects(() => TS.createClass(studentUser, { name: 'Turma Pirata' }), /Acesso negado/);
  await assert.rejects(() => TS.getAllRegisteredUsers(studentUser), /Acesso negado/);
  await assert.rejects(() => TS.updateUserRoleByAdmin(studentUser, 'uid-aluno-1', 'admin'), /Acesso negado/);
  await assert.rejects(() => TS.createTeacherInviteByAdmin(studentUser, { targetEmail: 'x@y.com' }), /Acesso negado/);
  await assert.rejects(() => TS.searchStudentsForClass(studentUser, 'turma-1', 'ana'), /Acesso negado/);
  await assert.rejects(() => TS.addStudentsToClass(studentUser, 'turma-1', ['uid-aluno-1']), /Acesso negado/);
});

test('RBAC: Admin gerencia turmas, promove professor, gera convites com hash e Professor acessa apenas suas turmas atribuídas', async () => {
  const adminUser = { uid: 'uid-admin-1', name: 'Coordenador Admin', email: 'admin@cetep.ba.gov.br', role: 'admin' };
  const profA = { uid: 'uid-prof-a', name: 'Prof. Informática', email: 'profa@cetep.ba.gov.br', role: 'professor' };
  const profB = { uid: 'uid-prof-b', name: 'Prof. Matemática', email: 'profb@cetep.ba.gov.br', role: 'professor' };
  const profSemTurma = { uid: 'uid-prof-sem-turma', name: 'Prof. Novo', email: 'profnovo@cetep.ba.gov.br', role: 'professor' };
  const student1 = await DS.register({ name: 'Estudante Turma A', email: 'est1@cetep.ba.gov.br', password: '123' });

  // Admin cria duas turmas: uma atribuída ao Prof A e outra ao Prof B
  const classA = await TS.createClass(adminUser, {
    name: '3º Ano Informática M1',
    course: 'Técnico em Informática',
    shift: 'Matutino',
    subjects: ['Banco de Dados', 'Engenharia de Software'],
    teacherIds: [profA.uid],
    studentIds: [student1.id],
  });

  const classB = await TS.createClass(adminUser, {
    name: '1º Ano Informática V1',
    course: 'Técnico em Informática',
    shift: 'Vespertino',
    subjects: ['Matemática e suas Tecnologias'],
    teacherIds: [profB.uid],
    studentIds: [],
  });

  // 1) Professor sem turma atribuída recebe lista vazia []
  const emptyClasses = await TS.getAuthorizedClasses(profSemTurma);
  assert.equal(emptyClasses.length, 0);

  // 2) Professor com turma atribuída visualiza SOMENTE a sua turma (Turma A)
  const profAClasses = await TS.getAuthorizedClasses(profA);
  assert.equal(profAClasses.length, 1);
  assert.equal(profAClasses[0].id, classA.id);

  // Admin visualiza todas as turmas (2)
  const adminClasses = await TS.getAuthorizedClasses(adminUser);
  assert.equal(adminClasses.length, 2);

  // Prof A NÃO tem acesso irrestrito à coleção completa de usuários (/users)
  await assert.rejects(
    () => TS.getAllRegisteredUsers(profA),
    /exclusiva de administradores/
  );

  // Prof A consegue publicar conteúdos, atividades e comunicados na SUA turma (classA)
  const content = await TS.createClassContent(profA, classA, {
    title: 'Modelagem Entidade-Relacionamento',
    subject: 'Banco de Dados',
    description: 'Conceitos de cardinalidade e chaves estrangeiras.',
  });
  assert.equal(content.title, 'Modelagem Entidade-Relacionamento');

  const activity = await TS.createClassActivity(profA, classA, {
    title: 'Projeto Prático SQL',
    subject: 'Banco de Dados',
    dueDate: '2026-11-20',
    points: 10,
  });
  assert.equal(activity.title, 'Projeto Prático SQL');

  const announcement = await TS.createClassAnnouncement(profA, classA, {
    title: 'Aviso de Laboratório',
    message: 'Aula prática no Lab 2 amanhã.',
    priority: 'important',
  });
  assert.equal(announcement.priority, 'important');

  // Prof A é BLOQUEADO ao tentar publicar ou editar a turma do Prof B (classB)
  await assert.rejects(
    () => TS.createClassContent(profA, classB, { title: 'Invasão', subject: 'Matemática' }),
    /não possui autorização para administrar esta turma/
  );
  await assert.rejects(
    () => TS.updateClass(profA, classB.id, { name: 'Turma Alterada' }),
    /não possui autorização para administrar esta turma/
  );

  // Prof A NÃO consegue alterar a lista de docentes da própria turma
  await assert.rejects(
    () => TS.updateClass(profA, classA.id, { teacherIds: [profA.uid, profB.uid] }),
    /professores não podem alterar a lista de docentes/
  );

  // Prof A NÃO consegue alterar permissões de usuários nem criar novas turmas
  await assert.rejects(
    () => TS.updateUserRoleByAdmin(profA, student1.id, 'professor'),
    /exclusiva de administradores/
  );
  await assert.rejects(
    () => TS.createClass(profA, { name: 'Turma Sem Autorização' }),
    /exclusiva de administradores/
  );

  // Admin promove estudante a professor com sucesso
  const promoted = await TS.updateUserRoleByAdmin(adminUser, student1.id, 'professor');
  assert.equal(promoted.role, 'professor');

  // Convite docente de uso único armazena apenas hash SHA-256 (nunca o código em texto puro no documento)
  const { invite, plainCode } = await TS.createTeacherInviteByAdmin(adminUser, {
    targetEmail: 'novoprof@cetep.ba.gov.br',
    assignedClassIds: [classA.id],
    expiresInDays: 7,
  });
  assert.equal(typeof plainCode, 'string');
  assert.equal(typeof invite.codeHash, 'string');
  assert.notEqual(plainCode, invite.codeHash);
  assert.equal(invite.codeHash.length, 64); // SHA-256 hex
  assert.equal('plainCode' in invite, false);
});

test('Fluxo de Gerenciamento de Estudantes na Turma (Busca Segura, Matrícula, Anti-Duplicidade, Auditoria e Bloqueios)', async () => {
  const adminUser = { uid: 'uid-admin-1', name: 'Coordenador Admin', email: 'admin@cetep.ba.gov.br', role: 'admin' };
  const profA = { uid: 'uid-prof-a', name: 'Prof. Informática', email: 'profa@cetep.ba.gov.br', role: 'professor' };
  const profB = { uid: 'uid-prof-b', name: 'Prof. Redes', email: 'profb@cetep.ba.gov.br', role: 'professor' };

  // Cria estudantes e também um usuário que será promovido a professor
  const ana = await DS.register({ name: 'Ana Beatriz Silva', email: 'ana.silva@enova.educacao.ba.gov.br', password: '123' });
  const carlos = await DS.register({ name: 'Carlos Eduardo Souza', email: 'carlos.souza@gmail.com', password: '123' });
  const docenteConta = await DS.register({ name: 'Docente Cadastrado', email: 'docente@cetep.ba.gov.br', password: '123' });
  await TS.updateUserRoleByAdmin(adminUser, docenteConta.id, 'professor');

  // Adiciona dados pessoais/acessibilidade e tarefas na conta de Ana (que NÃO devem vazar na busca!)
  await DS.updateUserProfile(ana.id, { preferences: { theme: 'high-contrast', fontSize: 'xl', dyslexiaMode: true } });
  DS.createTask(ana.id, { title: 'Tarefa Confidencial de Ana', priority: 'high' });

  const classA = await TS.createClass(adminUser, {
    name: '2º INFO M1',
    course: 'Técnico em Informática',
    shift: 'Manhã',
    teacherIds: [profA.uid],
    studentIds: [],
  });

  const classB = await TS.createClass(adminUser, {
    name: '3º INFO V1',
    course: 'Técnico em Informática',
    shift: 'Tarde',
    teacherIds: [profB.uid],
    studentIds: [],
  });

  // 3) Pesquisa de estudantes cadastrados por nome ou e-mail:
  //    - Retorna SOMENTE contas com perfil 'aluno' (nunca retorna docenteConta)
  //    - Retorna APENAS { uid, name, email, alreadyEnrolled } (sem expor preferências AEE nem tarefas)
  const searchAll = await TS.searchStudentsForClass(profA, classA.id, '');
  assert.equal(searchAll.length, 2);
  assert.equal(searchAll.some(s => s.uid === docenteConta.id), false);

  const searchAna = await TS.searchStudentsForClass(profA, classA.id, 'ana.silva');
  assert.equal(searchAna.length, 1);
  assert.deepEqual(Object.keys(searchAna[0]).sort(), ['alreadyEnrolled', 'email', 'name', 'uid']);
  assert.equal(searchAna[0].uid, ana.id);
  assert.equal(searchAna[0].alreadyEnrolled, false);
  assert.equal('preferences' in searchAna[0], false);
  assert.equal('tasks' in searchAna[0], false);

  // 4) Adição de estudante à turma atribuída + registro de autoria no log de auditoria
  const enrollRes = await TS.addStudentsToClass(profA, classA.id, [ana.id]);
  assert.equal(enrollRes.ok, true);
  assert.deepEqual(enrollRes.addedStudentIds, [ana.id]);
  assert.equal(enrollRes.auditLog.actorUid, profA.uid);
  assert.equal(enrollRes.auditLog.action, 'ADD_STUDENTS');

  const logsAfterAdd = await TS.getClassAuditLogs(profA, classA.id);
  assert.equal(logsAfterAdd.length, 1);
  assert.equal(logsAfterAdd[0].actorUid, profA.uid);
  assert.equal(logsAfterAdd[0].addedStudents[0].email, 'ana.silva@enova.educacao.ba.gov.br');

  // Na próxima busca, Ana aparece marcada como alreadyEnrolled = true
  const searchAfterEnroll = await TS.searchStudentsForClass(profA, classA.id, 'Beatriz');
  assert.equal(searchAfterEnroll[0].alreadyEnrolled, true);

  // 5) Tentativa de adicionar o mesmo estudante duas vezes -> bloqueado!
  await assert.rejects(
    () => TS.addStudentsToClass(profA, classA.id, [ana.id]),
    /já está matriculado nesta turma/
  );

  // 6) Tentativa de professor adicionar ou pesquisar alunos em uma turma NÃO autorizada (classB) -> bloqueado!
  await assert.rejects(
    () => TS.searchStudentsForClass(profA, classB.id, 'carlos'),
    /não possui autorização para administrar esta turma/
  );
  await assert.rejects(
    () => TS.addStudentsToClass(profA, classB.id, [carlos.id]),
    /não possui autorização para administrar esta turma/
  );

  // 7) Acesso por aluno tentando utilizar o núcleo do endpoint seguro (api/class-students.js) -> bloqueado (403)!
  const mockAdapter = {
    getUserById: async (uid) => (uid === ana.id ? { uid: ana.id, name: ana.name, email: ana.email, role: 'aluno' } : null),
    getClassById: async () => classA,
    listStudentAccountsOnly: async () => [],
  };
  await assert.rejects(
    () =>
      executeSecureClassStudentOperation(
        { caller: { uid: ana.id, claimRole: 'aluno' }, action: 'search', classId: classA.id, query: '' },
        mockAdapter
      ),
    /apenas professores autorizados e administradores/
  );
  await assert.rejects(
    () =>
      executeSecureClassStudentOperation(
        { caller: { uid: ana.id, claimRole: 'aluno' }, action: 'enroll', classId: classA.id, studentIds: [carlos.id] },
        mockAdapter
      ),
    /apenas professores autorizados e administradores/
  );
});


