/**
 * LocalStorageAdapter — Implementação da camada de dados do CETEP Tech Study
 * com isolamento estrito por UID do Firebase + sincronização em tempo real com Cloud Firestore
 * + migração segura e idempotente de contas legadas do localStorage.
 */

import { hashPassword, verifyPassword } from './crypto.js';
import { toLocalISODate, getDayShortName } from '../utils/dates.js';
import { DEFAULT_WEEKLY_PLAN } from '../utils/subjects.js';
import {
  syncTaskToFirestore,
  deleteTaskFromFirestore,
  syncAgendaEventToFirestore,
  deleteAgendaEventFromFirestore,
  syncFocusSessionToFirestore,
  syncAppDataToFirestore,
  pushFullUserStateToFirestore,
  subscribeToUserFirestore,
} from './FirestoreSyncService.js';

const TASK_XP = 10;
const SUBTASK_XP = 5;
export const MIN_FOCUS_SECONDS = 300; // 5 minutos mínimos para validar sessão antecipada
const FOCUS_PARTIAL_XP = 5;
const FOCUS_COMPLETE_XP = 15;
const FOCUS_DEEP_XP = 20; // Sessões completas de >= 25 min
const STUDY_EXERCISE_XP = 10;
const MAX_STREAK_SHIELDS = 2;

const KEYS = {
  USERS: 'cetep_users',
  SESSION: 'cetep_session',
  TASKS: 'cetep_tasks',
  AGENDA: 'cetep_agenda',
  FOCUS_SESSIONS: 'cetep_focus_sessions',
  GAMIFICATION: 'cetep_gamification',
  SETTINGS: 'cetep_settings',
  WEEKLY_PLAN: 'cetep_weekly_plan',
  STUDY_PROGRESS: 'cetep_study_progress',
  MIGRATIONS_LOG: 'cetep_migrations_log',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emitCloudSyncEvent(userId, section) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('cetep:cloud-sync', { detail: { userId, section } }));
  }
}

/**
 * Converte qualquer string de data (incluindo formato legado `toDateString()`)
 * para `YYYY-MM-DD` no fuso local.
 */
function normalizeISODateString(dateStr) {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  return toLocalISODate(parsed);
}

/**
 * Calcula a diferença em dias corridos entre duas datas `YYYY-MM-DD` (isoB - isoA).
 */
function diffCalendarDays(isoA, isoB) {
  if (!isoA || !isoB) return null;
  const [yA, mA, dA] = isoA.split('-').map(Number);
  const [yB, mB, dB] = isoB.split('-').map(Number);
  const utcA = Date.UTC(yA, mA - 1, dA);
  const utcB = Date.UTC(yB, mB - 1, dB);
  return Math.round((utcB - utcA) / (1000 * 60 * 60 * 24));
}

function shiftISODate(isoDate, deltaDays) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return toLocalISODate(dt);
}

// ─── Auth (Modo Local / Fallback e Sessão Isolada por UID) ────────────────────
/**
 * SEGURANÇA: Cadastro público NUNCA pode conceder privilégios de `professor` ou `admin`.
 * Qualquer tentativa de passar `role: 'professor'` no registro público é forçada para `'aluno'`.
 */
export async function register({ name, email, password }) {
  const users = load(KEYS.USERS, []);
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Este e-mail já está cadastrado.');
  }
  const hashedPassword = await hashPassword(password);
  const user = {
    id: generateId(),
    name: (name || '').trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    role: 'aluno', // Forçado para 'aluno' por segurança contra escalação de privilégio
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  save(KEYS.USERS, users);

  initUserData(user.id);

  const sessionUser = { id: user.id, uid: user.id, name: user.name, email: user.email, role: user.role };
  save(KEYS.SESSION, sessionUser);
  return sessionUser;
}

export async function login({ email, password }) {
  const users = load(KEYS.USERS, []);
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error('E-mail ou senha incorretos.');
  const valid = await verifyPassword(password, user.password);
  if (!valid) throw new Error('E-mail ou senha incorretos.');
  const sessionUser = { id: user.id, uid: user.id, name: user.name, email: user.email, role: user.role || 'aluno' };
  save(KEYS.SESSION, sessionUser);
  return sessionUser;
}

export function setSessionUser(sessionUser) {
  if (!sessionUser) {
    localStorage.removeItem(KEYS.SESSION);
    return null;
  }
  const normalized = {
    ...sessionUser,
    id: sessionUser.uid || sessionUser.id,
    uid: sessionUser.uid || sessionUser.id,
    role: sessionUser.role || 'aluno',
  };
  initUserData(normalized.id);
  save(KEYS.SESSION, normalized);
  return normalized;
}

export function logout() {
  localStorage.removeItem(KEYS.SESSION);
}

export function getSession() {
  return load(KEYS.SESSION, null);
}

export async function updateUserProfile(userId, updates) {
  const users = load(KEYS.USERS, []);
  const idx = users.findIndex(u => u.id === userId);
  // Segurança: impede alteração de `role` via cliente
  const safeUpdates = { ...updates };
  delete safeUpdates.role;

  if (idx !== -1) {
    if (safeUpdates.password) {
      safeUpdates.password = await hashPassword(safeUpdates.password);
    }
    users[idx] = { ...users[idx], ...safeUpdates };
    save(KEYS.USERS, users);
  }

  const sessionUser = getSession();
  if (sessionUser && sessionUser.id === userId) {
    const updated = {
      ...sessionUser,
      name: safeUpdates.name || sessionUser.name,
      email: safeUpdates.email || sessionUser.email,
    };
    save(KEYS.SESSION, updated);
    return updated;
  }
  return sessionUser;
}

// ─── User data initializer ────────────────────────────────────────────────────
export function initUserData(userId) {
  if (!userId) return;
  const gamification = load(KEYS.GAMIFICATION, {});
  if (!gamification[userId]) {
    gamification[userId] = {
      points: 0,
      level: 1,
      achievements: [],
      lastActiveDate: null,
      streakDays: 0,
      bestStreak: 0,
      streakShields: 1, // Começa com 1 Escudo de Sequência (inclusivo para TDAH)
      activeDates: [],
      shieldUsedDates: [],
    };
    save(KEYS.GAMIFICATION, gamification);
  }
  const settings = load(KEYS.SETTINGS, {});
  if (!settings[userId]) {
    settings[userId] = {
      theme: 'light',
      fontSize: 'medium',
      notifications: true,
    };
    save(KEYS.SETTINGS, settings);
  }
}

// ─── Sincronização em Tempo Real com Cloud Firestore ──────────────────────────
export function startRealtimeSyncForUser(userId) {
  if (!userId) return () => {};
  initUserData(userId);

  let initialAppDataChecked = false;

  return subscribeToUserFirestore(userId, {
    onTasksSnapshot: remoteTasks => {
      const all = load(KEYS.TASKS, {});
      const localTasks = all[userId] || [];
      if (remoteTasks.length === 0 && localTasks.length > 0) {
        // Primeira conexão de usuário com dados locais já atribuídos a este UID
        localTasks.forEach(t => syncTaskToFirestore(userId, t));
        return;
      }
      all[userId] = remoteTasks;
      save(KEYS.TASKS, all);
      emitCloudSyncEvent(userId, 'tasks');
    },
    onAgendaSnapshot: remoteEvents => {
      const all = load(KEYS.AGENDA, {});
      const localEvents = all[userId] || [];
      if (remoteEvents.length === 0 && localEvents.length > 0) {
        localEvents.forEach(ev => syncAgendaEventToFirestore(userId, ev));
        return;
      }
      all[userId] = remoteEvents;
      save(KEYS.AGENDA, all);
      emitCloudSyncEvent(userId, 'agenda');
    },
    onFocusSessionsSnapshot: remoteSessions => {
      const all = load(KEYS.FOCUS_SESSIONS, {});
      const localSessions = all[userId] || [];
      if (remoteSessions.length === 0 && localSessions.length > 0) {
        localSessions.forEach(s => syncFocusSessionToFirestore(userId, s));
        return;
      }
      all[userId] = remoteSessions;
      save(KEYS.FOCUS_SESSIONS, all);
      emitCloudSyncEvent(userId, 'focusSessions');
    },
    onAppDataSnapshot: appDataMap => {
      if (appDataMap.gamification) {
        const allG = load(KEYS.GAMIFICATION, {});
        allG[userId] = { ...(allG[userId] || {}), ...appDataMap.gamification };
        save(KEYS.GAMIFICATION, allG);
      } else if (!initialAppDataChecked) {
        syncAppDataToFirestore(userId, 'gamification', getUserGamification(userId));
      }

      if (appDataMap.settings) {
        const allS = load(KEYS.SETTINGS, {});
        allS[userId] = { ...(allS[userId] || {}), ...appDataMap.settings };
        save(KEYS.SETTINGS, allS);
      } else if (!initialAppDataChecked) {
        syncAppDataToFirestore(userId, 'settings', getUserSettings(userId));
      }

      if (appDataMap.weeklyPlan) {
        const allW = load(KEYS.WEEKLY_PLAN, {});
        const { updatedAt: _updatedAt, ...planFields } = appDataMap.weeklyPlan;
        if (Object.keys(planFields).length > 0) {
          allW[userId] = planFields;
          save(KEYS.WEEKLY_PLAN, allW);
        }
      }

      if (appDataMap.studyProgress) {
        const allP = load(KEYS.STUDY_PROGRESS, {});
        allP[userId] = { ...(allP[userId] || {}), ...appDataMap.studyProgress };
        save(KEYS.STUDY_PROGRESS, allP);
      }

      initialAppDataChecked = true;
      emitCloudSyncEvent(userId, 'appdata');
    },
  });
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
function getUserTasks(userId) {
  const all = load(KEYS.TASKS, {});
  return all[userId] || [];
}

function saveUserTasks(userId, tasks) {
  const all = load(KEYS.TASKS, {});
  all[userId] = tasks;
  save(KEYS.TASKS, all);
}

export function getTasks(userId) {
  return getUserTasks(userId);
}

export function createTask(userId, taskData) {
  const tasks = getUserTasks(userId);
  const task = {
    id: generateId(),
    ...taskData,
    subtasks: taskData.subtasks || [],
    status: 'pending',
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  tasks.push(task);
  saveUserTasks(userId, tasks);
  syncTaskToFirestore(userId, task);
  return task;
}

export function updateTask(userId, taskId, updates) {
  const tasks = getUserTasks(userId);
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) throw new Error('Tarefa não encontrada.');
  tasks[idx] = { ...tasks[idx], ...updates };
  saveUserTasks(userId, tasks);
  syncTaskToFirestore(userId, tasks[idx]);
  return tasks[idx];
}

export function deleteTask(userId, taskId) {
  let tasks = getUserTasks(userId);
  tasks = tasks.filter(t => t.id !== taskId);
  saveUserTasks(userId, tasks);
  deleteTaskFromFirestore(userId, taskId);
}

export function completeTask(userId, taskId) {
  const tasks = getUserTasks(userId);
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) throw new Error('Tarefa não encontrada.');
  tasks[idx] = { ...tasks[idx], status: 'completed', completedAt: new Date().toISOString() };
  saveUserTasks(userId, tasks);
  syncTaskToFirestore(userId, tasks[idx]);
  return tasks[idx];
}

/**
 * Conclui a tarefa e concede o XP em UMA operação síncrona sobre o localStorage + sync Firestore.
 * O XP só é concedido na primeira conclusão da tarefa (flag `xpAwarded`), então
 * cliques repetidos, reabrir/concluir de novo ou re-renderizações não geram XP extra.
 * Tarefas já concluídas antes desta correção (sem a flag) são tratadas como já pagas.
 *
 * @returns {{ task: object, awarded: boolean, points: number, newAchievements: object[] }}
 */
export function completeTaskWithReward(userId, taskId) {
  const tasks = getUserTasks(userId);
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) throw new Error('Tarefa não encontrada.');

  const current = tasks[idx];
  const alreadyRewarded = current.xpAwarded === true || current.status === 'completed';

  tasks[idx] = {
    ...current,
    status: 'completed',
    completedAt: current.status === 'completed' && current.completedAt
      ? current.completedAt
      : new Date().toISOString(),
    xpAwarded: true,
  };
  saveUserTasks(userId, tasks);
  syncTaskToFirestore(userId, tasks[idx]);

  if (alreadyRewarded) {
    return { task: tasks[idx], awarded: false, points: 0, newAchievements: [] };
  }
  const result = addPoints(userId, TASK_XP, 'task');
  return { task: tasks[idx], awarded: true, points: TASK_XP, newAchievements: result.newAchievements };
}

export function reopenTask(userId, taskId) {
  const tasks = getUserTasks(userId);
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) throw new Error('Tarefa não encontrada.');
  // Reabrir não devolve nem recobra XP: uma tarefa que já esteve concluída
  // permanece marcada como "já paga" para impedir o ciclo concluir/reabrir.
  const wasRewarded = tasks[idx].xpAwarded === true || tasks[idx].status === 'completed';
  tasks[idx] = { ...tasks[idx], status: 'pending', completedAt: null, xpAwarded: wasRewarded };
  saveUserTasks(userId, tasks);
  syncTaskToFirestore(userId, tasks[idx]);
  return tasks[idx];
}

export function addSubtask(userId, taskId, subtaskTitle) {
  const tasks = getUserTasks(userId);
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) throw new Error('Tarefa não encontrada.');
  const subtask = { id: generateId(), title: subtaskTitle, completed: false };
  tasks[idx].subtasks = [...(tasks[idx].subtasks || []), subtask];
  saveUserTasks(userId, tasks);
  syncTaskToFirestore(userId, tasks[idx]);
  return tasks[idx];
}

export function toggleSubtask(userId, taskId, subtaskId) {
  const tasks = getUserTasks(userId);
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) throw new Error('Tarefa não encontrada.');
  tasks[idx].subtasks = tasks[idx].subtasks.map(s =>
    s.id === subtaskId ? { ...s, completed: !s.completed } : s
  );
  saveUserTasks(userId, tasks);
  syncTaskToFirestore(userId, tasks[idx]);
  return tasks[idx];
}

/**
 * Alterna a subtarefa e concede XP apenas na primeira vez que ela é concluída
 * (flag `xpAwarded` por subtarefa). Desmarcar e marcar de novo não gera XP extra.
 *
 * @returns {{ task: object, completed: boolean, awarded: boolean, points: number, newAchievements: object[] }}
 */
export function toggleSubtaskWithReward(userId, taskId, subtaskId) {
  const tasks = getUserTasks(userId);
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) throw new Error('Tarefa não encontrada.');

  let completed = false;
  let awarded = false;
  tasks[idx].subtasks = (tasks[idx].subtasks || []).map(s => {
    if (s.id !== subtaskId) return s;
    completed = !s.completed;
    // Subtarefa que já estava concluída (inclusive dados antigos sem flag) já foi paga.
    const alreadyRewarded = s.xpAwarded === true || s.completed === true;
    if (completed && !alreadyRewarded) awarded = true;
    return { ...s, completed, xpAwarded: alreadyRewarded || awarded };
  });
  saveUserTasks(userId, tasks);
  syncTaskToFirestore(userId, tasks[idx]);

  if (!awarded) {
    return { task: tasks[idx], completed, awarded: false, points: 0, newAchievements: [] };
  }
  const result = addPoints(userId, SUBTASK_XP, 'subtask');
  return { task: tasks[idx], completed, awarded: true, points: SUBTASK_XP, newAchievements: result.newAchievements };
}

// ─── Agenda ───────────────────────────────────────────────────────────────────
function getUserAgenda(userId) {
  const all = load(KEYS.AGENDA, {});
  return all[userId] || [];
}

function saveUserAgenda(userId, events) {
  const all = load(KEYS.AGENDA, {});
  all[userId] = events;
  save(KEYS.AGENDA, all);
}

export function getAgendaEvents(userId) {
  return getUserAgenda(userId);
}

export function createAgendaEvent(userId, eventData) {
  const events = getUserAgenda(userId);
  const event = {
    id: generateId(),
    ...eventData,
    createdAt: new Date().toISOString(),
  };
  events.push(event);
  saveUserAgenda(userId, events);
  syncAgendaEventToFirestore(userId, event);
  return event;
}

export function updateAgendaEvent(userId, eventId, updates) {
  const events = getUserAgenda(userId);
  const idx = events.findIndex(e => e.id === eventId);
  if (idx === -1) throw new Error('Evento não encontrado.');
  events[idx] = { ...events[idx], ...updates };
  saveUserAgenda(userId, events);
  syncAgendaEventToFirestore(userId, events[idx]);
  return events[idx];
}

export function deleteAgendaEvent(userId, eventId) {
  let events = getUserAgenda(userId);
  events = events.filter(e => e.id !== eventId);
  saveUserAgenda(userId, events);
  deleteAgendaEventFromFirestore(userId, eventId);
}

// ─── Weekly Plan (Planejamento Semanal por Matéria - CETEP) ───────────────────
export function getWeeklyPlan(userId) {
  const all = load(KEYS.WEEKLY_PLAN, {});
  if (!all[userId]) {
    // Clona o preset padrão do CETEP Alberto Torres
    return JSON.parse(JSON.stringify(DEFAULT_WEEKLY_PLAN));
  }
  return all[userId];
}

export function saveWeeklyPlan(userId, plan) {
  const all = load(KEYS.WEEKLY_PLAN, {});
  all[userId] = plan;
  save(KEYS.WEEKLY_PLAN, all);
  syncAppDataToFirestore(userId, 'weeklyPlan', plan);
  return plan;
}

export function resetWeeklyPlan(userId) {
  const all = load(KEYS.WEEKLY_PLAN, {});
  const preset = JSON.parse(JSON.stringify(DEFAULT_WEEKLY_PLAN));
  all[userId] = preset;
  save(KEYS.WEEKLY_PLAN, all);
  syncAppDataToFirestore(userId, 'weeklyPlan', preset);
  return preset;
}

// ─── Focus Sessions & Anti-Farm Protection ────────────────────────────────────
function getUserFocusSessions(userId) {
  const all = load(KEYS.FOCUS_SESSIONS, {});
  return all[userId] || [];
}

function saveUserFocusSessions(userId, sessions) {
  const all = load(KEYS.FOCUS_SESSIONS, {});
  all[userId] = sessions;
  save(KEYS.FOCUS_SESSIONS, all);
}

export function getFocusSessions(userId) {
  return getUserFocusSessions(userId);
}

export function saveFocusSession(userId, sessionData) {
  const sessions = getUserFocusSessions(userId);
  const session = {
    id: sessionData.sessionId || generateId(),
    ...sessionData,
    completedAt: new Date().toISOString(),
  };
  sessions.push(session);
  saveUserFocusSessions(userId, sessions);
  syncFocusSessionToFirestore(userId, session);
  return session;
}

/**
 * Registra uma sessão do Modo Foco com proteção anti-farm de XP:
 * 1. Se a sessão foi interrompida antes de `MIN_FOCUS_SECONDS` (5 min = 300s) e não
 *    concluiu o ciclo, ela é descartada (não gera XP nem polui o histórico).
 * 2. Se o `sessionId` já foi recompensado antes (cliques duplos ou re-render),
 *    ignora a duplicata.
 * 3. Concede XP proporcional ao esforço:
 *    - Finalização antecipada válida (>= 5 min): +5 XP
 *    - Ciclo completo (< 25 min): +15 XP
 *    - Ciclo completo profundo (>= 25 min): +20 XP
 *
 * @returns {{
 *   saved: boolean,
 *   awarded: boolean,
 *   points: number,
 *   reason: 'completed' | 'partial' | 'too_short' | 'duplicate',
 *   session: object | null,
 *   newAchievements: object[]
 * }}
 */
export function saveFocusSessionWithReward(userId, {
  sessionId,
  elapsedSeconds = 0,
  plannedMinutes = 25,
  completed = false,
  subject = 'Geral',
} = {}) {
  const sessions = getUserFocusSessions(userId);

  if (sessionId && sessions.some(s => (s.id === sessionId || s.sessionId === sessionId) && s.xpAwarded)) {
    return {
      saved: false,
      awarded: false,
      points: 0,
      reason: 'duplicate',
      session: null,
      newAchievements: [],
    };
  }

  if (!completed && elapsedSeconds < MIN_FOCUS_SECONDS) {
    return {
      saved: false,
      awarded: false,
      points: 0,
      reason: 'too_short',
      session: null,
      newAchievements: [],
    };
  }

  const durationMinutes = completed
    ? Math.max(1, Number(plannedMinutes) || Math.round(elapsedSeconds / 60))
    : Math.max(1, Math.floor(elapsedSeconds / 60));

  const xpToAward = completed
    ? (durationMinutes >= 25 ? FOCUS_DEEP_XP : FOCUS_COMPLETE_XP)
    : FOCUS_PARTIAL_XP;

  const session = {
    id: sessionId || generateId(),
    sessionId: sessionId || null,
    durationMinutes,
    plannedMinutes: Number(plannedMinutes) || durationMinutes,
    elapsedSeconds: Number(elapsedSeconds) || durationMinutes * 60,
    completed: Boolean(completed),
    subject: subject || 'Geral',
    xpAwarded: true,
    pointsEarned: xpToAward,
    completedAt: new Date().toISOString(),
  };

  sessions.push(session);
  saveUserFocusSessions(userId, sessions);
  syncFocusSessionToFirestore(userId, session);

  const rewardResult = addPoints(userId, xpToAward, 'focus');
  return {
    saved: true,
    awarded: true,
    points: xpToAward,
    reason: completed ? 'completed' : 'partial',
    session,
    newAchievements: rewardResult.newAchievements,
  };
}

// ─── Study Hub Progress (Matemática & Informática) ────────────────────────────
function getUserStudyProgress(userId) {
  const all = load(KEYS.STUDY_PROGRESS, {});
  if (!all[userId]) {
    all[userId] = {
      completedExercises: [],
      lastVisitedTab: 'matematica',
    };
    save(KEYS.STUDY_PROGRESS, all);
  }
  return all[userId];
}

function saveUserStudyProgress(userId, progress) {
  const all = load(KEYS.STUDY_PROGRESS, {});
  all[userId] = progress;
  save(KEYS.STUDY_PROGRESS, all);
  syncAppDataToFirestore(userId, 'studyProgress', progress);
}

export function getStudyProgress(userId) {
  return getUserStudyProgress(userId);
}

/**
 * Conclui um exercício guiado na Área de Estudos e concede XP uma única vez por exercício.
 */
export function completeStudyExerciseWithReward(userId, exerciseId, customPoints = STUDY_EXERCISE_XP) {
  if (!exerciseId) throw new Error('ID do exercício é obrigatório.');
  const progress = getUserStudyProgress(userId);
  const completedList = progress.completedExercises || [];

  if (completedList.includes(exerciseId)) {
    return {
      progress,
      awarded: false,
      points: 0,
      newAchievements: [],
    };
  }

  progress.completedExercises = [...completedList, exerciseId];
  saveUserStudyProgress(userId, progress);

  const pts = Number(customPoints) || STUDY_EXERCISE_XP;
  const result = addPoints(userId, pts, 'study_exercise');
  return {
    progress,
    awarded: true,
    points: pts,
    newAchievements: result.newAchievements,
  };
}

// ─── Gamification & Duolingo-style Streak ─────────────────────────────────────
function getUserGamification(userId) {
  const all = load(KEYS.GAMIFICATION, {});
  if (!all[userId]) {
    all[userId] = {
      points: 0,
      level: 1,
      achievements: [],
      lastActiveDate: null,
      streakDays: 0,
      bestStreak: 0,
      streakShields: 1,
      activeDates: [],
      shieldUsedDates: [],
    };
    save(KEYS.GAMIFICATION, all);
  }
  const data = all[userId];
  // Migração suave de campos novos
  if (typeof data.bestStreak !== 'number') data.bestStreak = data.streakDays || 0;
  if (typeof data.streakShields !== 'number') data.streakShields = 1;
  if (!Array.isArray(data.activeDates)) data.activeDates = [];
  if (!Array.isArray(data.shieldUsedDates)) data.shieldUsedDates = [];
  if (data.lastActiveDate) {
    const normalized = normalizeISODateString(data.lastActiveDate);
    if (normalized) {
      data.lastActiveDate = normalized;
      if (!data.activeDates.includes(normalized)) {
        data.activeDates.push(normalized);
      }
    }
  }
  return data;
}

function saveUserGamification(userId, data) {
  const all = load(KEYS.GAMIFICATION, {});
  all[userId] = data;
  save(KEYS.GAMIFICATION, all);
  syncAppDataToFirestore(userId, 'gamification', data);
}

const ACHIEVEMENTS = [
  { id: 'first_task', title: 'Primeira Tarefa!', description: 'Concluiu sua primeira tarefa.', icon: '✅', points: 20 },
  { id: 'first_focus', title: 'Primeiro Foco!', description: 'Completou sua primeira sessão de foco.', icon: '🎯', points: 25 },
  { id: 'first_math', title: 'Mente Lógica!', description: 'Resolveu seu primeiro exercício guiado na Área de Estudos.', icon: '🧮', points: 20 },
  { id: 'streak_3', title: 'Constância!', description: 'Estudou 3 dias seguidos.', icon: '🔥', points: 50 },
  { id: 'streak_7', title: 'Chama da Semana!', description: 'Manteve 7 dias de ofensiva de estudos.', icon: '⚡', points: 100 },
];

function calculateLevel(points) {
  if (points < 100) return { level: 1, title: 'Iniciante', next: 100 };
  if (points < 250) return { level: 2, title: 'Explorador', next: 250 };
  if (points < 500) return { level: 3, title: 'Focado', next: 500 };
  if (points < 1000) return { level: 4, title: 'Expert', next: 1000 };
  return { level: 5, title: 'Mestre', next: null };
}

/**
 * Avalia se a sequência (streak) expirou ou se um Escudo de Sequência (🧊)
 * deve proteger automaticamente 1 dia perdido.
 */
function reconcileStreakState(userId, data, todayISO) {
  if (!data.lastActiveDate) {
    return { status: 'inactive', shieldConsumed: false };
  }

  const lastISO = normalizeISODateString(data.lastActiveDate);
  if (!lastISO) {
    data.lastActiveDate = null;
    data.streakDays = 0;
    saveUserGamification(userId, data);
    return { status: 'inactive', shieldConsumed: false };
  }

  const diff = diffCalendarDays(lastISO, todayISO);
  if (diff === null || diff <= 0) {
    return { status: 'completed_today', shieldConsumed: false };
  }
  if (diff === 1) {
    return { status: 'pending_today', shieldConsumed: false };
  }

  // Perdeu exatamente 1 dia (ontem) e tem Escudo de Sequência disponível
  if (diff === 2 && (data.streakShields || 0) > 0 && (data.streakDays || 0) > 0) {
    const yesterdayISO = shiftISODate(todayISO, -1);
    data.streakShields = Math.max(0, data.streakShields - 1);
    if (!data.shieldUsedDates.includes(yesterdayISO)) {
      data.shieldUsedDates.push(yesterdayISO);
    }
    data.lastActiveDate = yesterdayISO;
    saveUserGamification(userId, data);
    return { status: 'shield_protected', shieldConsumed: true };
  }

  // Perdeu 2+ dias (ou não tinha escudo): zera a sequência atual
  if (data.streakDays !== 0) {
    data.streakDays = 0;
    saveUserGamification(userId, data);
  }
  return { status: 'reset', shieldConsumed: false };
}

/**
 * Constrói a barra visual dos últimos 7 dias (estilo Duolingo) terminando hoje.
 */
function buildWeekStreak(data, todayISO) {
  const activeSet = new Set(data.activeDates || []);
  const shieldSet = new Set(data.shieldUsedDates || []);

  return Array.from({ length: 7 }, (_, i) => {
    const iso = shiftISODate(todayISO, -(6 - i));
    const isToday = iso === todayISO;
    let status = 'missed';
    if (activeSet.has(iso)) {
      status = 'active';
    } else if (shieldSet.has(iso)) {
      status = 'shield';
    } else if (isToday) {
      status = 'today_pending';
    }
    return {
      date: iso,
      dayShort: getDayShortName(iso),
      isToday,
      status, // 'active' | 'shield' | 'today_pending' | 'missed'
    };
  });
}

export function getGamification(userId, now = new Date()) {
  const data = getUserGamification(userId);
  const todayISO = toLocalISODate(now);
  const streakMeta = reconcileStreakState(userId, data, todayISO);
  const levelInfo = calculateLevel(data.points);
  const weekStreak = buildWeekStreak(data, todayISO);

  return {
    ...data,
    levelInfo,
    streakStatus: streakMeta.status,
    shieldJustConsumed: streakMeta.shieldConsumed,
    maxStreakShields: MAX_STREAK_SHIELDS,
    weekStreak,
    allAchievements: ACHIEVEMENTS,
  };
}

export function addPoints(userId, points, reason, now = new Date()) {
  const data = getUserGamification(userId);
  const todayISO = toLocalISODate(now);

  // Primeiro reconcilia caso tenha passado dias sem abrir o app
  reconcileStreakState(userId, data, todayISO);

  data.points += points;
  const levelInfo = calculateLevel(data.points);
  data.level = levelInfo.level;

  // Registra presença no dia local (YYYY-MM-DD)
  if (!data.activeDates.includes(todayISO)) {
    data.activeDates.push(todayISO);
    if (data.activeDates.length > 60) {
      data.activeDates = data.activeDates.slice(-60);
    }
  }

  let shieldEarned = false;
  if (data.lastActiveDate !== todayISO) {
    const diff = data.lastActiveDate ? diffCalendarDays(data.lastActiveDate, todayISO) : null;
    if (diff === 1) {
      data.streakDays = (data.streakDays || 0) + 1;
    } else {
      data.streakDays = 1;
    }
    data.lastActiveDate = todayISO;
    data.bestStreak = Math.max(data.bestStreak || 0, data.streakDays);

    // A cada 3 dias seguidos de ofensiva, ganha +1 Escudo de Sequência (máx 2)
    if (data.streakDays > 0 && data.streakDays % 3 === 0 && (data.streakShields || 0) < MAX_STREAK_SHIELDS) {
      data.streakShields = Math.min(MAX_STREAK_SHIELDS, (data.streakShields || 0) + 1);
      shieldEarned = true;
    }
  }

  // Verifica conquistas
  const newAchievements = [];
  if (reason === 'task' && !data.achievements.includes('first_task')) {
    data.achievements.push('first_task');
    newAchievements.push(ACHIEVEMENTS.find(a => a.id === 'first_task'));
    data.points += 20;
  }
  if (reason === 'focus' && !data.achievements.includes('first_focus')) {
    data.achievements.push('first_focus');
    newAchievements.push(ACHIEVEMENTS.find(a => a.id === 'first_focus'));
    data.points += 25;
  }
  if (reason === 'study_exercise' && !data.achievements.includes('first_math')) {
    data.achievements.push('first_math');
    newAchievements.push(ACHIEVEMENTS.find(a => a.id === 'first_math'));
    data.points += 20;
  }
  if (data.streakDays >= 3 && !data.achievements.includes('streak_3')) {
    data.achievements.push('streak_3');
    newAchievements.push(ACHIEVEMENTS.find(a => a.id === 'streak_3'));
    data.points += 50;
  }
  if (data.streakDays >= 7 && !data.achievements.includes('streak_7')) {
    data.achievements.push('streak_7');
    newAchievements.push(ACHIEVEMENTS.find(a => a.id === 'streak_7'));
    data.points += 100;
  }

  data.level = calculateLevel(data.points).level;
  saveUserGamification(userId, data);

  return {
    data: {
      ...data,
      levelInfo: calculateLevel(data.points),
      weekStreak: buildWeekStreak(data, todayISO),
      shieldEarned,
    },
    newAchievements,
  };
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function getUserSettings(userId) {
  const all = load(KEYS.SETTINGS, {});
  return all[userId] || { theme: 'light', fontSize: 'medium', notifications: true };
}

function saveUserSettingsData(userId, settings) {
  const all = load(KEYS.SETTINGS, {});
  all[userId] = settings;
  save(KEYS.SETTINGS, all);
  syncAppDataToFirestore(userId, 'settings', settings);
}

export function getSettings(userId) {
  return getUserSettings(userId);
}

export function saveSettings(userId, settings) {
  saveUserSettingsData(userId, settings);
  return settings;
}

// ─── Export / Import & Migração Segura do localStorage para Firebase ──────────
export function exportAllData(userId) {
  return {
    exportedAt: new Date().toISOString(),
    version: '1.2',
    tasks: getUserTasks(userId),
    agenda: getUserAgenda(userId),
    focusSessions: getUserFocusSessions(userId),
    gamification: getUserGamification(userId),
    settings: getUserSettings(userId),
    weeklyPlan: getWeeklyPlan(userId),
    studyProgress: getUserStudyProgress(userId),
  };
}

export function importAllData(userId, data) {
  if (!data || !data.version) throw new Error('Arquivo de importação inválido.');

  // NUNCA importa senhas antigas caso o arquivo tenha um campo user/password legado
  const existingTasks = getUserTasks(userId);
  const existingAgenda = getUserAgenda(userId);
  const existingSessions = getUserFocusSessions(userId);

  // Evita importações duplicadas mesclando por ID
  if (Array.isArray(data.tasks)) {
    const map = new Map(existingTasks.map(t => [t.id, t]));
    data.tasks.forEach(t => {
      if (t && t.id && !map.has(t.id)) map.set(t.id, t);
    });
    saveUserTasks(userId, Array.from(map.values()));
  }
  if (Array.isArray(data.agenda)) {
    const map = new Map(existingAgenda.map(e => [e.id, e]));
    data.agenda.forEach(e => {
      if (e && e.id && !map.has(e.id)) map.set(e.id, e);
    });
    saveUserAgenda(userId, Array.from(map.values()));
  }
  if (Array.isArray(data.focusSessions)) {
    const map = new Map(existingSessions.map(s => [s.id || s.sessionId, s]));
    data.focusSessions.forEach(s => {
      const sid = s?.id || s?.sessionId;
      if (sid && !map.has(sid)) map.set(sid, { ...s, id: sid });
    });
    saveUserFocusSessions(userId, Array.from(map.values()));
  }
  if (data.gamification) {
    const curG = getUserGamification(userId);
    const mergedG = {
      ...curG,
      points: Math.max(curG.points || 0, data.gamification.points || 0),
      level: calculateLevel(Math.max(curG.points || 0, data.gamification.points || 0)).level,
      streakDays: Math.max(curG.streakDays || 0, data.gamification.streakDays || 0),
      bestStreak: Math.max(curG.bestStreak || 0, data.gamification.bestStreak || 0),
      streakShields: Math.max(curG.streakShields ?? 1, data.gamification.streakShields ?? 1),
      achievements: Array.from(new Set([...(curG.achievements || []), ...(data.gamification.achievements || [])])),
      activeDates: Array.from(new Set([...(curG.activeDates || []), ...(data.gamification.activeDates || [])])).sort(),
      shieldUsedDates: Array.from(new Set([...(curG.shieldUsedDates || []), ...(data.gamification.shieldUsedDates || [])])).sort(),
      lastActiveDate: data.gamification.lastActiveDate || curG.lastActiveDate || null,
    };
    saveUserGamification(userId, mergedG);
  }
  if (data.settings) saveUserSettingsData(userId, data.settings);
  if (data.weeklyPlan) saveWeeklyPlan(userId, data.weeklyPlan);
  if (data.studyProgress) {
    const curP = getUserStudyProgress(userId);
    const mergedP = {
      ...curP,
      ...data.studyProgress,
      completedExercises: Array.from(
        new Set([...(curP.completedExercises || []), ...(data.studyProgress.completedExercises || [])])
      ),
    };
    saveUserStudyProgress(userId, mergedP);
  }

  // Sincroniza tudo com o Cloud Firestore
  pushFullUserStateToFirestore(userId, {
    tasks: getUserTasks(userId),
    agenda: getUserAgenda(userId),
    focusSessions: getUserFocusSessions(userId),
    gamification: getUserGamification(userId),
    settings: getUserSettings(userId),
    weeklyPlan: getWeeklyPlan(userId),
    studyProgress: getUserStudyProgress(userId),
  }).catch(() => {});
}

/**
 * Lista todas as contas locais legadas encontradas no `localStorage` (sem senhas!)
 * para que usuários beta possam exportar backup e migrar seus dados para a nova conta Firebase (`uid`).
 */
export function getLegacyLocalAccounts(currentFirebaseUid) {
  const legacyUsers = load(KEYS.USERS, []);
  const allTasks = load(KEYS.TASKS, {});
  const allAgenda = load(KEYS.AGENDA, {});
  const allSessions = load(KEYS.FOCUS_SESSIONS, {});
  const allGamification = load(KEYS.GAMIFICATION, {});
  const migrationsLog = load(KEYS.MIGRATIONS_LOG, {});

  const candidateIds = new Set();
  legacyUsers.forEach(u => {
    if (u?.id && u.id !== currentFirebaseUid) candidateIds.add(u.id);
  });
  [allTasks, allAgenda, allSessions, allGamification].forEach(bucket => {
    if (bucket && typeof bucket === 'object') {
      Object.keys(bucket).forEach(k => {
        if (k && k !== currentFirebaseUid) candidateIds.add(k);
      });
    }
  });

  const result = [];
  for (const legacyId of candidateIds) {
    const userObj = legacyUsers.find(u => u.id === legacyId);
    const tasks = allTasks[legacyId] || [];
    const agenda = allAgenda[legacyId] || [];
    const sessions = allSessions[legacyId] || [];
    const gamification = allGamification[legacyId] || {};
    const points = gamification.points || 0;

    // Ignora chaves vazias sem usuário registrado
    if (!userObj && tasks.length === 0 && agenda.length === 0 && sessions.length === 0 && points === 0) {
      continue;
    }

    const migrationKey = `${legacyId}->${currentFirebaseUid}`;
    const migrationRecord = migrationsLog[migrationKey] || null;

    // NUNCA inclui `password` no retorno!
    result.push({
      id: legacyId,
      name: userObj?.name || `Dados Locais (${legacyId.slice(0, 8)})`,
      email: userObj?.email || 'Conta local deste navegador',
      createdAt: userObj?.createdAt || null,
      tasksCount: tasks.length,
      agendaCount: agenda.length,
      focusSessionsCount: sessions.length,
      points,
      streakDays: gamification.streakDays || 0,
      alreadyMigrated: Boolean(migrationRecord),
      migratedAt: migrationRecord?.migratedAt || null,
    });
  }

  return result;
}

/**
 * Migra de forma idempotente (sem duplicar tarefas, eventos, sessões ou XP e sem migrar senhas)
 * os dados de uma conta local antiga (`legacyUserId`) para a nova conta Firebase (`targetFirebaseUid`).
 * NÃO apaga os dados locais antigos automaticamente (exige confirmação separada do usuário).
 */
export async function migrateLegacyAccountToFirebase(legacyUserId, targetFirebaseUid) {
  if (!legacyUserId || !targetFirebaseUid) {
    throw new Error('Identificadores de origem e destino são obrigatórios para a migração.');
  }
  if (legacyUserId === targetFirebaseUid) {
    throw new Error('A conta de origem e destino são a mesma.');
  }

  const migrationsLog = load(KEYS.MIGRATIONS_LOG, {});
  const migrationKey = `${legacyUserId}->${targetFirebaseUid}`;

  const sourceData = exportAllData(legacyUserId);
  const beforeTasksCount = getUserTasks(targetFirebaseUid).length;
  const beforeAgendaCount = getUserAgenda(targetFirebaseUid).length;
  const beforeSessionsCount = getUserFocusSessions(targetFirebaseUid).length;

  // Importa e mescla sem duplicar IDs e sem tocar em senhas
  importAllData(targetFirebaseUid, sourceData);

  const afterTasksCount = getUserTasks(targetFirebaseUid).length;
  const afterAgendaCount = getUserAgenda(targetFirebaseUid).length;
  const afterSessionsCount = getUserFocusSessions(targetFirebaseUid).length;

  const migrationSummary = {
    legacyUserId,
    targetFirebaseUid,
    migratedAt: new Date().toISOString(),
    tasksAdded: Math.max(0, afterTasksCount - beforeTasksCount),
    agendaAdded: Math.max(0, afterAgendaCount - beforeAgendaCount),
    sessionsAdded: Math.max(0, afterSessionsCount - beforeSessionsCount),
    totalPointsAfter: getUserGamification(targetFirebaseUid).points || 0,
  };

  migrationsLog[migrationKey] = migrationSummary;
  save(KEYS.MIGRATIONS_LOG, migrationsLog);

  // Garante envio para o Cloud Firestore
  await pushFullUserStateToFirestore(targetFirebaseUid, {
    tasks: getUserTasks(targetFirebaseUid),
    agenda: getUserAgenda(targetFirebaseUid),
    focusSessions: getUserFocusSessions(targetFirebaseUid),
    gamification: getUserGamification(targetFirebaseUid),
    settings: getUserSettings(targetFirebaseUid),
    weeklyPlan: getWeeklyPlan(targetFirebaseUid),
    studyProgress: getUserStudyProgress(targetFirebaseUid),
  });

  emitCloudSyncEvent(targetFirebaseUid, 'migration');
  return migrationSummary;
}

/**
 * Remove os dados locais antigos SOMENTE após a migração ter sido confirmada pelo usuário.
 */
export function confirmAndClearLegacyAccount(legacyUserId, currentFirebaseUid) {
  if (!legacyUserId || legacyUserId === currentFirebaseUid) {
    throw new Error('Operação inválida.');
  }
  const migrationsLog = load(KEYS.MIGRATIONS_LOG, {});
  const migrationKey = `${legacyUserId}->${currentFirebaseUid}`;
  if (!migrationsLog[migrationKey]) {
    throw new Error('Por segurança, migre ou exporte os dados desta conta local antes de apagá-la.');
  }

  const bucketKeys = [
    KEYS.TASKS,
    KEYS.AGENDA,
    KEYS.FOCUS_SESSIONS,
    KEYS.GAMIFICATION,
    KEYS.SETTINGS,
    KEYS.WEEKLY_PLAN,
    KEYS.STUDY_PROGRESS,
  ];
  bucketKeys.forEach(k => {
    const all = load(k, {});
    if (all && typeof all === 'object' && legacyUserId in all) {
      delete all[legacyUserId];
      save(k, all);
    }
  });

  const users = load(KEYS.USERS, []);
  save(KEYS.USERS, users.filter(u => u.id !== legacyUserId));
  return true;
}

// ─── Progress / Stats ─────────────────────────────────────────────────────────
export function getWeeklyStats(userId) {
  const sessions = getUserFocusSessions(userId);
  const tasks = getUserTasks(userId);

  // Last 7 days (local calendar days, YYYY-MM-DD). Index 6 is always today.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return toLocalISODate(d);
  });

  const dailyMinutes = days.map(day => {
    return sessions
      .filter(s => toLocalISODate(new Date(s.completedAt)) === day)
      .reduce((acc, s) => acc + s.durationMinutes, 0);
  });

  const completedThisWeek = tasks.filter(t => {
    if (t.status !== 'completed' || !t.completedAt) return false;
    const completed = new Date(t.completedAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return completed >= weekAgo;
  }).length;

  const focusSessionsThisWeek = sessions.filter(s => {
    const completed = new Date(s.completedAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return completed >= weekAgo;
  }).length;

  const totalMinutesThisWeek = dailyMinutes.reduce((a, b) => a + b, 0);

  return {
    days,
    dailyMinutes,
    completedThisWeek,
    focusSessionsThisWeek,
    totalMinutesThisWeek,
    totalSessions: sessions.length,
    totalTasksCompleted: tasks.filter(t => t.status === 'completed').length,
    totalMinutesAllTime: sessions.reduce((acc, s) => acc + s.durationMinutes, 0),
  };
}
