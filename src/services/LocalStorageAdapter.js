/**
 * LocalStorageAdapter — Implementação concreta do DataService usando localStorage.
 *
 * ARQUITETURA: Esta é a única classe que acessa o localStorage diretamente.
 * Para migrar para um banco de dados real (ex: Supabase), basta criar um
 * SupabaseAdapter com a mesma interface e trocá-lo aqui, sem alterar nenhuma
 * tela ou lógica de negócio do app.
 */

import { hashPassword, verifyPassword } from './crypto.js';

const KEYS = {
  USERS: 'cetep_users',
  SESSION: 'cetep_session',
  TASKS: 'cetep_tasks',
  AGENDA: 'cetep_agenda',
  FOCUS_SESSIONS: 'cetep_focus_sessions',
  GAMIFICATION: 'cetep_gamification',
  SETTINGS: 'cetep_settings',
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

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function register({ name, email, password, role }) {
  const users = load(KEYS.USERS, []);
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Este e-mail já está cadastrado.');
  }
  const hashedPassword = await hashPassword(password);
  const user = {
    id: generateId(),
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    role, // 'aluno' | 'professor'
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  save(KEYS.USERS, users);

  // Inicializa dados padrão para o novo usuário
  initUserData(user.id);

  const sessionUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  save(KEYS.SESSION, sessionUser);
  return sessionUser;
}

export async function login({ email, password }) {
  const users = load(KEYS.USERS, []);
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error('E-mail ou senha incorretos.');
  const valid = await verifyPassword(password, user.password);
  if (!valid) throw new Error('E-mail ou senha incorretos.');
  const sessionUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  save(KEYS.SESSION, sessionUser);
  return sessionUser;
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
  if (idx === -1) throw new Error('Usuário não encontrado.');
  if (updates.password) {
    updates.password = await hashPassword(updates.password);
  }
  users[idx] = { ...users[idx], ...updates };
  save(KEYS.USERS, users);
  const sessionUser = getSession();
  if (sessionUser && sessionUser.id === userId) {
    const updated = { ...sessionUser, name: users[idx].name, email: users[idx].email };
    save(KEYS.SESSION, updated);
    return updated;
  }
  return sessionUser;
}

// ─── User data initializer ────────────────────────────────────────────────────
function initUserData(userId) {
  const gamification = load(KEYS.GAMIFICATION, {});
  if (!gamification[userId]) {
    gamification[userId] = {
      points: 0,
      level: 1,
      achievements: [],
      lastActiveDate: null,
      streakDays: 0,
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
  return task;
}

export function updateTask(userId, taskId, updates) {
  const tasks = getUserTasks(userId);
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) throw new Error('Tarefa não encontrada.');
  tasks[idx] = { ...tasks[idx], ...updates };
  saveUserTasks(userId, tasks);
  return tasks[idx];
}

export function deleteTask(userId, taskId) {
  let tasks = getUserTasks(userId);
  tasks = tasks.filter(t => t.id !== taskId);
  saveUserTasks(userId, tasks);
}

export function completeTask(userId, taskId) {
  const tasks = getUserTasks(userId);
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) throw new Error('Tarefa não encontrada.');
  tasks[idx] = { ...tasks[idx], status: 'completed', completedAt: new Date().toISOString() };
  saveUserTasks(userId, tasks);
  return tasks[idx];
}

export function reopenTask(userId, taskId) {
  const tasks = getUserTasks(userId);
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) throw new Error('Tarefa não encontrada.');
  tasks[idx] = { ...tasks[idx], status: 'pending', completedAt: null };
  saveUserTasks(userId, tasks);
  return tasks[idx];
}

export function addSubtask(userId, taskId, subtaskTitle) {
  const tasks = getUserTasks(userId);
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) throw new Error('Tarefa não encontrada.');
  const subtask = { id: generateId(), title: subtaskTitle, completed: false };
  tasks[idx].subtasks = [...(tasks[idx].subtasks || []), subtask];
  saveUserTasks(userId, tasks);
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
  return tasks[idx];
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
  return event;
}

export function updateAgendaEvent(userId, eventId, updates) {
  const events = getUserAgenda(userId);
  const idx = events.findIndex(e => e.id === eventId);
  if (idx === -1) throw new Error('Evento não encontrado.');
  events[idx] = { ...events[idx], ...updates };
  saveUserAgenda(userId, events);
  return events[idx];
}

export function deleteAgendaEvent(userId, eventId) {
  let events = getUserAgenda(userId);
  events = events.filter(e => e.id !== eventId);
  saveUserAgenda(userId, events);
}

// ─── Focus Sessions ───────────────────────────────────────────────────────────
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
    id: generateId(),
    ...sessionData,
    completedAt: new Date().toISOString(),
  };
  sessions.push(session);
  saveUserFocusSessions(userId, sessions);
  return session;
}

// ─── Gamification ─────────────────────────────────────────────────────────────
function getUserGamification(userId) {
  const all = load(KEYS.GAMIFICATION, {});
  if (!all[userId]) {
    all[userId] = { points: 0, level: 1, achievements: [], lastActiveDate: null, streakDays: 0 };
    save(KEYS.GAMIFICATION, all);
  }
  return all[userId];
}

function saveUserGamification(userId, data) {
  const all = load(KEYS.GAMIFICATION, {});
  all[userId] = data;
  save(KEYS.GAMIFICATION, all);
}

const ACHIEVEMENTS = [
  { id: 'first_task', title: 'Primeira Tarefa!', description: 'Concluiu sua primeira tarefa.', icon: '✅', points: 20 },
  { id: 'first_focus', title: 'Primeiro Foco!', description: 'Completou sua primeira sessão de foco.', icon: '🎯', points: 25 },
  { id: 'streak_3', title: 'Constância!', description: 'Estudou 3 dias seguidos.', icon: '🔥', points: 50 },
];

function calculateLevel(points) {
  if (points < 100) return { level: 1, title: 'Iniciante', next: 100 };
  if (points < 250) return { level: 2, title: 'Explorador', next: 250 };
  if (points < 500) return { level: 3, title: 'Focado', next: 500 };
  if (points < 1000) return { level: 4, title: 'Expert', next: 1000 };
  return { level: 5, title: 'Mestre', next: null };
}

export function getGamification(userId) {
  const data = getUserGamification(userId);
  const levelInfo = calculateLevel(data.points);
  return { ...data, levelInfo, allAchievements: ACHIEVEMENTS };
}

export function addPoints(userId, points, reason) {
  const data = getUserGamification(userId);
  data.points += points;
  const levelInfo = calculateLevel(data.points);
  data.level = levelInfo.level;

  // Atualiza streak
  const today = new Date().toDateString();
  if (data.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (data.lastActiveDate === yesterday.toDateString()) {
      data.streakDays = (data.streakDays || 0) + 1;
    } else {
      data.streakDays = 1;
    }
    data.lastActiveDate = today;
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
  if (data.streakDays >= 3 && !data.achievements.includes('streak_3')) {
    data.achievements.push('streak_3');
    newAchievements.push(ACHIEVEMENTS.find(a => a.id === 'streak_3'));
    data.points += 50;
  }

  saveUserGamification(userId, data);
  return { data: { ...data, levelInfo: calculateLevel(data.points) }, newAchievements };
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
}

export function getSettings(userId) {
  return getUserSettings(userId);
}

export function saveSettings(userId, settings) {
  saveUserSettingsData(userId, settings);
  return settings;
}

// ─── Export / Import ──────────────────────────────────────────────────────────
export function exportAllData(userId) {
  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    tasks: getUserTasks(userId),
    agenda: getUserAgenda(userId),
    focusSessions: getUserFocusSessions(userId),
    gamification: getUserGamification(userId),
    settings: getUserSettings(userId),
  };
}

export function importAllData(userId, data) {
  if (!data || !data.version) throw new Error('Arquivo de importação inválido.');
  if (data.tasks) saveUserTasks(userId, data.tasks);
  if (data.agenda) saveUserAgenda(userId, data.agenda);
  if (data.focusSessions) saveUserFocusSessions(userId, data.focusSessions);
  if (data.gamification) saveUserGamification(userId, data.gamification);
  if (data.settings) saveUserSettingsData(userId, data.settings);
}

// ─── Progress / Stats ─────────────────────────────────────────────────────────
export function getWeeklyStats(userId) {
  const sessions = getUserFocusSessions(userId);
  const tasks = getUserTasks(userId);

  // Last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toDateString();
  });

  const dailyMinutes = days.map(day => {
    return sessions
      .filter(s => new Date(s.completedAt).toDateString() === day)
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
