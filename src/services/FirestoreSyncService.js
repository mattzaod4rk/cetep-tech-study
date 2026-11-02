/**
 * FirestoreSyncService.js — Camada de sincronização em tempo real com o Cloud Firestore.
 *
 * Todos os documentos respeitam rigorosamente o contrato de validação definido em `firestore.rules`
 * sob `/users/{uid}` e suas subcoleções (`tasks`, `agenda`, `focusSessions`, `appdata`).
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase.js';

// ─── Sanitizadores estritos compatíveis com firestore.rules ──────────────────

export function sanitizeTaskForFirestore(task) {
  const nowISO = new Date().toISOString();
  const deadlineVal = task.deadline || task.dueDate || null;
  const clean = {
    id: String(task.id || '').slice(0, 128),
    title: String(task.title || 'Tarefa sem título').trim().slice(0, 300) || 'Tarefa',
    description: task.description ? String(task.description).slice(0, 2000) : '',
    subject: task.subject ? String(task.subject).slice(0, 120) : 'Geral',
    priority: task.priority ? String(task.priority).slice(0, 30) : 'medium',
    deadline: deadlineVal ? String(deadlineVal).slice(0, 40) : null,
    dueDate: deadlineVal ? String(deadlineVal).slice(0, 40) : null,
    subtasks: Array.isArray(task.subtasks) ? task.subtasks.slice(0, 50) : [],
    status: task.status === 'completed' ? 'completed' : 'pending',
    xpAwarded: Boolean(task.xpAwarded || task.status === 'completed'),
    createdAt: task.createdAt ? String(task.createdAt).slice(0, 40) : nowISO,
    completedAt: task.completedAt ? String(task.completedAt).slice(0, 40) : null,
    updatedAt: nowISO,
  };
  if (typeof task.estimatedMinutes === 'number' && !Number.isNaN(task.estimatedMinutes)) {
    clean.estimatedMinutes = Math.max(0, Math.min(1440, Math.round(task.estimatedMinutes)));
  }
  return clean;
}

export function sanitizeAgendaEventForFirestore(event) {
  const nowISO = new Date().toISOString();
  return {
    id: String(event.id || '').slice(0, 128),
    title: String(event.title || 'Evento').trim().slice(0, 300) || 'Evento',
    date: String(event.date || nowISO.slice(0, 10)).slice(0, 30),
    time: event.time ? String(event.time).slice(0, 20) : '',
    type: event.type ? String(event.type).slice(0, 50) : 'Outro',
    subject: event.subject ? String(event.subject).slice(0, 120) : 'Geral',
    priority: event.priority ? String(event.priority).slice(0, 30) : 'medium',
    description: event.description ? String(event.description).slice(0, 2000) : '',
    notes: event.notes ? String(event.notes).slice(0, 2000) : '',
    createdAt: event.createdAt ? String(event.createdAt).slice(0, 40) : nowISO,
    updatedAt: nowISO,
  };
}

export function sanitizeFocusSessionForFirestore(session) {
  const nowISO = new Date().toISOString();
  const durationMinutes = Math.max(1, Math.min(300, Math.round(Number(session.durationMinutes) || 25)));
  const plannedMinutes = Math.max(1, Math.min(300, Math.round(Number(session.plannedMinutes) || durationMinutes)));
  const elapsedSeconds = Math.max(0, Math.min(18000, Math.round(Number(session.elapsedSeconds) || durationMinutes * 60)));
  const pointsEarned = Math.max(0, Math.min(100, Math.round(Number(session.pointsEarned) || 0)));

  return {
    id: String(session.id || session.sessionId || '').slice(0, 128),
    sessionId: String(session.sessionId || session.id || '').slice(0, 128),
    durationMinutes,
    plannedMinutes,
    elapsedSeconds,
    completed: Boolean(session.completed),
    subject: session.subject ? String(session.subject).slice(0, 120) : 'Geral',
    xpAwarded: Boolean(session.xpAwarded),
    pointsEarned,
    completedAt: session.completedAt ? String(session.completedAt).slice(0, 40) : nowISO,
    createdAt: session.createdAt ? String(session.createdAt).slice(0, 40) : nowISO,
  };
}

export function sanitizeGamificationForFirestore(g) {
  const nowISO = new Date().toISOString();
  return {
    points: Math.max(0, Math.round(Number(g?.points) || 0)),
    level: Math.max(1, Math.min(10, Math.round(Number(g?.level) || 1))),
    achievements: Array.isArray(g?.achievements) ? g.achievements.slice(0, 100) : [],
    lastActiveDate: g?.lastActiveDate ? String(g.lastActiveDate).slice(0, 30) : null,
    streakDays: Math.max(0, Math.round(Number(g?.streakDays) || 0)),
    bestStreak: Math.max(0, Math.round(Number(g?.bestStreak) || 0)),
    streakShields: Math.max(0, Math.min(5, Math.round(Number(g?.streakShields ?? 1)))),
    activeDates: Array.isArray(g?.activeDates) ? g.activeDates.slice(-1000) : [],
    shieldUsedDates: Array.isArray(g?.shieldUsedDates) ? g.shieldUsedDates.slice(-500) : [],
    updatedAt: nowISO,
  };
}

const VALID_THEMES = ['light', 'dark', 'highcontrast', 'highcontrast-white'];
const VALID_FONTS = ['small', 'medium', 'large', 'xlarge', 'huge'];

export function sanitizeSettingsForFirestore(s) {
  const nowISO = new Date().toISOString();
  return {
    theme: VALID_THEMES.includes(s?.theme) ? s.theme : 'light',
    fontSize: VALID_FONTS.includes(s?.fontSize) ? s.fontSize : 'medium',
    dyslexiaFont: Boolean(s?.dyslexiaFont),
    reducedMotion: Boolean(s?.reducedMotion),
    notifications: s?.notifications !== undefined ? Boolean(s.notifications) : true,
    updatedAt: nowISO,
  };
}

export function sanitizeWeeklyPlanForFirestore(plan) {
  const nowISO = new Date().toISOString();
  const allowedDayKeys = ['0', '1', '2', '3', '4', '5', '6', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom', 'days'];
  const clean = { updatedAt: nowISO };
  if (plan && typeof plan === 'object') {
    for (const k of allowedDayKeys) {
      if (k in plan && plan[k] && typeof plan[k] === 'object') {
        clean[k] = plan[k];
      }
    }
  }
  return clean;
}

export function sanitizeStudyProgressForFirestore(progress) {
  const nowISO = new Date().toISOString();
  return {
    completedExercises: Array.isArray(progress?.completedExercises)
      ? progress.completedExercises.slice(0, 500)
      : [],
    lastVisitedTab: progress?.lastVisitedTab ? String(progress.lastVisitedTab).slice(0, 100) : 'matematica',
    updatedAt: nowISO,
  };
}

// ─── Operações de Escrita Assíncrona para o Cloud Firestore ──────────────────

export async function syncTaskToFirestore(uid, task) {
  if (!db || !uid || !task?.id) return;
  try {
    const ref = doc(db, 'users', uid, 'tasks', String(task.id));
    await setDoc(ref, sanitizeTaskForFirestore(task));
  } catch (err) {
    console.warn('[FirestoreSync] Falha ao salvar tarefa:', err);
  }
}

export async function deleteTaskFromFirestore(uid, taskId) {
  if (!db || !uid || !taskId) return;
  try {
    const ref = doc(db, 'users', uid, 'tasks', String(taskId));
    await deleteDoc(ref);
  } catch (err) {
    console.warn('[FirestoreSync] Falha ao excluir tarefa:', err);
  }
}

export async function syncAgendaEventToFirestore(uid, event) {
  if (!db || !uid || !event?.id) return;
  try {
    const ref = doc(db, 'users', uid, 'agenda', String(event.id));
    await setDoc(ref, sanitizeAgendaEventForFirestore(event));
  } catch (err) {
    console.warn('[FirestoreSync] Falha ao salvar evento da agenda:', err);
  }
}

export async function deleteAgendaEventFromFirestore(uid, eventId) {
  if (!db || !uid || !eventId) return;
  try {
    const ref = doc(db, 'users', uid, 'agenda', String(eventId));
    await deleteDoc(ref);
  } catch (err) {
    console.warn('[FirestoreSync] Falha ao excluir evento da agenda:', err);
  }
}

export async function syncFocusSessionToFirestore(uid, session) {
  if (!db || !uid || !session?.id) return;
  try {
    const ref = doc(db, 'users', uid, 'focusSessions', String(session.id));
    await setDoc(ref, sanitizeFocusSessionForFirestore(session));
  } catch (err) {
    console.warn('[FirestoreSync] Falha ao salvar sessão de foco:', err);
  }
}

export async function syncAppDataToFirestore(uid, docId, payload) {
  if (!db || !uid || !docId) return;
  try {
    let cleanPayload = null;
    if (docId === 'gamification') cleanPayload = sanitizeGamificationForFirestore(payload);
    else if (docId === 'settings') cleanPayload = sanitizeSettingsForFirestore(payload);
    else if (docId === 'weeklyPlan') cleanPayload = sanitizeWeeklyPlanForFirestore(payload);
    else if (docId === 'studyProgress') cleanPayload = sanitizeStudyProgressForFirestore(payload);
    if (!cleanPayload) return;

    const ref = doc(db, 'users', uid, 'appdata', docId);
    await setDoc(ref, cleanPayload);
  } catch (err) {
    console.warn(`[FirestoreSync] Falha ao sincronizar appdata/${docId}:`, err);
  }
}

/**
 * Envia um pacote completo de dados do usuário para o Cloud Firestore em lotes (batch).
 * Usado na importação de backup e na migração do localStorage para o Firebase.
 */
export async function pushFullUserStateToFirestore(uid, {
  tasks = [],
  agenda = [],
  focusSessions = [],
  gamification = null,
  settings = null,
  weeklyPlan = null,
  studyProgress = null,
} = {}) {
  if (!db || !uid) return false;

  const operations = [];

  for (const t of tasks) {
    if (t?.id) {
      operations.push({
        ref: doc(db, 'users', uid, 'tasks', String(t.id)),
        data: sanitizeTaskForFirestore(t),
      });
    }
  }
  for (const e of agenda) {
    if (e?.id) {
      operations.push({
        ref: doc(db, 'users', uid, 'agenda', String(e.id)),
        data: sanitizeAgendaEventForFirestore(e),
      });
    }
  }
  for (const s of focusSessions) {
    const sid = s?.id || s?.sessionId;
    if (sid) {
      operations.push({
        ref: doc(db, 'users', uid, 'focusSessions', String(sid)),
        data: sanitizeFocusSessionForFirestore({ ...s, id: sid }),
      });
    }
  }
  if (gamification) {
    operations.push({
      ref: doc(db, 'users', uid, 'appdata', 'gamification'),
      data: sanitizeGamificationForFirestore(gamification),
    });
  }
  if (settings) {
    operations.push({
      ref: doc(db, 'users', uid, 'appdata', 'settings'),
      data: sanitizeSettingsForFirestore(settings),
    });
  }
  if (weeklyPlan) {
    operations.push({
      ref: doc(db, 'users', uid, 'appdata', 'weeklyPlan'),
      data: sanitizeWeeklyPlanForFirestore(weeklyPlan),
    });
  }
  if (studyProgress) {
    operations.push({
      ref: doc(db, 'users', uid, 'appdata', 'studyProgress'),
      data: sanitizeStudyProgressForFirestore(studyProgress),
    });
  }

  // O Firestore suporta até 500 operações por writeBatch
  const CHUNK_SIZE = 400;
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      batch.set(op.ref, op.data);
    }
    await batch.commit();
  }

  return true;
}

/**
 * Inscreve listeners em tempo real (`onSnapshot`) nas coleções do usuário autenticado (`uid`),
 * mantendo o cache local atualizado entre múltiplos dispositivos/abas.
 */
export function subscribeToUserFirestore(uid, {
  onTasksSnapshot,
  onAgendaSnapshot,
  onFocusSessionsSnapshot,
  onAppDataSnapshot,
} = {}) {
  if (!db || !uid) return () => {};

  const unsubs = [];

  try {
    const tasksCol = collection(db, 'users', uid, 'tasks');
    unsubs.push(
      onSnapshot(
        tasksCol,
        snap => {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          onTasksSnapshot?.(items);
        },
        err => console.warn('[FirestoreSync] Listener tasks erro:', err)
      )
    );

    const agendaCol = collection(db, 'users', uid, 'agenda');
    unsubs.push(
      onSnapshot(
        agendaCol,
        snap => {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          onAgendaSnapshot?.(items);
        },
        err => console.warn('[FirestoreSync] Listener agenda erro:', err)
      )
    );

    const focusCol = collection(db, 'users', uid, 'focusSessions');
    unsubs.push(
      onSnapshot(
        focusCol,
        snap => {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          onFocusSessionsSnapshot?.(items);
        },
        err => console.warn('[FirestoreSync] Listener focusSessions erro:', err)
      )
    );

    const appDataCol = collection(db, 'users', uid, 'appdata');
    unsubs.push(
      onSnapshot(
        appDataCol,
        snap => {
          const map = {};
          snap.docs.forEach(d => {
            map[d.id] = d.data();
          });
          onAppDataSnapshot?.(map);
        },
        err => console.warn('[FirestoreSync] Listener appdata erro:', err)
      )
    );
  } catch (err) {
    console.warn('[FirestoreSync] Erro ao iniciar listeners:', err);
  }

  return () => {
    unsubs.forEach(u => {
      try { u(); } catch {}
    });
  };
}

/**
 * Remove todos os documentos do usuário no Cloud Firestore ao excluir a conta.
 */
export async function deleteAllUserFirestoreData(uid) {
  if (!db || !uid) return;
  try {
    const subcols = ['tasks', 'agenda', 'focusSessions', 'appdata'];
    for (const sub of subcols) {
      const snap = await getDocs(collection(db, 'users', uid, sub));
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      if (snap.docs.length > 0) await batch.commit();
    }
    await deleteDoc(doc(db, 'users', uid));
  } catch (err) {
    console.warn('[FirestoreSync] Erro ao excluir dados do usuário no Firestore:', err);
  }
}
