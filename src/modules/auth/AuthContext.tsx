import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  getRedirectResult,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { auth, db } from '../../infrastructure/firebase/firebase';
import { User, UserRole } from '../../shared/types';

const BOOTSTRAP_ADMIN_EMAIL = 'luan.c.oliveira11@gmail.com';

interface UserInvitation {
  name: string;
  email: string;
  role: UserRole;
  specialties?: string[];
}

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  authError: string | null;
  activeRole: UserRole;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  createAccountWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getSignInErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    switch (error.code) {
      case 'auth/configuration-not-found':
        return 'O login Google não está habilitado no Firebase. No Console, abra Authentication > Sign-in method, habilite Google e salve.';
      case 'auth/unauthorized-domain':
        return 'Este domínio ainda não está autorizado. Adicione o endereço atual em Authentication > Settings > Authorized domains no Firebase.';
      case 'auth/operation-not-allowed':
        return 'O método de e-mail e senha não está habilitado. No Firebase Console, abra Authentication > Sign-in method e ative E-mail/senha.';
      case 'auth/email-already-in-use':
        return 'Este e-mail já possui uma conta. Entre com sua senha ou use a opção de login com Google.';
      case 'auth/weak-password':
        return 'A senha precisa ter pelo menos 6 caracteres.';
      case 'auth/invalid-credential':
        return 'E-mail ou senha incorretos.';
      case 'auth/popup-blocked':
      case 'auth/popup-closed-by-user':
        return 'O login foi interrompido pelo navegador. Tente novamente e permita a abertura da página de autenticação.';
      default:
        return error instanceof Error ? error.message : 'Não foi possível concluir a autenticação.';
    }
  }
  return error instanceof Error ? error.message : 'Não foi possível concluir o login com Google.';
}

function getProfileErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes('service_disabled') ||
    normalizedMessage.includes('cloud firestore api has not been used') ||
    normalizedMessage.includes('cloud firestore api is disabled')
  ) {
    return 'Sua conta Google foi autenticada, mas o Cloud Firestore ainda não está ativado neste projeto. Ative a API e crie o banco padrão (default) no Firebase Console para continuar.';
  }

  if (normalizedMessage.includes('permission-denied') || normalizedMessage.includes('missing or insufficient permissions')) {
    return 'Sua conta Google foi autenticada, mas as regras do Firestore ainda não permitem carregar seu perfil. Revise e publique as regras do projeto.';
  }

  return `Não foi possível carregar o perfil no Firestore: ${message}`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const isPasswordAccount = fbUser.providerData.some((provider) => provider.providerId === 'password');
        if (isPasswordAccount && !fbUser.emailVerified) {
          setCurrentUser(null);
          setAuthError('Confirme seu e-mail antes de entrar na plataforma.');
          setIsLoading(false);
          return;
        }

        setAuthError(null);
        try {
          const email = fbUser.email?.trim().toLowerCase();
          if (!email) {
            throw new Error('A conta Google não forneceu um endereço de e-mail.');
          }

          const userDocRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);
          const isBootstrapAdmin = email === BOOTSTRAP_ADMIN_EMAIL;

          if (userSnap.exists()) {
            const userData = userSnap.data() as User;
            const role = isBootstrapAdmin ? 'admin' : userData.role;
            const mergedUser = { ...userData, uid: fbUser.uid, role, email } as User;
            if (role !== userData.role) {
              await setDoc(userDocRef, { role, updatedAt: serverTimestamp() }, { merge: true });
            }
            setCurrentUser(mergedUser);
          } else {
            const invitationRef = doc(db, 'userInvitations', email);
            const invitationSnap = isBootstrapAdmin ? null : await getDoc(invitationRef);
            const invitation = invitationSnap?.exists()
              ? invitationSnap.data() as UserInvitation
              : null;
            const role = isBootstrapAdmin ? 'admin' : invitation?.role || 'student';
            const newUser: User = {
              uid: fbUser.uid,
              name: invitation?.name || fbUser.displayName || 'Novo Usuário',
              email,
              photoURL: fbUser.photoURL || null,
              role,
              status: 'active',
              timezone: 'America/Sao_Paulo',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const batch = writeBatch(db);
            batch.set(userDocRef, {
              ...newUser,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            if (role === 'teacher') {
              batch.set(doc(db, 'teacherProfiles', fbUser.uid), {
                teacherId: fbUser.uid,
                bio: 'Professor de inglês credenciado pela coordenação acadêmica.',
                specialties: invitation?.specialties || [],
                languages: ['Inglês', 'Português'],
                timezone: 'America/Sao_Paulo',
                bookingSettings: {
                  slotDurationMinutes: 45,
                  advanceNoticeHours: 12,
                  cancellationNoticeHours: 24,
                  maxAdvanceDays: 30,
                },
                isAcceptingStudents: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }

            if (invitation) batch.delete(invitationRef);
            await batch.commit();
            setCurrentUser(newUser);
          }
        } catch (err) {
          console.error('Error synchronizing authenticated user profile:', err);
          setCurrentUser(null);
          setAuthError(getProfileErrorMessage(err));
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setFirebaseUser(result.user);
        }
      })
      .catch((err: unknown) => {
        setAuthError(getSignInErrorMessage(err));
        setIsLoading(false);
        console.error('Google redirect sign-in failed:', err);
      });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setAuthError(null);
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (err) {
      console.error('Google Sign In failed:', err);
      setIsLoading(false);
      const message = getSignInErrorMessage(err);
      setAuthError(message);
      throw new Error(message);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setAuthError(null);
      setIsLoading(true);
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!credential.user.emailVerified) {
        await firebaseSignOut(auth);
        throw new Error('Confirme seu e-mail pelo link enviado antes de entrar.');
      }
    } catch (err) {
      setIsLoading(false);
      const message = getSignInErrorMessage(err);
      setAuthError(message);
      throw new Error(message);
    }
  };

  const createAccountWithEmail = async (name: string, email: string, password: string) => {
    try {
      setAuthError(null);
      setIsLoading(true);
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: name.trim() });
      await sendEmailVerification(credential.user, { url: window.location.origin });
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setCurrentUser(null);
    } catch (err) {
      if (auth.currentUser) await firebaseSignOut(auth);
      setIsLoading(false);
      const message = getSignInErrorMessage(err);
      setAuthError(message);
      throw new Error(message);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setCurrentUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        isLoading,
        authError,
        activeRole: currentUser?.role || 'student',
        signInWithGoogle,
        signInWithEmail,
        createAccountWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
