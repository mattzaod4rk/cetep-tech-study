/**
 * TeacherService.js — Serviço de Gestão Docente, Turmas, Conteúdos, Atividades,
 * Comunicados, Acompanhamento Acadêmico e Controle de Acesso (RBAC: aluno | professor | admin).
 *
 * Todas as operações respeitam rigorosamente o contrato de segurança do Cloud Firestore
 * (`firestore.rules`) e incluem fallback local para execução determinística em suíte de testes.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { hashPassword } from './crypto.js';
import { normalizeLegacySubjectName } from '../utils/subjects.js';
import * as DataService from './DataService.js';

const LOCAL_KEYS = {
  CLASSES: 'cetep_classes',
  CLASS_CONTENTS: 'cetep_class_contents',
  CLASS_ACTIVITIES: 'cetep_class_activities',
  CLASS_ANNOUNCEMENTS: 'cetep_class_announcements',
  CLASS_AUDIT_LOGS: 'cetep_class_audit_logs',
  TEACHER_INVITES: 'cetep_teacher_invites',
  USERS: 'cetep_users',
  INDIVIDUAL_ACTIVITIES: 'cetep_student_individual_activities',
  ACADEMIC_RECORDS: 'cetep_student_academic_records',
  PEDAGOGICAL_FEEDBACKS: 'cetep_student_pedagogical_feedbacks',
  INTERNAL_NOTES: 'cetep_student_internal_notes',
  CLASS_MATERIALS: 'cetep_class_materials',
  CLASS_MATERIAL_CHUNKS: 'cetep_class_material_chunks',
};

function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Verificadores de Autorização (RBAC) ─────────────────────────────────────

export function isStaffUser(user) {
  return Boolean(user && (user.role === 'professor' || user.role === 'admin'));
}

export function isAdminUser(user) {
  return Boolean(user && user.role === 'admin');
}

export function assertStaff(actorUser) {
  if (!isStaffUser(actorUser)) {
    throw new Error('Acesso negado: área restrita a professores autorizados e administradores.');
  }
}

export function assertAdmin(actorUser) {
  if (!isAdminUser(actorUser)) {
    throw new Error('Acesso negado: operação exclusiva de administradores.');
  }
}

export function canUserManageClass(actorUser, classObj) {
  if (!actorUser || !classObj) return false;
  if (actorUser.role === 'admin') return true;
  const uid = actorUser.uid || actorUser.id;
  return (
    actorUser.role === 'professor' &&
    Array.isArray(classObj.teacherIds) &&
    classObj.teacherIds.includes(uid)
  );
}

export function assertCanManageClass(actorUser, classObj) {
  assertStaff(actorUser);
  if (!canUserManageClass(actorUser, classObj)) {
    throw new Error('Acesso negado: você não possui autorização para administrar esta turma.');
  }
}

// ─── 1. Gestão de Turmas (/classes/{classId}) ────────────────────────────────

function sanitizeClassDoc(classData, existing = null) {
  const nowISO = new Date().toISOString();
  return {
    id: String(classData.id || existing?.id || generateId('turma')).slice(0, 128),
    name: String(classData.name ?? existing?.name ?? '').trim().slice(0, 150),
    code: String(classData.code ?? existing?.code ?? '').trim().slice(0, 50),
    course: String(classData.course ?? existing?.course ?? 'Técnico em Informática').trim().slice(0, 120),
    shift: String(classData.shift ?? existing?.shift ?? 'Manhã').trim().slice(0, 40),
    year: String(classData.year ?? existing?.year ?? '2026').trim().slice(0, 10),
    description: String(classData.description ?? existing?.description ?? '').trim().slice(0, 1000),
    subjects: Array.isArray(classData.subjects)
      ? classData.subjects.slice(0, 40)
      : (Array.isArray(existing?.subjects) ? existing.subjects : []),
    teacherIds: Array.isArray(classData.teacherIds)
      ? Array.from(new Set(classData.teacherIds)).slice(0, 30)
      : (Array.isArray(existing?.teacherIds) ? existing.teacherIds : []),
    teacherNames: Array.isArray(classData.teacherNames)
      ? classData.teacherNames.slice(0, 30)
      : (Array.isArray(existing?.teacherNames) ? existing.teacherNames : []),
    studentIds: Array.isArray(classData.studentIds)
      ? Array.from(new Set(classData.studentIds)).slice(0, 200)
      : (Array.isArray(existing?.studentIds) ? existing.studentIds : []),
    createdBy: String(existing?.createdBy || classData.createdBy || '').slice(0, 128),
    createdAt: existing?.createdAt || nowISO,
    updatedAt: nowISO,
  };
}

/**
 * Retorna apenas as turmas às quais o usuário tem direito de acesso:
 * - Admin: todas as turmas cadastradas.
 * - Professor: exclusivamente as turmas em que `uid in teacherIds`.
 * - Aluno: negado para gestão (lança erro se tentar usar via painel docente).
 */
export async function getAuthorizedClasses(actorUser) {
  assertStaff(actorUser);
  const uid = actorUser.uid || actorUser.id;

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.CLASSES, []);
    if (actorUser.role === 'admin') return all;
    return all.filter(c => Array.isArray(c.teacherIds) && c.teacherIds.includes(uid));
  }

  const classesCol = collection(db, 'classes');
  const q = actorUser.role === 'admin'
    ? classesCol
    : query(classesCol, where('teacherIds', 'array-contains', uid));

  const snap = await getDocs(q);
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/**
 * Cria uma nova turma oficial. Exclusivo para Administrador.
 */
export async function createClass(actorUser, classData) {
  assertAdmin(actorUser);
  if (!classData?.name || !String(classData.name).trim()) {
    throw new Error('O nome da turma é obrigatório.');
  }
  const uid = actorUser.uid || actorUser.id;
  const docObj = sanitizeClassDoc({
    ...classData,
    id: classData.id || generateId('turma'),
    createdBy: uid,
  });

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.CLASSES, []);
    all.push(docObj);
    saveLocal(LOCAL_KEYS.CLASSES, all);
    return docObj;
  }

  await setDoc(doc(db, 'classes', docObj.id), docObj);
  return docObj;
}

/**
 * Atualiza dados de uma turma.
 * - Admin pode atualizar qualquer turma (inclusive `teacherIds`).
 * - Professor autorizado na turma pode atualizar `studentIds`, `subjects` e `description`,
 *   mas NUNCA pode alterar `teacherIds` nem editar turmas de outros professores.
 */
export async function updateClass(actorUser, classId, updates) {
  assertStaff(actorUser);

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.CLASSES, []);
    const idx = all.findIndex(c => c.id === classId);
    if (idx === -1) throw new Error('Turma não encontrada.');
    const existing = all[idx];
    assertCanManageClass(actorUser, existing);

    if (actorUser.role !== 'admin' && updates.teacherIds) {
      throw new Error('Acesso negado: professores não podem alterar a lista de docentes da turma.');
    }

    const updated = sanitizeClassDoc(
      {
        ...existing,
        ...updates,
        teacherIds: actorUser.role === 'admin' ? (updates.teacherIds ?? existing.teacherIds) : existing.teacherIds,
      },
      existing
    );
    all[idx] = updated;
    saveLocal(LOCAL_KEYS.CLASSES, all);
    return updated;
  }

  const classRef = doc(db, 'classes', classId);
  const snap = await getDoc(classRef);
  if (!snap.exists()) throw new Error('Turma não encontrada.');
  const existing = { id: snap.id, ...snap.data() };
  assertCanManageClass(actorUser, existing);

  if (actorUser.role !== 'admin' && updates.teacherIds) {
    throw new Error('Acesso negado: professores não podem alterar a lista de docentes da turma.');
  }

  const updated = sanitizeClassDoc(
    {
      ...existing,
      ...updates,
      teacherIds: actorUser.role === 'admin' ? (updates.teacherIds ?? existing.teacherIds) : existing.teacherIds,
    },
    existing
  );
  await setDoc(classRef, updated);
  return updated;
}

/**
 * Exclui uma turma e suas subcoleções. Exclusivo para Administrador.
 */
export async function deleteClass(actorUser, classId) {
  assertAdmin(actorUser);

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.CLASSES, []);
    saveLocal(LOCAL_KEYS.CLASSES, all.filter(c => c.id !== classId));
    return true;
  }

  for (const sub of ['contents', 'activities', 'announcements']) {
    const snap = await getDocs(collection(db, 'classes', classId, sub));
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  }
  await deleteDoc(doc(db, 'classes', classId));
  return true;
}

// ─── 2. Estudantes Vinculados, Busca Segura (Admin SDK) e Acompanhamento ────

function normalizeSearchText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function callClassStudentsEndpoint(payload) {
  if (!auth?.currentUser) {
    throw new Error('Não autenticado: faça login novamente.');
  }
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch('/api/class-students', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    const err = new Error(data.error || 'Falha na operação segura de estudantes da turma.');
    err.statusCode = res.status;
    err.duplicateUids = data.duplicateUids;
    throw err;
  }
  return data;
}

/**
 * Executa localmente (para ambiente de testes sem servidor HTTP) a mesma validação
 * estrita do endpoint `/api/class-students`.
 */
function executeLocalClassStudentOperation(actorUser, { action, classId, queryText = '', studentIds = [], studentUid = null }) {
  if (!actorUser || !(actorUser.uid || actorUser.id)) {
    throw new Error('Não autenticado: token de acesso ausente ou inválido.');
  }
  assertStaff(actorUser);
  const callerUid = actorUser.uid || actorUser.id;

  if (action === 'delete-user' || action === 'delete-student') {
    assertAdmin(actorUser);
    const target = String(studentUid || (studentIds && studentIds[0]) || '').trim();
    if (!target) throw new Error('UID do usuário é obrigatório.');
    if (target === callerUid) {
      throw new Error('Você não pode excluir sua própria conta de administrador.');
    }
    const allUsers = loadLocal(LOCAL_KEYS.USERS, []);
    saveLocal(LOCAL_KEYS.USERS, allUsers.filter(u => (u.uid || u.id) !== target));

    const allClasses = loadLocal(LOCAL_KEYS.CLASSES, []);
    saveLocal(
      LOCAL_KEYS.CLASSES,
      allClasses.map(c => ({
        ...c,
        studentIds: (Array.isArray(c.studentIds) ? c.studentIds : []).filter(id => id !== target),
        teacherIds: (Array.isArray(c.teacherIds) ? c.teacherIds : []).filter(id => id !== target),
      }))
    );
    return { ok: true, deletedUid: target };
  }

  if (!classId || typeof classId !== 'string') {
    throw new Error('O identificador da turma (classId) é obrigatório.');
  }

  const allClasses = loadLocal(LOCAL_KEYS.CLASSES, []);
  const classIdx = allClasses.findIndex(c => c.id === classId);
  if (classIdx === -1) {
    throw new Error('Turma não encontrada.');
  }

  const classDoc = allClasses[classIdx];
  assertCanManageClass(actorUser, classDoc);

  const enrolledIds = Array.isArray(classDoc.studentIds) ? classDoc.studentIds : [];
  const enrolledSet = new Set(enrolledIds);
  const allUsers = loadLocal(LOCAL_KEYS.USERS, []);

  if (action === 'search') {
    const qNorm = normalizeSearchText(queryText);
    const students = allUsers
      .filter(u => {
        if ((u.role || 'aluno') !== 'aluno') return false;
        if (!qNorm) return true;
        return (
          normalizeSearchText(u.name).includes(qNorm) ||
          normalizeSearchText(u.email).includes(qNorm)
        );
      })
      .slice(0, 40)
      .map(u => ({
        uid: String(u.uid || u.id),
        name: String(u.name || 'Estudante'),
        email: String(u.email || ''),
        alreadyEnrolled: enrolledSet.has(String(u.uid || u.id)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { ok: true, students };
  }

  if (action === 'enroll') {
    const rawTargets = Array.isArray(studentIds) && studentIds.length > 0
      ? studentIds
      : studentUid
      ? [studentUid]
      : [];
    const uniqueRequested = Array.from(new Set(rawTargets.map(x => String(x || '').trim()).filter(Boolean)));
    if (uniqueRequested.length === 0) {
      throw new Error('Selecione ao menos um estudante para adicionar à turma.');
    }

    const toAddUids = [];
    const duplicateUids = [];
    const addedStudents = [];

    for (const targetUid of uniqueRequested) {
      const targetUser = allUsers.find(u => (u.uid || u.id) === targetUid);
      if (!targetUser) {
        throw new Error(`Estudante (${targetUid}) não encontrado na plataforma.`);
      }
      if ((targetUser.role || 'aluno') !== 'aluno') {
        throw new Error('Apenas contas com perfil de aluno podem ser matriculadas como estudantes na turma.');
      }
      if (enrolledSet.has(targetUid)) {
        duplicateUids.push(targetUid);
      } else {
        enrolledSet.add(targetUid);
        toAddUids.push(targetUid);
        addedStudents.push({
          uid: targetUid,
          name: String(targetUser.name || 'Estudante'),
          email: String(targetUser.email || ''),
        });
      }
    }

    if (toAddUids.length === 0) {
      const err = new Error(
        duplicateUids.length === 1
          ? 'Este estudante já está matriculado nesta turma.'
          : 'Os estudantes selecionados já estão matriculados nesta turma.'
      );
      err.statusCode = 409;
      err.duplicateUids = duplicateUids;
      throw err;
    }

    const nowISO = new Date().toISOString();
    const updatedStudentIds = Array.from(enrolledSet);
    allClasses[classIdx] = { ...classDoc, studentIds: updatedStudentIds, updatedAt: nowISO };
    saveLocal(LOCAL_KEYS.CLASSES, allClasses);

    const auditEntry = {
      id: generateId('log'),
      classId,
      className: classDoc.name || '',
      action: 'ADD_STUDENTS',
      actorUid: callerUid,
      actorName: actorUser.name || 'Docente',
      actorEmail: actorUser.email || '',
      actorRole: actorUser.role,
      addedStudentIds: toAddUids,
      addedStudents,
      skippedDuplicateIds: duplicateUids,
      createdAt: nowISO,
    };

    const allLogs = loadLocal(LOCAL_KEYS.CLASS_AUDIT_LOGS, {});
    allLogs[classId] = [auditEntry, ...(allLogs[classId] || [])];
    saveLocal(LOCAL_KEYS.CLASS_AUDIT_LOGS, allLogs);

    return {
      ok: true,
      classId,
      studentIds: updatedStudentIds,
      addedStudentIds: toAddUids,
      addedStudents,
      skippedDuplicateIds: duplicateUids,
      auditLog: auditEntry,
    };
  }

  if (action === 'unenroll') {
    const targetUid = String(studentUid || (studentIds && studentIds[0]) || '').trim();
    if (!targetUid) throw new Error('Informe o estudante a ser removido da turma.');
    if (!enrolledSet.has(targetUid)) throw new Error('Este estudante não faz parte desta turma.');

    const targetUser = allUsers.find(u => (u.uid || u.id) === targetUid);
    enrolledSet.delete(targetUid);
    const nowISO = new Date().toISOString();
    const updatedStudentIds = Array.from(enrolledSet);
    allClasses[classIdx] = { ...classDoc, studentIds: updatedStudentIds, updatedAt: nowISO };
    saveLocal(LOCAL_KEYS.CLASSES, allClasses);

    const auditEntry = {
      id: generateId('log'),
      classId,
      className: classDoc.name || '',
      action: 'REMOVE_STUDENT',
      actorUid: callerUid,
      actorName: actorUser.name || 'Docente',
      actorEmail: actorUser.email || '',
      actorRole: actorUser.role,
      removedStudentId: targetUid,
      removedStudentName: targetUser?.name || 'Estudante',
      removedStudentEmail: targetUser?.email || '',
      createdAt: nowISO,
    };

    const allLogs = loadLocal(LOCAL_KEYS.CLASS_AUDIT_LOGS, {});
    allLogs[classId] = [auditEntry, ...(allLogs[classId] || [])];
    saveLocal(LOCAL_KEYS.CLASS_AUDIT_LOGS, allLogs);

    return {
      ok: true,
      classId,
      studentIds: updatedStudentIds,
      removedStudentId: targetUid,
      auditLog: auditEntry,
    };
  }

  if (action === 'auditLogs') {
    const allLogs = loadLocal(LOCAL_KEYS.CLASS_AUDIT_LOGS, {});
    return {
      ok: true,
      logs: allLogs[classId] || [],
    };
  }

  throw new Error(`Ação inválida: ${action}`);
}

/**
 * Pesquisa estudantes cadastrados (somente `role === 'aluno'`).
 * Consulta diretamente o Cloud Firestore (`/users`) respeitando o isolamento do perfil,
 * e retorna APENAS `{ uid, name, email, alreadyEnrolled }` — sem expor preferências AEE,
 * dados pessoais sensíveis ou registros acadêmicos de alunos fora da turma.
 */
export async function searchStudentsForClass(actorUser, classId, queryText = '') {
  if (!db) {
    const res = executeLocalClassStudentOperation(actorUser, {
      action: 'search',
      classId,
      queryText,
    });
    return res.students;
  }

  assertStaff(actorUser);

  try {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'aluno')));
    const classRef = doc(db, 'classes', classId);
    const classSnap = await getDoc(classRef);
    const enrolledSet = new Set(
      classSnap.exists() && Array.isArray(classSnap.data().studentIds)
        ? classSnap.data().studentIds
        : []
    );
    const qNorm = normalizeSearchText(queryText);

    return snap.docs
      .map(d => {
        const data = d.data();
        return {
          uid: d.id,
          name: data.name || 'Estudante',
          email: data.email || '',
          alreadyEnrolled: enrolledSet.has(d.id),
        };
      })
      .filter(u => {
        if (!qNorm) return true;
        return (
          normalizeSearchText(u.name).includes(qNorm) ||
          normalizeSearchText(u.email).includes(qNorm)
        );
      })
      .slice(0, 40)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (directErr) {
    console.warn('[TeacherService] Consulta direta no Firestore falhou. Tentando endpoint alternativo:', directErr?.message);
    try {
      const res = await callClassStudentsEndpoint({
        action: 'search',
        classId,
        query: queryText,
      });
      return res.students || [];
    } catch {
      return [];
    }
  }
}

/**
 * Executa matrícula de estudantes diretamente no Cloud Firestore,
 * cumprindo integralmente as regras do Firestore (`firestore.rules`).
 */
async function executeDirectFirestoreEnroll(actorUser, classId, studentIds) {
  if (!classId || typeof classId !== 'string') {
    throw new Error('O identificador da turma (classId) é obrigatório.');
  }
  const rawTargets = Array.isArray(studentIds) ? studentIds : [studentIds];
  const uniqueRequested = Array.from(new Set(rawTargets.map(x => String(x || '').trim()).filter(Boolean)));
  if (uniqueRequested.length === 0) {
    throw new Error('Selecione ao menos um estudante para adicionar à turma.');
  }

  const classRef = doc(db, 'classes', classId);
  const snap = await getDoc(classRef);
  if (!snap.exists()) throw new Error('Turma não encontrada.');
  const classDoc = { id: snap.id, ...snap.data() };

  assertCanManageClass(actorUser, classDoc);

  const enrolledIds = Array.isArray(classDoc.studentIds) ? classDoc.studentIds : [];
  const enrolledSet = new Set(enrolledIds);
  const toAddUids = [];
  const duplicateUids = [];
  const addedStudentsMeta = [];

  for (const targetUid of uniqueRequested) {
    if (enrolledSet.has(targetUid)) {
      duplicateUids.push(targetUid);
      continue;
    }

    let targetName = 'Estudante';
    let targetEmail = '';
    try {
      const uRef = doc(db, 'users', targetUid);
      const uSnap = await getDoc(uRef);
      if (uSnap.exists()) {
        const uData = uSnap.data();
        if ((uData.role || 'aluno') !== 'aluno') {
          throw new Error('Apenas contas com perfil de aluno podem ser matriculadas como estudantes na turma.');
        }
        targetName = uData.name || 'Estudante';
        targetEmail = uData.email || '';
      }
    } catch (e) {
      if (e.message && e.message.includes('Apenas contas com perfil de aluno')) {
        throw e;
      }
    }

    enrolledSet.add(targetUid);
    toAddUids.push(targetUid);
    addedStudentsMeta.push({
      uid: targetUid,
      name: targetName,
      email: targetEmail,
    });
  }

  if (toAddUids.length === 0) {
    const err = new Error(
      duplicateUids.length === 1
        ? 'Este estudante já está matriculado nesta turma.'
        : 'Os estudantes selecionados já estão matriculados nesta turma.'
    );
    err.duplicateUids = duplicateUids;
    throw err;
  }

  const nowISO = new Date().toISOString();
  const updatedStudentIds = Array.from(enrolledSet);
  const updatedClass = sanitizeClassDoc(
    {
      ...classDoc,
      studentIds: updatedStudentIds,
      updatedAt: nowISO,
    },
    classDoc
  );
  await setDoc(classRef, updatedClass);

  for (const uid of toAddUids) {
    try {
      const uRef = doc(db, 'users', uid);
      const uSnap = await getDoc(uRef);
      if (uSnap.exists()) {
        const existingEnrolled = Array.isArray(uSnap.data().enrolledClassIds) ? uSnap.data().enrolledClassIds : [];
        const nextEnrolled = Array.from(new Set([...existingEnrolled, classId]));
        await updateDoc(uRef, { enrolledClassIds: nextEnrolled, updatedAt: nowISO });
      }
    } catch (e) {
      console.warn('[TeacherService] Falha ao atualizar enrolledClassIds do estudante:', uid, e?.message);
    }
  }

  const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const callerUid = actorUser.uid || actorUser.id;
  const auditEntry = {
    id: logId,
    classId,
    className: String(classDoc.name || ''),
    action: 'ADD_STUDENTS',
    actorUid: callerUid,
    actorName: String(actorUser.name || 'Docente'),
    actorEmail: String(actorUser.email || ''),
    actorRole: actorUser.role || 'professor',
    addedStudentIds: toAddUids,
    addedStudents: addedStudentsMeta,
    skippedDuplicateIds: duplicateUids,
    createdAt: nowISO,
  };

  try {
    await setDoc(doc(db, 'classes', classId, 'auditLogs', logId), auditEntry);
  } catch (e) {
    console.warn('[TeacherService] Falha ao gravar log de auditoria no Firestore:', e?.message);
  }

  return {
    ok: true,
    classId,
    studentIds: updatedStudentIds,
    addedStudentIds: toAddUids,
    addedStudents: addedStudentsMeta,
    skippedDuplicateIds: duplicateUids,
    auditLog: auditEntry,
  };
}

/**
 * Executa desvinculação de estudante diretamente no Cloud Firestore,
 * cumprindo integralmente as regras do Firestore (`firestore.rules`).
 */
async function executeDirectFirestoreUnenroll(actorUser, classId, studentUid) {
  if (!classId || typeof classId !== 'string') {
    throw new Error('O identificador da turma (classId) é obrigatório.');
  }
  const targetUid = String(studentUid || '').trim();
  if (!targetUid) {
    throw new Error('Informe o estudante a ser removido da turma.');
  }

  const classRef = doc(db, 'classes', classId);
  const snap = await getDoc(classRef);
  if (!snap.exists()) throw new Error('Turma não encontrada.');
  const classDoc = { id: snap.id, ...snap.data() };

  assertCanManageClass(actorUser, classDoc);

  const enrolledIds = Array.isArray(classDoc.studentIds) ? classDoc.studentIds : [];
  if (!enrolledIds.includes(targetUid)) {
    throw new Error('Este estudante não faz parte desta turma.');
  }

  const updatedStudentIds = enrolledIds.filter(id => id !== targetUid);
  const nowISO = new Date().toISOString();

  // 1. Atualizar a turma removendo o estudante da lista
  const updatedClass = sanitizeClassDoc(
    {
      ...classDoc,
      studentIds: updatedStudentIds,
      updatedAt: nowISO,
    },
    classDoc
  );
  await setDoc(classRef, updatedClass);

  // 2. Atualizar enrolledClassIds no perfil do estudante se acessível
  let targetUserName = 'Estudante';
  let targetUserEmail = '';
  try {
    const userRef = doc(db, 'users', targetUid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const uData = userSnap.data();
      targetUserName = uData.name || 'Estudante';
      targetUserEmail = uData.email || '';
      const existingEnrolled = Array.isArray(uData.enrolledClassIds) ? uData.enrolledClassIds : [];
      if (existingEnrolled.includes(classId)) {
        await updateDoc(userRef, {
          enrolledClassIds: existingEnrolled.filter(id => id !== classId),
          updatedAt: nowISO,
        });
      }
    }
  } catch (uErr) {
    console.warn('[TeacherService] Aviso ao desvincular enrolledClassIds do estudante:', uErr?.message);
  }

  // 3. Registrar auditoria na subcoleção da turma
  const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const callerUid = actorUser.uid || actorUser.id;
  const auditEntry = {
    id: logId,
    classId,
    className: String(classDoc.name || ''),
    action: 'REMOVE_STUDENT',
    actorUid: callerUid,
    actorName: String(actorUser.name || 'Docente'),
    actorEmail: String(actorUser.email || ''),
    actorRole: actorUser.role || 'professor',
    removedStudentId: targetUid,
    removedStudentName: targetUserName,
    removedStudentEmail: targetUserEmail,
    createdAt: nowISO,
  };

  try {
    await setDoc(doc(db, 'classes', classId, 'auditLogs', logId), auditEntry);
  } catch (auditErr) {
    console.warn('[TeacherService] Aviso ao registrar log de auditoria no Firestore:', auditErr?.message);
  }

  return {
    ok: true,
    classId,
    studentIds: updatedStudentIds,
    removedStudentId: targetUid,
    auditLog: auditEntry,
  };
}

/**
 * Adiciona um ou mais estudantes a uma turma via Firestore, validando vínculo do professor,
 * impedindo matrículas duplicadas e registrando auditoria.
 */
export async function addStudentsToClass(actorUser, classId, studentIds) {
  const ids = Array.isArray(studentIds) ? studentIds : [studentIds];
  if (!db) {
    return executeLocalClassStudentOperation(actorUser, {
      action: 'enroll',
      classId,
      studentIds: ids,
    });
  }

  assertStaff(actorUser);
  return executeDirectFirestoreEnroll(actorUser, classId, ids);
}

/**
 * Remove um estudante vinculado de uma turma via Firestore e registra a operação
 * no log de auditoria da turma.
 */
export async function removeStudentFromClass(actorUser, classId, studentUid) {
  if (!db) {
    return executeLocalClassStudentOperation(actorUser, {
      action: 'unenroll',
      classId,
      studentUid,
    });
  }

  assertStaff(actorUser);
  return executeDirectFirestoreUnenroll(actorUser, classId, studentUid);
}

/**
 * Consulta o histórico de matrículas e remoções (autoria e data/hora) de uma turma.
 */
export async function getClassAuditLogs(actorUser, classId) {
  if (!db) {
    const res = executeLocalClassStudentOperation(actorUser, {
      action: 'auditLogs',
      classId,
    });
    return res.logs;
  }

  assertStaff(actorUser);
  try {
    const snap = await getDocs(collection(db, 'classes', classId, 'auditLogs'));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 30);
  } catch {
    return [];
  }
}

/**
 * Lista todos os usuários cadastrados no sistema (`/users`).
 * Restrito EXCLUSIVAMENTE a Administradores (`assertAdmin`) para gestão de perfis
 * e atribuição de docentes. Professores não possuem listagem irrestrita de `/users`.
 */
export async function getAllRegisteredUsers(actorUser) {
  assertAdmin(actorUser);

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.USERS, []);
    return all.map(({ password: _p, ...u }) => ({
      ...u,
      uid: u.uid || u.id,
      role: u.role || 'aluno',
      assignedClassIds: u.assignedClassIds || [],
      enrolledClassIds: u.enrolledClassIds || [],
    }));
  }

  const snap = await getDocs(collection(db, 'users'));
  return snap.docs
    .map(d => ({ id: d.id, uid: d.id, ...d.data() }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/**
 * Busca os dados reais de desempenho acadêmico (tarefas concluídas, pendentes,
 * minutos de foco, sequência e XP) dos estudantes vinculados a uma turma específica.
 * Não inventa alunos nem números: se não houver estudantes vinculados, retorna `[]`.
 */
export async function getClassStudentsAcademicProgress(actorUser, classObj) {
  assertCanManageClass(actorUser, classObj);
  const studentIds = Array.isArray(classObj.studentIds) ? classObj.studentIds : [];
  if (studentIds.length === 0) return [];

  if (!db) {
    const allUsers = loadLocal(LOCAL_KEYS.USERS, []);
    return studentIds
      .map(sid => {
        const u = allUsers.find(x => (x.uid || x.id) === sid);
        if (!u) return null;
        const tasks = DataService.getTasks(sid);
        const sessions = DataService.getFocusSessions(sid);
        const gamification = DataService.getGamification(sid);
        const completedCount = tasks.filter(t => t.status === 'completed').length;
        const pendingCount = tasks.filter(t => t.status !== 'completed').length;
        const focusMinutes = sessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);
        return {
          uid: sid,
          name: u.name || 'Estudante',
          email: u.email || '',
          tasksCompleted: completedCount,
          tasksPending: pendingCount,
          focusMinutes,
          streakDays: gamification.streakDays || 0,
          points: gamification.points || 0,
          lastActiveDate: gamification.lastActiveDate || null,
        };
      })
      .filter(Boolean);
  }

  const results = [];
  for (const sid of studentIds) {
    try {
      const userSnap = await getDoc(doc(db, 'users', sid));
      if (!userSnap.exists()) continue;
      const u = userSnap.data();

      const [tasksSnap, focusSnap, gamificationSnap] = await Promise.all([
        getDocs(collection(db, 'users', sid, 'tasks')),
        getDocs(collection(db, 'users', sid, 'focusSessions')),
        getDoc(doc(db, 'users', sid, 'appdata', 'gamification')),
      ]);

      const tasks = tasksSnap.docs.map(d => d.data());
      const sessions = focusSnap.docs.map(d => d.data());
      const gamification = gamificationSnap.exists() ? gamificationSnap.data() : {};

      const tasksCompleted = tasks.filter(t => t.status === 'completed').length;
      const tasksPending = tasks.filter(t => t.status !== 'completed').length;
      const focusMinutes = sessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);

      results.push({
        uid: sid,
        name: u.name || 'Estudante',
        email: u.email || '',
        tasksCompleted,
        tasksPending,
        focusMinutes,
        streakDays: Number(gamification.streakDays) || 0,
        points: Number(gamification.points) || 0,
        lastActiveDate: gamification.lastActiveDate || null,
      });
    } catch (err) {
      console.warn(`[TeacherService] Erro ao ler métricas do estudante ${sid}:`, err);
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

// ─── 3. Conteúdos por Disciplina (/classes/{classId}/contents) ───────────────

export async function getClassContents(actorUser, classObj) {
  assertCanManageClass(actorUser, classObj);

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.CLASS_CONTENTS, {});
    return all[classObj.id] || [];
  }

  const snap = await getDocs(collection(db, 'classes', classObj.id, 'contents'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function createClassContent(actorUser, classObj, contentData) {
  assertCanManageClass(actorUser, classObj);
  if (!contentData?.title?.trim()) throw new Error('O título do conteúdo é obrigatório.');
  if (!contentData?.subject?.trim()) throw new Error('Selecione a disciplina.');

  const nowISO = new Date().toISOString();
  const item = {
    id: generateId('cnt'),
    classId: classObj.id,
    title: String(contentData.title).trim().slice(0, 200),
    subject: normalizeLegacySubjectName(contentData.subject).slice(0, 120),
    description: String(contentData.description || '').trim().slice(0, 2000),
    resourceUrl: String(contentData.resourceUrl || '').trim().slice(0, 500),
    authorId: String(actorUser.uid || actorUser.id).slice(0, 128),
    authorName: String(actorUser.name || 'Professor').slice(0, 120),
    createdAt: nowISO,
    updatedAt: nowISO,
  };

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.CLASS_CONTENTS, {});
    all[classObj.id] = [item, ...(all[classObj.id] || [])];
    saveLocal(LOCAL_KEYS.CLASS_CONTENTS, all);
    return item;
  }

  await setDoc(doc(db, 'classes', classObj.id, 'contents', item.id), item);
  return item;
}

export async function deleteClassContent(actorUser, classObj, contentId) {
  assertCanManageClass(actorUser, classObj);

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.CLASS_CONTENTS, {});
    all[classObj.id] = (all[classObj.id] || []).filter(x => x.id !== contentId);
    saveLocal(LOCAL_KEYS.CLASS_CONTENTS, all);
    return true;
  }

  await deleteDoc(doc(db, 'classes', classObj.id, 'contents', contentId));
  return true;
}

// ─── 4. Publicação de Atividades (/classes/{classId}/activities) ─────────────

export async function getClassActivities(actorUser, classObj) {
  assertCanManageClass(actorUser, classObj);

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.CLASS_ACTIVITIES, {});
    return all[classObj.id] || [];
  }

  const snap = await getDocs(collection(db, 'classes', classObj.id, 'activities'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
}

export async function createClassActivity(actorUser, classObj, activityData) {
  assertCanManageClass(actorUser, classObj);
  if (!activityData?.title?.trim()) throw new Error('O título da atividade é obrigatório.');
  if (!activityData?.subject?.trim()) throw new Error('Selecione a disciplina.');

  const nowISO = new Date().toISOString();
  const item = {
    id: generateId('act'),
    classId: classObj.id,
    title: String(activityData.title).trim().slice(0, 200),
    subject: normalizeLegacySubjectName(activityData.subject).slice(0, 120),
    type: String(activityData.type || 'Atividade').trim().slice(0, 40),
    dueDate: String(activityData.dueDate || '').trim().slice(0, 30),
    points: Math.max(0, Math.min(100, Number(activityData.points) || 10)),
    description: String(activityData.description || '').trim().slice(0, 2000),
    authorId: String(actorUser.uid || actorUser.id).slice(0, 128),
    authorName: String(actorUser.name || 'Professor').slice(0, 120),
    createdAt: nowISO,
    updatedAt: nowISO,
  };

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.CLASS_ACTIVITIES, {});
    all[classObj.id] = [item, ...(all[classObj.id] || [])];
    saveLocal(LOCAL_KEYS.CLASS_ACTIVITIES, all);
    return item;
  }

  await setDoc(doc(db, 'classes', classObj.id, 'activities', item.id), item);
  return item;
}

export async function deleteClassActivity(actorUser, classObj, activityId) {
  assertCanManageClass(actorUser, classObj);

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.CLASS_ACTIVITIES, {});
    all[classObj.id] = (all[classObj.id] || []).filter(x => x.id !== activityId);
    saveLocal(LOCAL_KEYS.CLASS_ACTIVITIES, all);
    return true;
  }

  await deleteDoc(doc(db, 'classes', classObj.id, 'activities', activityId));
  return true;
}

// ─── 5. Comunicados da Turma (/classes/{classId}/announcements) ──────────────

export async function getClassAnnouncements(actorUser, classObj) {
  assertCanManageClass(actorUser, classObj);

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.CLASS_ANNOUNCEMENTS, {});
    return all[classObj.id] || [];
  }

  const snap = await getDocs(collection(db, 'classes', classObj.id, 'announcements'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function createClassAnnouncement(actorUser, classObj, announcementData) {
  assertCanManageClass(actorUser, classObj);
  if (!announcementData?.title?.trim()) throw new Error('O título do comunicado é obrigatório.');
  if (!announcementData?.message?.trim()) throw new Error('A mensagem do comunicado é obrigatória.');

  const nowISO = new Date().toISOString();
  const item = {
    id: generateId('ann'),
    classId: classObj.id,
    title: String(announcementData.title).trim().slice(0, 200),
    message: String(announcementData.message).trim().slice(0, 3000),
    priority: ['normal', 'important', 'urgent'].includes(announcementData.priority)
      ? announcementData.priority
      : 'normal',
    authorId: String(actorUser.uid || actorUser.id).slice(0, 128),
    authorName: String(actorUser.name || 'Professor').slice(0, 120),
    createdAt: nowISO,
    updatedAt: nowISO,
  };

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.CLASS_ANNOUNCEMENTS, {});
    all[classObj.id] = [item, ...(all[classObj.id] || [])];
    saveLocal(LOCAL_KEYS.CLASS_ANNOUNCEMENTS, all);
    return item;
  }

  await setDoc(doc(db, 'classes', classObj.id, 'announcements', item.id), item);
  return item;
}

export async function deleteClassAnnouncement(actorUser, classObj, announcementId) {
  assertCanManageClass(actorUser, classObj);

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.CLASS_ANNOUNCEMENTS, {});
    all[classObj.id] = (all[classObj.id] || []).filter(x => x.id !== announcementId);
    saveLocal(LOCAL_KEYS.CLASS_ANNOUNCEMENTS, all);
    return true;
  }

  await deleteDoc(doc(db, 'classes', classObj.id, 'announcements', announcementId));
  return true;
}

// ─── 5.1 Materiais e Arquivos PDFs da Turma (/classes/{classId}/materials) ────

export async function getClassMaterials(actorUser, classObj) {
  assertCanManageClass(actorUser, classObj);

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.CLASS_MATERIALS, {});
    return all[classObj.id] || [];
  }

  const snap = await getDocs(collection(db, 'classes', classObj.id, 'materials'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function createClassMaterial(actorUser, classObj, materialData) {
  assertCanManageClass(actorUser, classObj);
  if (!materialData?.title?.trim()) throw new Error('O título do material é obrigatório.');
  if (!materialData?.subject?.trim()) throw new Error('Selecione a disciplina.');

  const nowISO = new Date().toISOString();
  const fileBase64 = String(materialData.fileBase64 || '');
  const fileName = String(materialData.fileName || 'documento.pdf').trim().slice(0, 255);
  const fileSize = Number(materialData.fileSize) || 0;
  const fileType = String(materialData.fileType || 'application/pdf').slice(0, 100);

  // Dividir o base64 em partes (chunks) de até 500.000 caracteres (dentro do limite Firestore)
  const CHUNK_SIZE = 500000;
  const chunks = [];
  if (fileBase64) {
    for (let i = 0; i < fileBase64.length; i += CHUNK_SIZE) {
      chunks.push({
        id: `chunk-${chunks.length}`,
        chunkIndex: chunks.length,
        data: fileBase64.slice(i, i + CHUNK_SIZE),
        createdAt: nowISO,
      });
    }
  }

  if (chunks.length > 50) {
    throw new Error('O arquivo excede o limite máximo suportado (máx. 50 partes ~15MB).');
  }

  const item = {
    id: generateId('mat'),
    classId: classObj.id,
    title: String(materialData.title).trim().slice(0, 200),
    subject: normalizeLegacySubjectName(materialData.subject).slice(0, 120),
    description: String(materialData.description || '').trim().slice(0, 3000),
    fileName,
    fileSize,
    fileType,
    totalChunks: chunks.length,
    url: String(materialData.url || '').trim().slice(0, 1000),
    authorId: String(actorUser.uid || actorUser.id).slice(0, 128),
    authorName: String(actorUser.name || 'Professor').slice(0, 120),
    createdAt: nowISO,
    updatedAt: nowISO,
  };

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.CLASS_MATERIALS, {});
    all[classObj.id] = [item, ...(all[classObj.id] || [])];
    saveLocal(LOCAL_KEYS.CLASS_MATERIALS, all);

    const allChunks = loadLocal(LOCAL_KEYS.CLASS_MATERIAL_CHUNKS, {});
    allChunks[item.id] = chunks;
    saveLocal(LOCAL_KEYS.CLASS_MATERIAL_CHUNKS, allChunks);
    return item;
  }

  // Se houver chunks, envia em lote para a subcoleção
  if (chunks.length > 0) {
    await Promise.all(
      chunks.map(chunk =>
        setDoc(
          doc(db, 'classes', classObj.id, 'materials', item.id, 'chunks', chunk.id),
          chunk
        )
      )
    );
  }

  // Grava o documento principal de metadados do material
  await setDoc(doc(db, 'classes', classObj.id, 'materials', item.id), item);
  return item;
}

export async function deleteClassMaterial(actorUser, classObj, materialId) {
  assertCanManageClass(actorUser, classObj);

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.CLASS_MATERIALS, {});
    all[classObj.id] = (all[classObj.id] || []).filter(x => x.id !== materialId);
    saveLocal(LOCAL_KEYS.CLASS_MATERIALS, all);

    const allChunks = loadLocal(LOCAL_KEYS.CLASS_MATERIAL_CHUNKS, {});
    delete allChunks[materialId];
    saveLocal(LOCAL_KEYS.CLASS_MATERIAL_CHUNKS, allChunks);
    return true;
  }

  const chunksSnap = await getDocs(
    collection(db, 'classes', classObj.id, 'materials', materialId, 'chunks')
  );
  await Promise.all(chunksSnap.docs.map(d => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'classes', classObj.id, 'materials', materialId));
  return true;
}

export async function downloadClassMaterial(actorUser, classId, materialId) {
  const cId = typeof classId === 'object' && classId?.id ? classId.id : classId;
  if (!db) {
    const allChunks = loadLocal(LOCAL_KEYS.CLASS_MATERIAL_CHUNKS, {});
    const chunks = (allChunks[materialId] || []).sort((a, b) => a.chunkIndex - b.chunkIndex);
    const base64 = chunks.map(c => c.data).join('');
    return {
      base64,
      dataUrl: base64 ? `data:application/pdf;base64,${base64}` : null,
    };
  }

  const chunksSnap = await getDocs(
    collection(db, 'classes', cId, 'materials', materialId, 'chunks')
  );
  const chunks = chunksSnap.docs
    .map(d => d.data())
    .sort((a, b) => a.chunkIndex - b.chunkIndex);

  const base64 = chunks.map(c => c.data).join('');
  return {
    base64,
    dataUrl: base64 ? `data:application/pdf;base64,${base64}` : null,
  };
}

// ─── 6. Controle Administrativo de Perfis, Permissões e Convites ─────────────

/**
 * Altera o papel (`aluno` | `professor` | `admin`) de um usuário existente.
 * Exclusivo para Administrador (`assertAdmin`).
 * Um professor NUNCA consegue alterar suas próprias permissões ou promover terceiros.
 */
export async function updateUserRoleByAdmin(adminUser, targetUid, newRole) {
  assertAdmin(adminUser);
  if (!['aluno', 'professor', 'admin'].includes(newRole)) {
    throw new Error('Perfil inválido. Use aluno, professor ou admin.');
  }
  if (!targetUid) throw new Error('UID do usuário é obrigatório.');

  const nowISO = new Date().toISOString();

  if (!db) {
    const users = loadLocal(LOCAL_KEYS.USERS, []);
    const idx = users.findIndex(u => (u.uid || u.id) === targetUid);
    if (idx === -1) throw new Error('Usuário não encontrado.');
    users[idx] = { ...users[idx], role: newRole, updatedAt: nowISO };
    saveLocal(LOCAL_KEYS.USERS, users);
    return users[idx];
  }

  const userRef = doc(db, 'users', targetUid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('Usuário não encontrado no Firestore.');
  const existing = snap.data();

  const updated = {
    ...existing,
    id: existing.id || targetUid,
    uid: targetUid,
    role: newRole,
    updatedAt: nowISO,
  };
  await setDoc(userRef, updated);
  return updated;
}

/**
 * Exclui permanentemente uma conta de usuário (aluno, professor ou qualquer outro) do sistema.
 * Exclusivo para Administrador (`assertAdmin`).
 * Um administrador NUNCA pode excluir sua própria conta de administrador.
 * Remove o usuário de todas as turmas (`studentIds` e `teacherIds`) e exclui o documento `/users/{targetUid}`.
 * Também tenta excluir a credencial no Firebase Auth via endpoint seguro quando disponível.
 */
export async function deleteUserAccountByAdmin(adminUser, targetUid) {
  assertAdmin(adminUser);
  if (!targetUid) throw new Error('UID do usuário é obrigatório.');

  const adminUid = adminUser.uid || adminUser.id;
  if (targetUid === adminUid) {
    throw new Error('Você não pode excluir sua própria conta de administrador.');
  }

  // Fallback para execução local (ambiente de testes ou sem Firebase inicializado)
  if (!db) {
    return executeLocalClassStudentOperation(adminUser, {
      action: 'delete-user',
      studentUid: targetUid,
      classId: 'global',
    });
  }

  // Tenta acionar a função serverless com Firebase Admin SDK para remoção do Firebase Auth
  try {
    if (auth?.currentUser) {
      await callClassStudentsEndpoint({
        action: 'delete-user',
        studentUid: targetUid,
      });
    }
  } catch (apiErr) {
    console.warn('Endpoint seguro não concluído ou indisponível, prosseguindo com exclusão no Firestore:', apiErr?.message);
  }

  // 1. Desvincular das turmas no Firestore
  try {
    const classesSnap = await getDocs(collection(db, 'classes'));
    const updates = [];
    classesSnap.forEach(classDoc => {
      const data = classDoc.data();
      const sIds = Array.isArray(data.studentIds) ? data.studentIds : [];
      const tIds = Array.isArray(data.teacherIds) ? data.teacherIds : [];
      if (sIds.includes(targetUid) || tIds.includes(targetUid)) {
        updates.push(
          updateDoc(doc(db, 'classes', classDoc.id), {
            studentIds: sIds.filter(id => id !== targetUid),
            teacherIds: tIds.filter(id => id !== targetUid),
            updatedAt: new Date().toISOString(),
          })
        );
      }
    });
    if (updates.length > 0) {
      await Promise.all(updates);
    }
  } catch (classErr) {
    console.warn('Erro ao atualizar turmas durante exclusão:', classErr?.message);
  }

  // 2. Excluir o documento do usuário em /users/{targetUid}
  const userRef = doc(db, 'users', targetUid);
  await deleteDoc(userRef);

  return { ok: true, deletedUid: targetUid };
}

/**
 * Cria um convite individual de uso único e com prazo de validade para futuro professor.
 * O código em texto puro só é retornado no momento da geração para o Administrador enviar
 * ao docente; no banco (`/teacherInvites`), armazena-se apenas o hash SHA-256 (`codeHash`).
 */
export async function createTeacherInviteByAdmin(adminUser, {
  targetEmail,
  assignedClassIds = [],
  expiresInDays = 7,
} = {}) {
  assertAdmin(adminUser);
  if (!targetEmail || !/\S+@\S+\.\S+/.test(targetEmail)) {
    throw new Error('Informe o e-mail institucional ou pessoal do professor convidado.');
  }

  const rawSegmentA = Math.random().toString(36).slice(2, 6).toUpperCase();
  const rawSegmentB = Math.random().toString(36).slice(2, 6).toUpperCase();
  const plainCode = `CETEP-DOC-${rawSegmentA}-${rawSegmentB}`;
  const codeHash = await hashPassword(plainCode);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + Math.max(1, Number(expiresInDays) || 7) * 86400000).toISOString();
  const nowISO = now.toISOString();

  const inviteDoc = {
    id: generateId('inv'),
    codePreview: `CETEP-DOC-${rawSegmentA}-****`,
    codeHash,
    targetEmail: targetEmail.trim().toLowerCase().slice(0, 254),
    assignedClassIds: Array.isArray(assignedClassIds) ? assignedClassIds.slice(0, 20) : [],
    createdBy: String(adminUser.uid || adminUser.id).slice(0, 128),
    createdByName: String(adminUser.name || 'Administrador').slice(0, 120),
    expiresAt,
    used: false,
    usedByUid: null,
    usedAt: null,
    revoked: false,
    createdAt: nowISO,
    updatedAt: nowISO,
  };

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.TEACHER_INVITES, []);
    all.unshift(inviteDoc);
    saveLocal(LOCAL_KEYS.TEACHER_INVITES, all);
    return { invite: inviteDoc, plainCode };
  }

  await setDoc(doc(db, 'teacherInvites', inviteDoc.id), inviteDoc);
  return { invite: inviteDoc, plainCode };
}

export async function getTeacherInvitesByAdmin(adminUser) {
  assertAdmin(adminUser);

  if (!db) {
    return loadLocal(LOCAL_KEYS.TEACHER_INVITES, []);
  }

  const snap = await getDocs(collection(db, 'teacherInvites'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function revokeTeacherInviteByAdmin(adminUser, inviteId) {
  assertAdmin(adminUser);

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.TEACHER_INVITES, []);
    saveLocal(LOCAL_KEYS.TEACHER_INVITES, all.filter(i => i.id !== inviteId));
    return true;
  }

  await deleteDoc(doc(db, 'teacherInvites', inviteId));
  return true;
}

// ─── 7. Consulta de Publicações e Resultados na Área do Estudante ────────────

/**
 * Retorna todas as turmas em que o estudante está matriculado (`uid in studentIds`)
 * e consolida os conteúdos, atividades e comunicados publicados pelos professores
 * daquelas turmas, além das atividades individuais, notas e feedbacks publicados
 * para o próprio estudante.
 *
 * Isolamento garantido:
 * - O aluno recebe EXCLUSIVAMENTE publicações das turmas nas quais está matriculado.
 * - Observações internas de professores (`/studentInternalNotes`) NUNCA são consultadas
 *   nem retornadas nesta função.
 */
export async function getStudentEnrolledClassesFeed(studentUser) {
  if (!studentUser || !(studentUser.uid || studentUser.id)) {
    return {
      enrolledClasses: [],
      contents: [],
      activities: [],
      announcements: [],
      materials: [],
      individualActivities: [],
      academicRecords: [],
      pedagogicalFeedbacks: [],
    };
  }
  const studentUid = String(studentUser.uid || studentUser.id);

  if (!db) {
    const allClasses = loadLocal(LOCAL_KEYS.CLASSES, []);
    const enrolledClasses = allClasses.filter(
      c => Array.isArray(c.studentIds) && c.studentIds.includes(studentUid)
    );

    const allContentsMap = loadLocal(LOCAL_KEYS.CLASS_CONTENTS, {});
    const allActivitiesMap = loadLocal(LOCAL_KEYS.CLASS_ACTIVITIES, {});
    const allAnnouncementsMap = loadLocal(LOCAL_KEYS.CLASS_ANNOUNCEMENTS, {});
    const allMaterialsMap = loadLocal(LOCAL_KEYS.CLASS_MATERIALS, {});

    const contents = [];
    const activities = [];
    const announcements = [];
    const materials = [];

    for (const cls of enrolledClasses) {
      for (const cnt of allContentsMap[cls.id] || []) {
        contents.push({
          ...cnt,
          subject: normalizeLegacySubjectName(cnt.subject),
          classId: cls.id,
          className: cls.name,
        });
      }
      for (const act of allActivitiesMap[cls.id] || []) {
        activities.push({
          ...act,
          subject: normalizeLegacySubjectName(act.subject),
          classId: cls.id,
          className: cls.name,
        });
      }
      for (const ann of allAnnouncementsMap[cls.id] || []) {
        announcements.push({
          ...ann,
          classId: cls.id,
          className: cls.name,
        });
      }
      for (const mat of allMaterialsMap[cls.id] || []) {
        materials.push({
          ...mat,
          subject: normalizeLegacySubjectName(mat.subject),
          classId: cls.id,
          className: cls.name,
        });
      }
    }

    const indActsMap = loadLocal(LOCAL_KEYS.INDIVIDUAL_ACTIVITIES, {});
    const gradesMap = loadLocal(LOCAL_KEYS.ACADEMIC_RECORDS, {});
    const feedbacksMap = loadLocal(LOCAL_KEYS.PEDAGOGICAL_FEEDBACKS, {});

    return {
      enrolledClasses,
      contents: contents.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
      activities: activities.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),
      announcements: announcements.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
      materials: materials.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
      individualActivities: (indActsMap[studentUid] || []).map(x => ({
        ...x,
        subject: normalizeLegacySubjectName(x.subject),
      })),
      academicRecords: (gradesMap[studentUid] || []).map(x => ({
        ...x,
        subject: normalizeLegacySubjectName(x.subject),
      })),
      pedagogicalFeedbacks: feedbacksMap[studentUid] || [],
    };
  }

  // Consulta no Cloud Firestore: turmas onde o estudante está matriculado
  const classesCol = collection(db, 'classes');
  const qEnrolled = query(classesCol, where('studentIds', 'array-contains', studentUid));
  const enrolledSnap = await getDocs(qEnrolled);
  const enrolledClasses = enrolledSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const contents = [];
  const activities = [];
  const announcements = [];
  const materials = [];

  await Promise.all(
    enrolledClasses.map(async cls => {
      const [cntSnap, actSnap, annSnap, matSnap] = await Promise.all([
        getDocs(collection(db, 'classes', cls.id, 'contents')),
        getDocs(collection(db, 'classes', cls.id, 'activities')),
        getDocs(collection(db, 'classes', cls.id, 'announcements')),
        getDocs(collection(db, 'classes', cls.id, 'materials')),
      ]);

      for (const d of cntSnap.docs) {
        const data = d.data();
        contents.push({
          id: d.id,
          ...data,
          subject: normalizeLegacySubjectName(data.subject),
          classId: cls.id,
          className: cls.name,
        });
      }
      for (const d of actSnap.docs) {
        const data = d.data();
        activities.push({
          id: d.id,
          ...data,
          subject: normalizeLegacySubjectName(data.subject),
          classId: cls.id,
          className: cls.name,
        });
      }
      for (const d of annSnap.docs) {
        const data = d.data();
        announcements.push({
          id: d.id,
          ...data,
          classId: cls.id,
          className: cls.name,
        });
      }
      for (const d of matSnap.docs) {
        const data = d.data();
        materials.push({
          id: d.id,
          ...data,
          subject: normalizeLegacySubjectName(data.subject),
          classId: cls.id,
          className: cls.name,
        });
      }
    })
  );

  const [indSnap, gradesSnap, fbSnap] = await Promise.all([
    getDocs(collection(db, 'users', studentUid, 'individualActivities')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'users', studentUid, 'academicRecords')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'users', studentUid, 'pedagogicalFeedbacks')).catch(() => ({ docs: [] })),
  ]);

  const individualActivities = indSnap.docs
    .map(d => ({ id: d.id, ...d.data(), subject: normalizeLegacySubjectName(d.data().subject) }))
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

  const academicRecords = gradesSnap.docs
    .map(d => ({ id: d.id, ...d.data(), subject: normalizeLegacySubjectName(d.data().subject) }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const pedagogicalFeedbacks = fbSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return {
    enrolledClasses,
    contents: contents.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    activities: activities.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),
    announcements: announcements.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    materials: materials.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    individualActivities,
    academicRecords,
    pedagogicalFeedbacks,
  };
}

/**
 * Permite que o próprio estudante marque como concluída (ou reabra) uma atividade individual
 * atribuída a ele, sem poder alterar título, pontuação, prazo ou autoria.
 */
export async function toggleStudentIndividualActivityStatus(studentUser, activityId) {
  if (!studentUser || !(studentUser.uid || studentUser.id)) {
    throw new Error('Não autenticado.');
  }
  const studentUid = String(studentUser.uid || studentUser.id);
  const nowISO = new Date().toISOString();

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.INDIVIDUAL_ACTIVITIES, {});
    const list = all[studentUid] || [];
    const idx = list.findIndex(a => a.id === activityId);
    if (idx === -1) throw new Error('Atividade individual não encontrada.');
    const nextStatus = list[idx].status === 'completed' ? 'pending' : 'completed';
    list[idx] = {
      ...list[idx],
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? nowISO : null,
      updatedAt: nowISO,
    };
    all[studentUid] = list;
    saveLocal(LOCAL_KEYS.INDIVIDUAL_ACTIVITIES, all);
    return list[idx];
  }

  const ref = doc(db, 'users', studentUid, 'individualActivities', activityId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Atividade individual não encontrada.');
  const existing = snap.data();
  const nextStatus = existing.status === 'completed' ? 'pending' : 'completed';
  const updated = {
    ...existing,
    status: nextStatus,
    completedAt: nextStatus === 'completed' ? nowISO : null,
    updatedAt: nowISO,
  };
  await setDoc(ref, updated);
  return updated;
}

// ─── 8. Perfil Acadêmico Individual do Estudante & Ferramentas Pedagógicas ───

/**
 * Verifica se o docente (`actorUser`) possui permissão para consultar/gerenciar
 * o perfil acadêmico de `studentUid`.
 * - Administrador (`role === 'admin'`): acesso a todos os estudantes.
 * - Professor (`role === 'professor'`): acesso SOMENTE a estudantes matriculados
 *   em pelo menos uma turma autorizada ao professor (`actorUid in class.teacherIds && studentUid in class.studentIds`).
 * - Aluno (`role === 'aluno'`): negado.
 */
async function assertCanAccessStudentProfile(actorUser, studentUid, explicitClassId = null) {
  assertStaff(actorUser);
  const actorUid = String(actorUser.uid || actorUser.id);
  const targetUid = String(studentUid || '').trim();
  if (!targetUid) {
    throw new Error('Identificador do estudante é obrigatório.');
  }

  const authorizedClasses = await getAuthorizedClasses(actorUser);

  if (actorUser.role === 'admin') {
    const studentClasses = authorizedClasses.filter(
      c => Array.isArray(c.studentIds) && c.studentIds.includes(targetUid)
    );
    const chosenClass = explicitClassId
      ? authorizedClasses.find(c => c.id === explicitClassId) || studentClasses[0] || authorizedClasses[0] || null
      : studentClasses[0] || authorizedClasses[0] || null;
    return { studentClasses, chosenClass };
  }

  // Professor: só pode acessar se o aluno pertencer a uma turma atribuída a este professor
  const sharedClasses = authorizedClasses.filter(
    c =>
      Array.isArray(c.teacherIds) &&
      c.teacherIds.includes(actorUid) &&
      Array.isArray(c.studentIds) &&
      c.studentIds.includes(targetUid)
  );

  if (sharedClasses.length === 0) {
    throw new Error(
      'Acesso negado: você só pode acessar perfis e registros de estudantes matriculados nas suas turmas atribuídas.'
    );
  }

  if (explicitClassId && !sharedClasses.some(c => c.id === explicitClassId)) {
    throw new Error('Acesso negado: este estudante não pertence à turma informada ou você não é docente dela.');
  }

  const chosenClass = explicitClassId
    ? sharedClasses.find(c => c.id === explicitClassId)
    : sharedClasses[0];

  return { studentClasses: sharedClasses, chosenClass };
}

/**
 * Carrega o Perfil Acadêmico Individual completo de um estudante para o Professor autorizado ou Administrador.
 * Não inventa notas, atividades ou registros: começa com estados vazios quando não há dados cadastrados.
 */
export async function getStudentAcademicProfile(actorUser, studentUid, explicitClassId = null) {
  const { studentClasses, chosenClass } = await assertCanAccessStudentProfile(
    actorUser,
    studentUid,
    explicitClassId
  );
  const targetUid = String(studentUid);

  const linkedSubjects = Array.from(
    new Set(
      studentClasses.flatMap(c => (Array.isArray(c.subjects) ? c.subjects.map(normalizeLegacySubjectName) : []))
    )
  );

  if (!db) {
    const allUsers = loadLocal(LOCAL_KEYS.USERS, []);
    const u = allUsers.find(x => (x.uid || x.id) === targetUid);
    if (!u) throw new Error('Estudante não encontrado.');

    const tasks = DataService.getTasks(targetUid);
    const focusSessions = DataService.getFocusSessions(targetUid);
    const gamification = DataService.getGamification(targetUid);

    const allContentsMap = loadLocal(LOCAL_KEYS.CLASS_CONTENTS, {});
    const allActivitiesMap = loadLocal(LOCAL_KEYS.CLASS_ACTIVITIES, {});

    const classContents = studentClasses.flatMap(c =>
      (allContentsMap[c.id] || []).map(cnt => ({ ...cnt, className: c.name }))
    );
    const classActivities = studentClasses.flatMap(c =>
      (allActivitiesMap[c.id] || []).map(act => ({ ...act, className: c.name }))
    );

    const indActsMap = loadLocal(LOCAL_KEYS.INDIVIDUAL_ACTIVITIES, {});
    const gradesMap = loadLocal(LOCAL_KEYS.ACADEMIC_RECORDS, {});
    const feedbacksMap = loadLocal(LOCAL_KEYS.PEDAGOGICAL_FEEDBACKS, {});
    const notesMap = loadLocal(LOCAL_KEYS.INTERNAL_NOTES, {});

    return {
      student: {
        uid: targetUid,
        name: u.name || 'Estudante',
        email: u.email || '',
        createdAt: u.createdAt || null,
      },
      enrolledClasses: studentClasses,
      activeClass: chosenClass,
      linkedSubjects,
      tasksCompleted: tasks.filter(t => t.status === 'completed'),
      tasksPending: tasks.filter(t => t.status !== 'completed'),
      focusSessions: [...focusSessions].sort((a, b) =>
        (b.completedAt || b.createdAt || '').localeCompare(a.completedAt || a.createdAt || '')
      ),
      gamification: {
        points: gamification.points || 0,
        level: gamification.level || 1,
        streakDays: gamification.streakDays || 0,
        bestStreak: gamification.bestStreak || 0,
        lastActiveDate: gamification.lastActiveDate || null,
      },
      classContents,
      classActivities,
      individualActivities: indActsMap[targetUid] || [],
      academicRecords: gradesMap[targetUid] || [],
      pedagogicalFeedbacks: feedbacksMap[targetUid] || [],
      internalNotes: notesMap[targetUid] || [],
    };
  }

  // Professores só leem registros vinculados às suas próprias turmas (compatível com as Security Rules);
  // administradores leem todos os registros.
  const scopedClassIds = studentClasses.map(c => c.id).slice(0, 30);
  const scoped = colRef =>
    actorUser.role === 'admin' || scopedClassIds.length === 0
      ? colRef
      : query(colRef, where('classId', 'in', scopedClassIds));

  const userSnap = await getDoc(doc(db, 'users', targetUid));
  if (!userSnap.exists()) throw new Error('Estudante não encontrado.');
  const u = userSnap.data();

  const [
    tasksSnap,
    focusSnap,
    gamificationSnap,
    indSnap,
    gradesSnap,
    fbSnap,
    notesSnap,
  ] = await Promise.all([
    getDocs(collection(db, 'users', targetUid, 'tasks')),
    getDocs(collection(db, 'users', targetUid, 'focusSessions')),
    getDoc(doc(db, 'users', targetUid, 'appdata', 'gamification')),
    getDocs(scoped(collection(db, 'users', targetUid, 'individualActivities'))),
    getDocs(scoped(collection(db, 'users', targetUid, 'academicRecords'))),
    getDocs(scoped(collection(db, 'users', targetUid, 'pedagogicalFeedbacks'))),
    getDocs(scoped(collection(db, 'studentInternalNotes', targetUid, 'notes'))),
  ]);

  const classContents = [];
  const classActivities = [];
  await Promise.all(
    studentClasses.map(async cls => {
      const [cntSnap, actSnap] = await Promise.all([
        getDocs(collection(db, 'classes', cls.id, 'contents')),
        getDocs(collection(db, 'classes', cls.id, 'activities')),
      ]);
      for (const d of cntSnap.docs) {
        classContents.push({ id: d.id, ...d.data(), className: cls.name });
      }
      for (const d of actSnap.docs) {
        classActivities.push({ id: d.id, ...d.data(), className: cls.name });
      }
    })
  );

  const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const focusSessions = focusSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.completedAt || b.createdAt || '').localeCompare(a.completedAt || a.createdAt || ''));
  const gamification = gamificationSnap.exists() ? gamificationSnap.data() : {};

  return {
    student: {
      uid: targetUid,
      name: u.name || 'Estudante',
      email: u.email || '',
      createdAt: u.createdAt || null,
    },
    enrolledClasses: studentClasses,
    activeClass: chosenClass,
    linkedSubjects,
    tasksCompleted: tasks.filter(t => t.status === 'completed'),
    tasksPending: tasks.filter(t => t.status !== 'completed'),
    focusSessions,
    gamification: {
      points: Number(gamification.points) || 0,
      level: Number(gamification.level) || 1,
      streakDays: Number(gamification.streakDays) || 0,
      bestStreak: Number(gamification.bestStreak) || 0,
      lastActiveDate: gamification.lastActiveDate || null,
    },
    classContents,
    classActivities,
    individualActivities: indSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    academicRecords: gradesSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    pedagogicalFeedbacks: fbSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    internalNotes: notesSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
  };
}

/**
 * Atribui uma atividade pedagógica individual para um estudante específico.
 */
export async function assignIndividualActivity(actorUser, {
  studentUid,
  classId,
  title,
  subject,
  dueDate = '',
  points = 10,
  description = '',
}) {
  const { chosenClass } = await assertCanAccessStudentProfile(actorUser, studentUid, classId);
  if (!title?.trim()) throw new Error('Informe o título da atividade individual.');
  if (!subject?.trim()) throw new Error('Selecione a disciplina da atividade.');

  const resolvedClassId = String(classId || chosenClass?.id || 'geral').slice(0, 128);
  const nowISO = new Date().toISOString();
  const item = {
    id: generateId('ind-act'),
    studentUid: String(studentUid),
    classId: resolvedClassId,
    className: String(chosenClass?.name || ''),
    title: String(title).trim().slice(0, 200),
    subject: normalizeLegacySubjectName(subject).slice(0, 120),
    dueDate: String(dueDate || '').trim().slice(0, 40),
    points: Math.max(0, Math.min(100, Number(points) || 10)),
    description: String(description || '').trim().slice(0, 2000),
    status: 'pending',
    authorId: String(actorUser.uid || actorUser.id).slice(0, 128),
    authorName: String(actorUser.name || 'Professor').slice(0, 120),
    createdAt: nowISO,
    updatedAt: nowISO,
  };

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.INDIVIDUAL_ACTIVITIES, {});
    all[studentUid] = [item, ...(all[studentUid] || [])];
    saveLocal(LOCAL_KEYS.INDIVIDUAL_ACTIVITIES, all);
    return item;
  }

  await setDoc(doc(db, 'users', String(studentUid), 'individualActivities', item.id), item);
  return item;
}

export async function deleteIndividualActivity(actorUser, { studentUid, classId, activityId }) {
  await assertCanAccessStudentProfile(actorUser, studentUid, classId);
  if (!db) {
    const all = loadLocal(LOCAL_KEYS.INDIVIDUAL_ACTIVITIES, {});
    all[studentUid] = (all[studentUid] || []).filter(x => x.id !== activityId);
    saveLocal(LOCAL_KEYS.INDIVIDUAL_ACTIVITIES, all);
    return true;
  }
  await deleteDoc(doc(db, 'users', String(studentUid), 'individualActivities', activityId));
  return true;
}

/**
 * Registra nota / resultado de avaliação no perfil do estudante.
 * O estudante pode consultar suas próprias notas publicadas, mas NUNCA alterá-las.
 */
export async function recordStudentGrade(actorUser, {
  studentUid,
  classId,
  title,
  subject,
  unit = 'I Unidade',
  score,
  maxScore = 10,
  notes = '',
}) {
  const { chosenClass } = await assertCanAccessStudentProfile(actorUser, studentUid, classId);
  if (!title?.trim()) throw new Error('Informe a avaliação (ex: Prova I Unidade, Projeto SQL).');
  if (!subject?.trim()) throw new Error('Selecione a disciplina.');
  const numScore = Number(score);
  const numMax = Number(maxScore) || 10;
  if (Number.isNaN(numScore) || numScore < 0 || numScore > numMax) {
    throw new Error(`A nota deve ser um número válido entre 0 e ${numMax}.`);
  }

  const resolvedClassId = String(classId || chosenClass?.id || 'geral').slice(0, 128);
  const nowISO = new Date().toISOString();
  const item = {
    id: generateId('grade'),
    studentUid: String(studentUid),
    classId: resolvedClassId,
    className: String(chosenClass?.name || ''),
    title: String(title).trim().slice(0, 200),
    subject: normalizeLegacySubjectName(subject).slice(0, 120),
    unit: String(unit || 'I Unidade').trim().slice(0, 40),
    score: numScore,
    maxScore: numMax,
    notes: String(notes || '').trim().slice(0, 1000),
    authorId: String(actorUser.uid || actorUser.id).slice(0, 128),
    authorName: String(actorUser.name || 'Professor').slice(0, 120),
    createdAt: nowISO,
    updatedAt: nowISO,
  };

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.ACADEMIC_RECORDS, {});
    all[studentUid] = [item, ...(all[studentUid] || [])];
    saveLocal(LOCAL_KEYS.ACADEMIC_RECORDS, all);
    return item;
  }

  await setDoc(doc(db, 'users', String(studentUid), 'academicRecords', item.id), item);
  return item;
}

export async function deleteStudentGrade(actorUser, { studentUid, classId, recordId }) {
  await assertCanAccessStudentProfile(actorUser, studentUid, classId);
  if (!db) {
    const all = loadLocal(LOCAL_KEYS.ACADEMIC_RECORDS, {});
    all[studentUid] = (all[studentUid] || []).filter(x => x.id !== recordId);
    saveLocal(LOCAL_KEYS.ACADEMIC_RECORDS, all);
    return true;
  }
  await deleteDoc(doc(db, 'users', String(studentUid), 'academicRecords', recordId));
  return true;
}

/**
 * Adiciona um feedback / orientação pedagógica visível ao estudante.
 */
export async function addPedagogicalFeedback(actorUser, {
  studentUid,
  classId,
  subject = 'Geral',
  comment,
  title = '',
  category = '',
}) {
  const { chosenClass } = await assertCanAccessStudentProfile(actorUser, studentUid, classId);
  if (!comment?.trim()) throw new Error('Escreva o feedback pedagógico para o estudante.');

  const resolvedClassId = String(classId || chosenClass?.id || 'geral').slice(0, 128);
  const nowISO = new Date().toISOString();
  const item = {
    id: generateId('fb'),
    studentUid: String(studentUid),
    classId: resolvedClassId,
    className: String(chosenClass?.name || ''),
    subject: normalizeLegacySubjectName(subject).slice(0, 120),
    title: String(title || '').trim().slice(0, 200),
    category: String(category || '').trim().slice(0, 80),
    comment: String(comment).trim().slice(0, 3000),
    authorId: String(actorUser.uid || actorUser.id).slice(0, 128),
    authorName: String(actorUser.name || 'Professor').slice(0, 120),
    createdAt: nowISO,
    updatedAt: nowISO,
  };

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.PEDAGOGICAL_FEEDBACKS, {});
    all[studentUid] = [item, ...(all[studentUid] || [])];
    saveLocal(LOCAL_KEYS.PEDAGOGICAL_FEEDBACKS, all);
    return item;
  }

  await setDoc(doc(db, 'users', String(studentUid), 'pedagogicalFeedbacks', item.id), item);
  return item;
}

export async function deletePedagogicalFeedback(actorUser, { studentUid, classId, feedbackId }) {
  await assertCanAccessStudentProfile(actorUser, studentUid, classId);
  if (!db) {
    const all = loadLocal(LOCAL_KEYS.PEDAGOGICAL_FEEDBACKS, {});
    all[studentUid] = (all[studentUid] || []).filter(x => x.id !== feedbackId);
    saveLocal(LOCAL_KEYS.PEDAGOGICAL_FEEDBACKS, all);
    return true;
  }
  await deleteDoc(doc(db, 'users', String(studentUid), 'pedagogicalFeedbacks', feedbackId));
  return true;
}

/**
 * Registra uma observação pedagógica INTERNA sobre o acompanhamento do estudante.
 * Gravada em `/studentInternalNotes/{studentUid}/notes/{noteId}` — protegida no Firebase
 * para que o estudante NUNCA tenha permissão de leitura ou escrita.
 */
export async function addStudentInternalNote(actorUser, {
  studentUid,
  classId,
  category = 'Acompanhamento Pedagógico',
  observation,
}) {
  const { chosenClass } = await assertCanAccessStudentProfile(actorUser, studentUid, classId);
  if (!observation?.trim()) throw new Error('Escreva a observação pedagógica interna.');

  const resolvedClassId = String(classId || chosenClass?.id || 'geral').slice(0, 128);
  const nowISO = new Date().toISOString();
  const item = {
    id: generateId('note'),
    studentUid: String(studentUid),
    classId: resolvedClassId,
    className: String(chosenClass?.name || ''),
    category: String(category || 'Acompanhamento Pedagógico').trim().slice(0, 80),
    observation: String(observation).trim().slice(0, 3000),
    authorId: String(actorUser.uid || actorUser.id).slice(0, 128),
    authorName: String(actorUser.name || 'Professor').slice(0, 120),
    createdAt: nowISO,
    updatedAt: nowISO,
  };

  if (!db) {
    const all = loadLocal(LOCAL_KEYS.INTERNAL_NOTES, {});
    all[studentUid] = [item, ...(all[studentUid] || [])];
    saveLocal(LOCAL_KEYS.INTERNAL_NOTES, all);
    return item;
  }

  await setDoc(doc(db, 'studentInternalNotes', String(studentUid), 'notes', item.id), item);
  return item;
}

export async function deleteStudentInternalNote(actorUser, { studentUid, classId, noteId }) {
  await assertCanAccessStudentProfile(actorUser, studentUid, classId);
  if (!db) {
    const all = loadLocal(LOCAL_KEYS.INTERNAL_NOTES, {});
    all[studentUid] = (all[studentUid] || []).filter(x => x.id !== noteId);
    saveLocal(LOCAL_KEYS.INTERNAL_NOTES, all);
    return true;
  }
  await deleteDoc(doc(db, 'studentInternalNotes', String(studentUid), 'notes', noteId));
  return true;
}

