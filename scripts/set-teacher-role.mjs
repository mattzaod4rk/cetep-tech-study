/**
 * scripts/set-teacher-role.mjs — Procedimento administrativo seguro (Server-Side / CLI)
 * para atribuir ou revogar os papéis `admin`, `professor` ou `aluno` no Firebase Authentication
 * (Custom Claims) e no documento `/users/{uid}` do Cloud Firestore.
 *
 * SEGURANÇA:
 * - Este script roda EXCLUSIVAMENTE em ambiente de servidor/terminal Node.js.
 * - NUNCA coloque credenciais administrativas dentro de `src/` ou em variáveis `VITE_*`.
 *
 * Como usar:
 *   node scripts/set-teacher-role.mjs <email-do-usuario> [admin|professor|aluno]
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'cetep-tech-study';
const PROJECT_NUMBER = '758476659955';

async function runViaFirebaseCliToken(targetEmail, targetRole) {
  const cfgPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (!fs.existsSync(cfgPath)) {
    throw new Error('Sessão da Firebase CLI não encontrada. Execute `npx firebase-tools login` primeiro.');
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const token = cfg?.tokens?.access_token;
  if (!token) throw new Error('Token OAuth da Firebase CLI ausente.');

  const lookupRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_NUMBER}/accounts:lookup`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: [targetEmail.trim().toLowerCase()] }),
    }
  ).then(r => r.json());

  const user = lookupRes?.users?.[0];
  if (!user?.localId) {
    throw new Error(`Usuário ${targetEmail} não encontrado no Firebase Authentication.`);
  }

  const uid = user.localId;
  const claims = {
    role: targetRole,
    admin: targetRole === 'admin',
  };

  await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_NUMBER}/accounts:update`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      localId: uid,
      customAttributes: JSON.stringify(claims),
    }),
  });

  await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=role&updateMask.fieldPaths=updatedAt`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          role: { stringValue: targetRole },
          updatedAt: { stringValue: new Date().toISOString() },
        },
      }),
    }
  );

  console.log(`✓ Perfil '${targetRole}' (Custom Claims + Firestore) atribuído para ${user.email} (UID: ${uid}).`);
}

async function main() {
  const [, , targetEmail, targetRole = 'professor'] = process.argv;

  if (!targetEmail || !['admin', 'professor', 'aluno'].includes(targetRole)) {
    console.error('Uso: node scripts/set-teacher-role.mjs <email-do-usuario> [admin|professor|aluno]');
    process.exit(1);
  }

  await runViaFirebaseCliToken(targetEmail, targetRole);
}

main().catch(err => {
  console.error('Erro ao atribuir permissão administrativa:', err.message);
  process.exit(1);
});
