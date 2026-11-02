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

