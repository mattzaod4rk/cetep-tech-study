/**
 * scripts/set-teacher-role.mjs — Procedimento administrativo seguro (Server-Side / CLI)
 * para atribuir ou revogar o papel de `professor` no Firebase Authentication (Custom Claims)
 * e no documento `/users/{uid}` do Cloud Firestore.
 *
 * SEGURANÇA:
 * - Este script roda EXCLUSIVAMENTE em ambiente de servidor/terminal Node.js.
 * - NUNCA coloque a chave de conta de serviço (serviceAccountKey.json) dentro de `src/`
 *   ou em variáveis `VITE_*`.
 *
 * Como usar:
 *   1. Exporte a variável GOOGLE_APPLICATION_CREDENTIALS apontando para sua chave Admin:
 *      $env:GOOGLE_APPLICATION_CREDENTIALS="C:\caminho\seguro\serviceAccountKey.json"
 *   2. Execute:
 *      node scripts/set-teacher-role.mjs professora@enova.educacao.ba.gov.br professor
 */

import process from 'node:process';

async function main() {
  const [, , targetEmail, targetRole = 'professor'] = process.argv;

  if (!targetEmail || !['professor', 'aluno'].includes(targetRole)) {
    console.error('Uso: node scripts/set-teacher-role.mjs <email-do-usuario> [professor|aluno]');
    process.exit(1);
  }

  let admin;
  try {
    admin = await import('firebase-admin');
  } catch {
    console.error('Instale firebase-admin globalmente ou em ambiente administrativo para executar este script.');
    process.exit(1);
  }

  const app = admin.default.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'cetep-tech-study',
  });

  const auth = app.auth();
  const db = app.firestore();

  const userRecord = await auth.getUserByEmail(targetEmail.trim().toLowerCase());
  await auth.setCustomUserClaims(userRecord.uid, {
    role: targetRole,
    admin: targetRole === 'professor',
  });

  await db.collection('users').doc(userRecord.uid).set(
    {
      uid: userRecord.uid,
      email: userRecord.email,
      role: targetRole,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  console.log(`✓ Permissão '${targetRole}' atribuída com sucesso para ${userRecord.email} (UID: ${userRecord.uid}).`);
}

main().catch(err => {
  console.error('Erro ao atribuir permissão administrativa:', err.message);
  process.exit(1);
});
