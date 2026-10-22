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
