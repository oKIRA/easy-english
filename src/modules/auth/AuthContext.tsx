import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../infrastructure/firebase/firebase';
import { User, UserRole } from '../../shared/types';

// Pre-configured pedagogical demo personas for instant full evaluation
export const DEMO_USERS: Record<string, User> = {
  admin: {
    uid: 'demo-admin-01',
    name: 'Helena Rocha (Admin)',
    email: 'admin.helena@easyenglish.edu',
    role: 'admin',
    status: 'active',
    timezone: 'America/Sao_Paulo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  teacher: {
    uid: 'demo-teacher-01',
    name: 'Prof. Michael Davies (Teacher)',
    email: 'michael.davies@easyenglish.edu',
    role: 'teacher',
    status: 'active',
    timezone: 'America/Sao_Paulo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  student: {
    uid: 'demo-student-01',
    name: 'Beatriz Santos (Student)',
    email: 'beatriz.santos@student.easyenglish.edu',
    role: 'student',
    status: 'active',
    timezone: 'America/Sao_Paulo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  activeRole: UserRole;
  isDemoMode: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  switchDemoRole: (role: 'admin' | 'teacher' | 'student') => void;
  registerStudentWithEmail: (name: string, email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(DEMO_USERS.admin); // Default to admin for immediate exploration
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser && !isDemoMode) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            setCurrentUser(userSnap.data() as User);
          } else {
            // New user registration. Determine role: only bootstrap email can be admin, rest MUST be student!
            const isRootAdmin = fbUser.email === 'luan.c.oliveira11@gmail.com';
            const newUser: User = {
              uid: fbUser.uid,
              name: fbUser.displayName || 'Novo Usuário',
              email: fbUser.email || '',
              photoURL: fbUser.photoURL || null,
              role: isRootAdmin ? 'admin' : 'student',
              status: 'active',
              timezone: 'America/Sao_Paulo',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, {
              ...newUser,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            setCurrentUser(newUser);
          }
        } catch (err) {
          console.error('Error synchronizing authenticated user profile:', err);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isDemoMode]);

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      setIsDemoMode(false);
      const result = await signInWithPopup(auth, provider);
      setFirebaseUser(result.user);
    } catch (err) {
      console.error('Google Sign In failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      // Fallback to demo mode for uninterrupted UI testing
      setIsDemoMode(true);
      setCurrentUser(DEMO_USERS.admin);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const switchDemoRole = (role: 'admin' | 'teacher' | 'student') => {
    setIsDemoMode(true);
    setCurrentUser(DEMO_USERS[role]);
  };

  const registerStudentWithEmail = async (name: string, email: string) => {
    // Spec rule: "O cadastro público deve criar somente usuários com papel student."
    const dummyUid = `student-${Math.random().toString(36).substring(2, 9)}`;
    const newStudent: User = {
      uid: dummyUid,
      name,
      email,
      role: 'student',
      status: 'active',
      timezone: 'America/Sao_Paulo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'users', dummyUid), {
        ...newStudent,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // Also initialize empty student profile
      await setDoc(doc(db, 'studentProfiles', dummyUid), {
        studentId: dummyUid,
        englishLevel: 'A1',
        learningGoals: ['General English Fluency', 'Career Communication'],
        notes: 'Inscrição via portal do aluno',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setCurrentUser(newStudent);
      setIsDemoMode(true);
    } catch (e) {
      console.error('Failed to create student:', e);
      throw e;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        isLoading,
        activeRole: currentUser?.role || 'student',
        isDemoMode,
        signInWithGoogle,
        signOut,
        switchDemoRole,
        registerStudentWithEmail,
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
