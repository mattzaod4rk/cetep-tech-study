import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as DataService from '../services/DataService.js';
import {
  auth,
  onAuthStateChanged,
  isFirebaseConfigured,
  isUsingEmulator,
  ensureFirestoreUserProfile,
  registerWithFirebase,
  loginWithFirebase,
  loginWithGoogle as firebaseLoginWithGoogle,
  sendPasswordReset,
  resendVerificationEmail,
  refreshEmailVerificationStatus,
  changeFirebasePassword,
  updateFirebaseUserProfile,
  signOutFirebase,
} from '../services/firebase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const cloudEnabled = isFirebaseConfigured() && Boolean(auth);

  useEffect(() => {
    let unsubFirestore = null;

    if (!cloudEnabled) {
      const session = DataService.getSession();
      setUser(session);
      setLoading(false);
      return undefined;
    }

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubFirestore) {
        try { unsubFirestore(); } catch {}
        unsubFirestore = null;
      }

      if (!firebaseUser) {
        DataService.logout();
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await ensureFirestoreUserProfile(firebaseUser);
        const sessionUser = DataService.setSessionUser(profile);
        setUser(sessionUser);
        unsubFirestore = DataService.startRealtimeSyncForUser(sessionUser.id);
      } catch (err) {
        console.warn('[AuthContext] Erro ao carregar perfil autenticado:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      try { unsubAuth(); } catch {}
      if (unsubFirestore) {
        try { unsubFirestore(); } catch {}
      }
    };
  }, [cloudEnabled]);

  const login = useCallback(async (credentials) => {
    if (cloudEnabled) {
      const profile = await loginWithFirebase(credentials);
      const sessionUser = DataService.setSessionUser(profile);
      setUser(sessionUser);
      return sessionUser;
    }
    const sessionUser = await DataService.login(credentials);
    setUser(sessionUser);
    return sessionUser;
  }, [cloudEnabled]);

  const register = useCallback(async (userData) => {
    // Segurança: cadastro público SEMPRE cria conta de estudante ('aluno')
    const safeUserData = { ...userData, role: 'aluno' };
    if (cloudEnabled) {
      const profile = await registerWithFirebase(safeUserData);
      const sessionUser = DataService.setSessionUser(profile);
      setUser(sessionUser);
      return { ...sessionUser, verificationSent: profile.verificationSent };
    }
    const sessionUser = await DataService.register(safeUserData);
    setUser(sessionUser);
    return sessionUser;
  }, [cloudEnabled]);

  const loginWithGoogle = useCallback(async () => {
    if (!cloudEnabled) {
      throw new Error('O Login com Google requer o Firebase Authentication ativo.');
    }
    const profile = await firebaseLoginWithGoogle();
    const sessionUser = DataService.setSessionUser(profile);
    setUser(sessionUser);
    return sessionUser;
  }, [cloudEnabled]);

  const resetPassword = useCallback(async (email) => {
    if (!cloudEnabled) {
      throw new Error('A recuperação de senha por e-mail requer o Firebase Authentication ativo.');
    }
    return await sendPasswordReset(email);
  }, [cloudEnabled]);

  const resendVerification = useCallback(async () => {
    if (!cloudEnabled) return false;
    return await resendVerificationEmail();
  }, [cloudEnabled]);

  const checkEmailVerified = useCallback(async () => {
    if (!cloudEnabled) return true;
    const verified = await refreshEmailVerificationStatus();
    if (verified) {
      setUser(prev => {
        if (!prev) return prev;
        const updated = { ...prev, emailVerified: true };
        DataService.setSessionUser(updated);
        return updated;
      });
    }
    return verified;
  }, [cloudEnabled]);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    if (cloudEnabled) {
      return await changeFirebasePassword(currentPassword, newPassword);
    }
    await DataService.login({ email: user.email, password: currentPassword });
    await DataService.updateUserProfile(user.id, { password: newPassword });
    return true;
  }, [cloudEnabled, user]);

  const logout = useCallback(async () => {
    if (cloudEnabled) {
      await signOutFirebase();
    }
    DataService.logout();
    setUser(null);
  }, [cloudEnabled]);

  const updateProfile = useCallback(async (updates) => {
    if (!user) return null;
    if (cloudEnabled) {
      const updated = await updateFirebaseUserProfile(user.id, updates);
      const sessionUser = DataService.setSessionUser(updated);
      setUser(sessionUser);
      return sessionUser;
    }
    const updated = await DataService.updateUserProfile(user.id, updates);
    setUser(updated);
    return updated;
  }, [cloudEnabled, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isCloudEnabled: cloudEnabled,
        usingEmulator: isUsingEmulator(),
        login,
        register,
        loginWithGoogle,
        resetPassword,
        resendVerification,
        checkEmailVerified,
        changePassword,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
