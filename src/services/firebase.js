/**
 * firebase.js — Inicialização central do Firebase (Auth, Cloud Firestore, App Check e Emulator Suite)
 * Projeto único: cetep-tech-study (Região Firestore: southamerica-east1 - São Paulo)
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as updateFirebaseAuthProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  linkWithCredential,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

const EMULATOR_OVERRIDE_KEY = 'cetep_use_firebase_emulator';

export function isUsingEmulator() {
  // Em produção (build Vercel), NUNCA conecta aos emuladores locais
  if (env.PROD) return false;
  try {
    if (typeof localStorage !== 'undefined') {
      const override = localStorage.getItem(EMULATOR_OVERRIDE_KEY);
      if (override === 'true') return true;
      if (override === 'false') return false;
    }
  } catch {
    // ignore storage errors in non-browser environments
  }
  return env.VITE_USE_FIREBASE_EMULATOR === 'true';
}

export function setUseEmulatorOverride(enabled) {
  try {
    if (typeof localStorage !== 'undefined') {
      if (enabled === null || enabled === undefined) {
        localStorage.removeItem(EMULATOR_OVERRIDE_KEY);
      } else {
        localStorage.setItem(EMULATOR_OVERRIDE_KEY, enabled ? 'true' : 'false');
      }
    }
  } catch {
    // ignore
  }
}

export const FIREBASE_PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID || 'cetep-tech-study';

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || (isUsingEmulator() ? 'demo-cetep-tech-study-api-key' : ''),
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
};

export function isFirebaseConfigured() {
  return Boolean(env.VITE_FIREBASE_API_KEY) || isUsingEmulator();
}

let app = null;
let auth = null;
let db = null;
let appCheck = null;
let emulatorsConnected = false;

if (typeof window !== 'undefined' && isFirebaseConfigured()) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    // Conecta ao Firebase Emulator Suite quando habilitado (testes locais sem poluir produção)
    if (isUsingEmulator() && !emulatorsConnected) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
      emulatorsConnected = true;
    }

    // Configura persistência local de sessão
    setPersistence(auth, browserLocalPersistence).catch(() => {});

    // Inicializa Firebase App Check (quando a chave pública do reCAPTCHA v3 estiver configurada)
    const appCheckSiteKey = env.VITE_FIREBASE_APPCHECK_SITE_KEY;
    if (appCheckSiteKey && !isUsingEmulator()) {
      if (env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN && env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN !== 'false') {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN =
          env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN === 'true'
            ? true
            : env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;
      }
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  } catch (err) {
    console.error('[Firebase] Falha ao inicializar SDK:', err);
  }
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Armazena credencial pendente quando um mesmo e-mail tenta entrar por outro provedor
let pendingLinkCredential = null;

/**
 * Traduz códigos de erro do Firebase Auth para mensagens claras em português.
 */
export function translateFirebaseAuthError(error) {
  const code = error?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado. Faça login ou use "Esqueci minha senha".';
    case 'auth/invalid-email':
      return 'O endereço de e-mail informado é inválido.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada pela coordenação.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns instantes ou redefina sua senha.';
    case 'auth/popup-closed-by-user':
      return 'A janela de login com Google foi fechada antes de concluir.';
    case 'auth/popup-blocked':
      return 'O navegador bloqueou a janela pop-up. Permita pop-ups para entrar com Google.';
    case 'auth/unauthorized-domain':
      return 'Este domínio ainda não está autorizado no Firebase Authentication.';
    case 'auth/account-exists-with-different-credential':
      return 'Este e-mail já possui conta criada com senha. Entre com seu e-mail e senha uma vez para vincular seu login Google automaticamente.';
    case 'auth/network-request-failed':
      return isUsingEmulator()
        ? 'Não foi possível conectar ao Firebase Emulator Suite (127.0.0.1:9099). Verifique se o emulador está rodando.'
        : 'Falha de conexão com a internet. Verifique sua rede e tente novamente.';
    case 'auth/requires-recent-login':
      return 'Por segurança, saia e entre novamente antes de alterar dados sensíveis.';
    default:
      return error?.message || 'Ocorreu um erro na autenticação. Tente novamente.';
  }
}

/**
 * Sincroniza e retorna o documento de perfil do usuário em `/users/{uid}`.
 * SEGURANÇA: Cadastro público NUNCA concede `role: 'professor'` ou `'admin'`.
 * Privilégios de professor só são reconhecidos via Custom Claim assinado no servidor
 * ou documento já existente atribuído por procedimento administrativo.
 */
export async function ensureFirestoreUserProfile(firebaseUser, { fallbackName = '' } = {}) {
  if (!firebaseUser) return null;

  let customClaimRole = null;
  try {
    const tokenResult = await firebaseUser.getIdTokenResult(true);
    if (tokenResult?.claims?.admin === true || tokenResult?.claims?.role === 'admin') {
      customClaimRole = 'admin';
    } else if (tokenResult?.claims?.role === 'professor') {
      customClaimRole = 'professor';
    }
  } catch {
    // ignore token claim lookup error
  }

  const uid = firebaseUser.uid;
  const email = (firebaseUser.email || '').toLowerCase();
  const displayName = (firebaseUser.displayName || fallbackName || email.split('@')[0] || 'Estudante').trim().slice(0, 120);
  const providers = (firebaseUser.providerData || []).map(p => p.providerId).filter(Boolean);

  if (!db) {
    return {
      id: uid,
      uid,
      name: displayName,
      email,
      role: customClaimRole || 'aluno',
      photoURL: firebaseUser.photoURL || null,
      emailVerified: Boolean(firebaseUser.emailVerified),
      authProviders: providers,
      assignedClassIds: [],
      enrolledClassIds: [],
    };
  }

  const userRef = doc(db, 'users', uid);
  const nowISO = new Date().toISOString();

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      // Criação inicial: SEMPRE role === 'aluno' no cadastro público (ou customClaimRole se já for admin no Auth)
      const initialRole = customClaimRole === 'admin' ? 'admin' : 'aluno';
      const newProfile = {
        id: uid,
        uid,
        name: displayName,
        email,
        role: initialRole,
        photoURL: firebaseUser.photoURL || null,
        emailVerified: Boolean(firebaseUser.emailVerified),
        authProviders: providers.length ? providers : ['password'],
        migratedFromLocal: false,
        assignedClassIds: [],
        enrolledClassIds: [],
        createdAt: nowISO,
        updatedAt: nowISO,
      };
      await setDoc(userRef, newProfile);
      return {
        ...newProfile,
        role: customClaimRole || newProfile.role,
      };
    }

    const existing = snap.data();
    const effectiveRole = customClaimRole || existing.role || 'aluno';
    const updatedProfile = {
      id: existing.id || uid,
      uid,
      name: existing.name || displayName,
      email: existing.email || email,
      role: existing.role || 'aluno', // Mantém role do documento (imutável por não-admins)
      photoURL: firebaseUser.photoURL || existing.photoURL || null,
      emailVerified: Boolean(firebaseUser.emailVerified),
      authProviders: providers.length ? providers : (existing.authProviders || ['password']),
      migratedFromLocal: Boolean(existing.migratedFromLocal),
      assignedClassIds: Array.isArray(existing.assignedClassIds) ? existing.assignedClassIds : [],
      enrolledClassIds: Array.isArray(existing.enrolledClassIds) ? existing.enrolledClassIds : [],
      createdAt: existing.createdAt || nowISO,
      updatedAt: nowISO,
    };

    // Se o usuário possui Custom Claim de admin assinada no servidor, sincroniza no documento
    if (customClaimRole === 'admin' && updatedProfile.role !== 'admin') {
      updatedProfile.role = 'admin';
    }

    await setDoc(userRef, updatedProfile);
    return {
      ...updatedProfile,
      role: effectiveRole,
    };
  } catch (err) {
    console.warn('[Firestore] Não foi possível sincronizar perfil em /users/{uid}:', err);
    return {
      id: uid,
      uid,
      name: displayName,
      email,
      role: customClaimRole || 'aluno',
      photoURL: firebaseUser.photoURL || null,
      emailVerified: Boolean(firebaseUser.emailVerified),
      authProviders: providers,
      assignedClassIds: [],
      enrolledClassIds: [],
    };
  }
}

/**
 * Cadastro com E-mail e Senha + Envio automático de verificação de e-mail.
 * Força `role: 'aluno'` no cadastro público.
 */
export async function registerWithFirebase({ name, email, password }) {
  if (!auth) throw new Error('Firebase Auth não está configurado.');
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = (name || '').trim();

  try {
    const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    if (cleanName) {
      await updateFirebaseAuthProfile(credential.user, { displayName: cleanName });
    }

    // Dispara e-mail de verificação (não bloqueia cadastro caso falhe no emulador)
    let verificationSent = false;
    try {
      await sendEmailVerification(credential.user);
      verificationSent = true;
    } catch (verifyErr) {
      console.warn('[Auth] Aviso ao enviar verificação de e-mail:', verifyErr);
    }

    const profile = await ensureFirestoreUserProfile(credential.user, { fallbackName: cleanName });
    return { ...profile, verificationSent };
  } catch (err) {
    throw new Error(translateFirebaseAuthError(err));
  }
}

/**
 * Login com E-mail e Senha (e vinculação automática de credencial Google pendente, se houver).
 */
export async function loginWithFirebase({ email, password }) {
  if (!auth) throw new Error('Firebase Auth não está configurado.');
  const cleanEmail = email.trim().toLowerCase();

  try {
    const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);

    // Se havia uma tentativa anterior de login com Google para este mesmo e-mail,
    // vincula os provedores na mesma conta (evitando contas duplicadas).
    if (pendingLinkCredential) {
      try {
        await linkWithCredential(credential.user, pendingLinkCredential);
      } catch (linkErr) {
        console.warn('[Auth] Não foi possível vincular credencial pendente:', linkErr);
      } finally {
        pendingLinkCredential = null;
      }
    }

    return await ensureFirestoreUserProfile(credential.user);
  } catch (err) {
    throw new Error(translateFirebaseAuthError(err));
  }
}

/**
 * Login com Google (suporta contas pessoais Gmail e institucionais Google Workspace).
 * Trata conflitos de mesmo e-mail com métodos diferentes para evitar contas duplicadas.
 */
export async function loginWithGoogle() {
  if (!auth) throw new Error('Firebase Auth não está configurado.');
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return await ensureFirestoreUserProfile(result.user);
  } catch (err) {
    if (err?.code === 'auth/account-exists-with-different-credential') {
      pendingLinkCredential = GoogleAuthProvider.credentialFromError(err);
    }
    throw new Error(translateFirebaseAuthError(err));
  }
}

/**
 * Reenvia o e-mail de verificação para o usuário autenticado.
 */
export async function resendVerificationEmail() {
  if (!auth?.currentUser) throw new Error('Nenhum usuário autenticado.');
  try {
    await sendEmailVerification(auth.currentUser);
    return true;
  } catch (err) {
    throw new Error(translateFirebaseAuthError(err));
  }
}

/**
 * Recarrega o estado de verificação de e-mail do usuário atual no Firebase Auth.
 */
export async function refreshEmailVerificationStatus() {
  if (!auth?.currentUser) return false;
  await auth.currentUser.reload();
  const verified = Boolean(auth.currentUser.emailVerified);
  if (verified && db) {
    await ensureFirestoreUserProfile(auth.currentUser);
  }
  return verified;
}

/**
 * Envia link de recuperação de senha para o e-mail informado.
 */
export async function sendPasswordReset(email) {
  if (!auth) throw new Error('Firebase Auth não está configurado.');
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    throw new Error('Informe um endereço de e-mail válido para recuperar a senha.');
  }
  try {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    return true;
  } catch (err) {
    throw new Error(translateFirebaseAuthError(err));
  }
}

/**
 * Altera a senha do usuário autenticado (exige reautenticação com a senha atual).
 */
export async function changeFirebasePassword(currentPassword, newPassword) {
  if (!auth?.currentUser) throw new Error('Nenhum usuário autenticado.');
  const user = auth.currentUser;
  if (!user.email) throw new Error('Sua conta não possui e-mail associado.');

  try {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    return true;
  } catch (err) {
    throw new Error(translateFirebaseAuthError(err));
  }
}

/**
 * Atualiza o nome de exibição do usuário no Firebase Auth e no documento `/users/{uid}`.
 */
export async function updateFirebaseUserProfile(uid, updates) {
  if (!auth?.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('Operação não autorizada.');
  }
  const cleanName = (updates.name || auth.currentUser.displayName || '').trim().slice(0, 120);
  if (cleanName) {
    await updateFirebaseAuthProfile(auth.currentUser, { displayName: cleanName });
  }
  return await ensureFirestoreUserProfile(auth.currentUser, { fallbackName: cleanName });
}

export async function signOutFirebase() {
  if (!auth) return;
  await signOut(auth);
}

export { app, auth, db, appCheck, onAuthStateChanged };
