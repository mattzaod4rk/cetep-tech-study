/**
 * api/class-students.js — Endpoint Seguro (Serverless / Cloud Function com Firebase Admin SDK)
 * para busca restrita de estudantes e matrícula em turmas no CETEP Tech Study.
 *
 * Regras de segurança aplicadas no servidor via Firebase Admin SDK:
 * 1. Verifica criptograficamente o Firebase ID Token do solicitante (`adminAuth.verifyIdToken`).
 * 2. Confirma que o solicitante possui perfil `professor` ou `admin`.
 * 3. Confirma que o professor solicitante está vinculado à turma (`callerUid in classData.teacherIds`),
 *    ou que o solicitante é `admin`.
 * 4. Busca exclusivamente contas com perfil de estudante (`role === 'aluno'`).
 * 5. Retorna SOMENTE dados mínimos de identificação (`uid`, `name`, `email`, `alreadyEnrolled`),
 *    jamais expondo preferências de acessibilidade, dados pessoais extras ou registros acadêmicos
 *    de estudantes que ainda não pertencem à turma.
 * 6. Impede matrículas duplicadas na turma.
 * 7. Registra a operação e sua autoria em `/classes/{classId}/auditLogs/{logId}`.
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function normalizeSearchText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getPrivateKeyFromEnv() {
  const raw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!raw) return null;
  let cleaned = raw.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.replace(/\\n/g, '\n');
}

export function getFirebaseAdminServices() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'cetep-tech-study';
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = getPrivateKeyFromEnv();

  if (!clientEmail || !privateKey) {
    throw new Error('Credenciais do Firebase Admin SDK ausentes no servidor.');
  }

  let app;
  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
  } else {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  }

  return {
    adminAuth: getAuth(app),
    adminDb: getFirestore(app),
  };
}

/**
 * Núcleo de regras de negócio e segurança do endpoint (utilizado pelo handler HTTP
 * com Firebase Admin SDK e também testável de forma isolada na suíte automatizada).
 */
export async function executeSecureClassStudentOperation(
  { caller, action, classId, query = '', studentIds = [], studentUid = null },
  adapter
) {
  // 1. Verificar autenticação
  if (!caller || !caller.uid) {
    const err = new Error('Não autenticado: token de acesso ausente ou inválido.');
    err.statusCode = 401;
    throw err;
  }

  // 2. Confirmar perfil de professor ou administrador
  const callerProfile = await adapter.getUserById(caller.uid);
  const effectiveRole =
    caller.claimRole === 'admin' || callerProfile?.role === 'admin'
      ? 'admin'
      : caller.claimRole === 'professor' || callerProfile?.role === 'professor'
      ? 'professor'
      : 'aluno';

  if (effectiveRole !== 'professor' && effectiveRole !== 'admin') {
    const err = new Error('Acesso negado: apenas professores autorizados e administradores podem gerenciar estudantes de turmas.');
    err.statusCode = 403;
    throw err;
  }

  // 3. Validar turma escolhida e vínculo do professor
  if (!classId || typeof classId !== 'string') {
    const err = new Error('O identificador da turma (classId) é obrigatório.');
    err.statusCode = 400;
    throw err;
  }

  const classDoc = await adapter.getClassById(classId);
  if (!classDoc) {
    const err = new Error('Turma não encontrada.');
    err.statusCode = 404;
    throw err;
  }

  const teacherIds = Array.isArray(classDoc.teacherIds) ? classDoc.teacherIds : [];
  if (effectiveRole === 'professor' && !teacherIds.includes(caller.uid)) {
    const err = new Error('Acesso negado: você não está atribuído a esta turma.');
    err.statusCode = 403;
    throw err;
  }

  const enrolledIds = Array.isArray(classDoc.studentIds) ? classDoc.studentIds : [];
  const enrolledSet = new Set(enrolledIds);

  // 4. Ação: BUSCAR ESTUDANTES (somente role === 'aluno', retornando apenas uid, name, email, alreadyEnrolled)
  if (action === 'search') {
    const qNorm = normalizeSearchText(query);
    const allStudentAccounts = await adapter.listStudentAccountsOnly();

    const matched = allStudentAccounts
      .filter(u => {
        // Garantia dupla: jamais retornar contas de professor ou admin
        if ((u.role || 'aluno') !== 'aluno') return false;
        if (!qNorm) return true;
        const nameNorm = normalizeSearchText(u.name);
        const emailNorm = normalizeSearchText(u.email);
        return nameNorm.includes(qNorm) || emailNorm.includes(qNorm);
      })
      .slice(0, 40)
      .map(u => ({
        // Exibir APENAS informações necessárias para identificação (sem preferências AEE, sem notas/tarefas)
        uid: String(u.uid || u.id),
        name: String(u.name || 'Estudante'),
        email: String(u.email || ''),
        alreadyEnrolled: enrolledSet.has(String(u.uid || u.id)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      ok: true,
      students: matched,
    };
  }

  // 5. Ação: ADICIONAR ESTUDANTES À TURMA (impedindo duplicatas e registrando autoria)
  if (action === 'enroll') {
    const rawTargets = Array.isArray(studentIds) && studentIds.length > 0
      ? studentIds
      : studentUid
      ? [studentUid]
      : [];

    const uniqueRequested = Array.from(
      new Set(rawTargets.map(id => String(id || '').trim()).filter(Boolean))
    );

    if (uniqueRequested.length === 0) {
      const err = new Error('Selecione ao menos um estudante para adicionar à turma.');
      err.statusCode = 400;
      throw err;
    }

    const toAddUids = [];
    const duplicateUids = [];
    const addedStudentsMeta = [];

    for (const targetUid of uniqueRequested) {
      const targetUser = await adapter.getUserById(targetUid);
      if (!targetUser) {
        const err = new Error(`Estudante (${targetUid}) não encontrado na plataforma.`);
        err.statusCode = 404;
        throw err;
      }
      if ((targetUser.role || 'aluno') !== 'aluno') {
        const err = new Error('Apenas contas com perfil de aluno podem ser matriculadas como estudantes na turma.');
        err.statusCode = 400;
        throw err;
      }

      if (enrolledSet.has(targetUid)) {
        duplicateUids.push(targetUid);
      } else {
        enrolledSet.add(targetUid);
        toAddUids.push(targetUid);
        addedStudentsMeta.push({
          uid: targetUid,
          name: String(targetUser.name || 'Estudante'),
          email: String(targetUser.email || ''),
        });
      }
    }

    // Se todos os selecionados já estavam na turma, rejeitar impedindo matrícula duplicada
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

    const updatedStudentIds = Array.from(enrolledSet);
    const nowISO = new Date().toISOString();

    await adapter.updateClassStudents(classId, updatedStudentIds, toAddUids, nowISO);

    const auditEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      classId,
      className: String(classDoc.name || ''),
      action: 'ADD_STUDENTS',
      actorUid: caller.uid,
      actorName: String(callerProfile?.name || caller.name || 'Docente'),
      actorEmail: String(callerProfile?.email || caller.email || ''),
      actorRole: effectiveRole,
      addedStudentIds: toAddUids,
      addedStudents: addedStudentsMeta,
      skippedDuplicateIds: duplicateUids,
      createdAt: nowISO,
    };

    await adapter.saveAuditLog(classId, auditEntry);

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

  // 6. Ação: REMOVER ESTUDANTE DA TURMA (registrando autoria)
  if (action === 'unenroll') {
    const targetUid = String(studentUid || (studentIds && studentIds[0]) || '').trim();
    if (!targetUid) {
      const err = new Error('Informe o estudante a ser removido da turma.');
      err.statusCode = 400;
      throw err;
    }

    if (!enrolledSet.has(targetUid)) {
      const err = new Error('Este estudante não faz parte desta turma.');
      err.statusCode = 404;
      throw err;
    }

    const targetUser = await adapter.getUserById(targetUid);
    enrolledSet.delete(targetUid);
    const updatedStudentIds = Array.from(enrolledSet);
    const nowISO = new Date().toISOString();

    await adapter.removeClassStudent(classId, updatedStudentIds, targetUid, nowISO);

    const auditEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      classId,
      className: String(classDoc.name || ''),
      action: 'REMOVE_STUDENT',
      actorUid: caller.uid,
      actorName: String(callerProfile?.name || caller.name || 'Docente'),
      actorEmail: String(callerProfile?.email || caller.email || ''),
      actorRole: effectiveRole,
      removedStudentId: targetUid,
      removedStudentName: String(targetUser?.name || 'Estudante'),
      removedStudentEmail: String(targetUser?.email || ''),
      createdAt: nowISO,
    };

    await adapter.saveAuditLog(classId, auditEntry);

    return {
      ok: true,
      classId,
      studentIds: updatedStudentIds,
      removedStudentId: targetUid,
      auditLog: auditEntry,
    };
  }

  // 7. Ação: LISTAR LOGS DE AUDITORIA DA TURMA
  if (action === 'auditLogs') {
    const logs = await adapter.listAuditLogs(classId);
    return {
      ok: true,
      logs,
    };
  }

  const err = new Error(`Ação inválida: ${action}`);
  err.statusCode = 400;
  throw err;
}

/**
 * Cria o adaptador conectado ao Cloud Firestore via Firebase Admin SDK.
 */
export function createFirestoreAdminAdapter(adminDb) {
  return {
    async getUserById(uid) {
      const snap = await adminDb.collection('users').doc(uid).get();
      if (!snap.exists) return null;
      return { id: snap.id, uid: snap.id, ...snap.data() };
    },
    async getClassById(classId) {
      const snap = await adminDb.collection('classes').doc(classId).get();
      if (!snap.exists) return null;
      return { id: snap.id, ...snap.data() };
    },
    async listStudentAccountsOnly() {
      const snap = await adminDb.collection('users').where('role', '==', 'aluno').get();
      return snap.docs.map(d => {
        const data = d.data();
        return {
          uid: d.id,
          id: d.id,
          name: data.name || 'Estudante',
          email: data.email || '',
          role: data.role || 'aluno',
        };
      });
    },
    async updateClassStudents(classId, updatedStudentIds, addedUids, nowISO) {
      const batch = adminDb.batch();
      const classRef = adminDb.collection('classes').doc(classId);
      batch.set(classRef, { studentIds: updatedStudentIds, updatedAt: nowISO }, { merge: true });

      for (const uid of addedUids) {
        const uRef = adminDb.collection('users').doc(uid);
        const uSnap = await uRef.get();
        if (uSnap.exists) {
          const existingEnrolled = Array.isArray(uSnap.data().enrolledClassIds)
            ? uSnap.data().enrolledClassIds
            : [];
          const merged = Array.from(new Set([...existingEnrolled, classId]));
          batch.set(uRef, { enrolledClassIds: merged, updatedAt: nowISO }, { merge: true });
        }
      }
      await batch.commit();
    },
    async removeClassStudent(classId, updatedStudentIds, removedUid, nowISO) {
      const batch = adminDb.batch();
      const classRef = adminDb.collection('classes').doc(classId);
      batch.set(classRef, { studentIds: updatedStudentIds, updatedAt: nowISO }, { merge: true });

      const uRef = adminDb.collection('users').doc(removedUid);
      const uSnap = await uRef.get();
      if (uSnap.exists) {
        const existingEnrolled = Array.isArray(uSnap.data().enrolledClassIds)
          ? uSnap.data().enrolledClassIds
          : [];
        batch.set(
          uRef,
          { enrolledClassIds: existingEnrolled.filter(id => id !== classId), updatedAt: nowISO },
          { merge: true }
        );
      }
      await batch.commit();
    },
    async saveAuditLog(classId, auditEntry) {
      await adminDb
        .collection('classes')
        .doc(classId)
        .collection('auditLogs')
        .doc(auditEntry.id)
        .set(auditEntry);
    },
    async listAuditLogs(classId) {
      const snap = await adminDb
        .collection('classes')
        .doc(classId)
        .collection('auditLogs')
        .get();
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .slice(0, 30);
    },
  };
}

/**
 * Handler padrão Vercel Serverless Function (`POST /api/class-students`).
 */
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método não permitido. Utilize POST.' });
  }

  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
    const match = String(authHeader).match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ ok: false, error: 'Token de autenticação Bearer não informado.' });
    }

    const idToken = match[1].trim();
    const { adminAuth, adminDb } = getFirebaseAdminServices();

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return res.status(401).json({ ok: false, error: 'Sessão inválida ou expirada. Faça login novamente.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const caller = {
      uid: decoded.uid,
      email: decoded.email || '',
      name: decoded.name || '',
      claimRole: decoded.admin === true ? 'admin' : decoded.role || null,
    };

    const adapter = createFirestoreAdminAdapter(adminDb);
    const result = await executeSecureClassStudentOperation(
      {
        caller,
        action: body.action,
        classId: body.classId,
        query: body.query || '',
        studentIds: body.studentIds || [],
        studentUid: body.studentUid || null,
      },
      adapter
    );

    return res.status(200).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      ok: false,
      error: err.message || 'Erro interno ao processar operação de estudantes da turma.',
      duplicateUids: err.duplicateUids || undefined,
    });
  }
}
