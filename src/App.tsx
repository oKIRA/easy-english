/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './modules/auth/AuthContext';
import { ToastProvider, useToast } from './shared/design-system/Toast';
import { Topbar } from './shared/components/Topbar';
import { Sidebar } from './shared/components/Sidebar';
import { Button } from './shared/design-system/Button';
import { GraduationCap, LogIn } from 'lucide-react';

// Admin views
import { AdminOverview } from './modules/admin/AdminOverview';
import { UserManagement } from './modules/admin/UserManagement';
import { RelationshipManagement } from './modules/admin/RelationshipManagement';
import { StorageQuotaView } from './modules/admin/StorageQuotaView';
import { AuditLogsView } from './modules/admin/AuditLogsView';

// Teacher views
import { TeacherOverview } from './modules/teacher/TeacherOverview';
import { TeacherStudentsView } from './modules/teacher/TeacherStudentsView';
import { TeacherCoursesView } from './modules/teacher/TeacherCoursesView';
import { TeacherMaterialsView } from './modules/teacher/TeacherMaterialsView';
import { TeacherMediaView } from './modules/teacher/TeacherMediaView';
import { TeacherAssessmentsView } from './modules/teacher/TeacherAssessmentsView';
import { TeacherScheduleView } from './modules/teacher/TeacherScheduleView';
import { TeacherIntegrationsView } from './modules/teacher/TeacherIntegrationsView';

// Student views
import { StudentOverview } from './modules/student/StudentOverview';
import { MyTeacherView } from './modules/student/MyTeacherView';
import { StudentCoursesView } from './modules/student/StudentCoursesView';
import { StudentBookingView } from './modules/student/StudentBookingView';
import { StudentMaterialsView } from './modules/student/StudentMaterialsView';
import { StudentAssessmentsView } from './modules/student/StudentAssessmentsView';
import { StudentIntegrationsView } from './modules/student/StudentIntegrationsView';
import { StudentProgressView } from './modules/student/StudentProgressView';

// Shared Study Notes (Lovable Note-Taking inspired)
import { StudyNotesView } from './modules/notes/StudyNotesView';

function MainAppShell() {
  const { activeRole } = useAuth();
  const [currentView, setCurrentView] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // When role changes, reset to overview of that role
  useEffect(() => {
    setCurrentView('overview');
  }, [activeRole]);

  const viewTitles: Record<string, string> = {
    overview: 'Visão geral',
    courses: activeRole === 'student' ? 'Meus estudos' : 'Cursos e Aulas',
    notes: 'Materiais e Anotações',
    assessments: 'Atividades e tarefas',
    schedule: 'Agenda',
    booking: 'Agenda',
    progress: 'Progresso',
    my_teacher: 'Meu Professor Mentor',
    teachers: 'Professores',
    students: 'Alunos',
    users: 'Usuários e permissões',
    relationships: 'Vínculos aluno-professor',
    storage: 'Cotas e armazenamento',
    media: 'Vídeos e gravação',
    audit: 'Logs de auditoria',
    settings: 'Configurações',
    integrations: 'Configurações e Integrações',
  };

  const renderCurrentView = () => {
    if (activeRole === 'admin') {
      switch (currentView) {
        case 'overview':
          return <AdminOverview onNavigate={setCurrentView} />;
        case 'users':
          return <UserManagement />;
        case 'relationships':
          return <RelationshipManagement />;
        case 'notes':
          return <StudyNotesView />;
        case 'storage':
          return <StorageQuotaView />;
        case 'audit':
          return <AuditLogsView />;
        case 'settings':
          return <TeacherIntegrationsView />;
        default:
          return <AdminOverview onNavigate={setCurrentView} />;
      }
    }

    if (activeRole === 'teacher') {
      switch (currentView) {
        case 'overview':
          return <TeacherOverview onNavigate={setCurrentView} />;
        case 'students':
          return <TeacherStudentsView />;
        case 'courses':
          return <TeacherCoursesView />;
        case 'notes':
          return <StudyNotesView />;
        case 'media':
          return <TeacherMediaView />;
        case 'assessments':
          return <TeacherAssessmentsView />;
        case 'schedule':
          return <TeacherScheduleView />;
        case 'settings':
        case 'integrations':
          return <TeacherIntegrationsView />;
        default:
          return <TeacherOverview onNavigate={setCurrentView} />;
      }
    }

    // Default: student
    switch (currentView) {
      case 'overview':
        return <StudentOverview onNavigate={setCurrentView} />;
      case 'courses':
        return <StudentCoursesView />;
      case 'notes':
        return <StudyNotesView />;
      case 'assessments':
        return <StudentAssessmentsView />;
      case 'schedule':
      case 'booking':
        return <StudentBookingView />;
      case 'progress':
        return <StudentProgressView />;
      case 'my_teacher':
        return <MyTeacherView onNavigate={setCurrentView} />;
      case 'settings':
      case 'integrations':
        return <StudentIntegrationsView />;
      default:
        return <StudentOverview onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="app-backdrop font-sans text-[#0F172A] antialiased selection:bg-blue-100 selection:text-blue-900">
      <div className="app-window flex flex-col">
        <Topbar
          currentViewTitle={viewTitles[currentView] || 'Visão geral'}
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
        />

        <div className="flex-1 flex w-full min-h-0">
          <Sidebar
            currentView={currentView}
            onNavigate={setCurrentView}
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />

          <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 w-full overflow-x-hidden">
            {renderCurrentView()}
          </main>
        </div>
      </div>
    </div>
  );
}

function AuthScreen() {
  const { authError, createAccountWithEmail, signInWithEmail, signInWithGoogle } = useAuth();
  const { error } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');

  const handleEmailAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice('');
    try {
      if (isSignUp) {
        setIsCreatingAccount(true);
        await createAccountWithEmail(name, email, password);
        setIsSignUp(false);
        setName('');
        setPassword('');
        setNotice('Conta criada. Enviamos um link de confirmação para seu e-mail. Confirme o endereço antes de entrar.');
      } else {
        setIsSigningIn(true);
        await signInWithEmail(email, password);
      }
    } catch (err) {
      error(isSignUp ? 'Não foi possível criar a conta' : 'Não foi possível entrar', err instanceof Error ? err.message : String(err));
    } finally {
      setIsCreatingAccount(false);
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setNotice('');
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch (err) {
      error('Não foi possível entrar com Google', err instanceof Error ? err.message : String(err));
      setIsSigningIn(false);
    }
  };

  return (
    <div className="app-backdrop flex items-center justify-center font-sans text-[#0F172A] antialiased">
      <div className="app-window flex min-h-[min(620px,calc(100vh-24px))] w-full max-w-xl flex-col items-center justify-center gap-5 px-6 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
          <GraduationCap className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Easy English</h1>
          <p className="mt-2 text-sm text-slate-500">
            {isSignUp ? 'Crie sua conta para acessar a plataforma.' : 'Entre com sua conta para acessar a plataforma.'}
          </p>
        </div>
        {authError && (
          <p role="alert" className="max-w-md rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-xs text-rose-800">
            {authError}
            {authError.includes('Cloud Firestore') && (
              <a
                href="https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=easy-english-4c948"
                target="_blank"
                rel="noreferrer"
                className="mt-2 block font-semibold underline"
              >
                Abrir configuração da API Cloud Firestore
              </a>
            )}
          </p>
        )}
        {notice && (
          <p role="status" className="max-w-md rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-xs text-emerald-800">
            {notice}
          </p>
        )}
        <form onSubmit={handleEmailAuth} className="w-full max-w-sm space-y-3 text-left">
          {isSignUp && (
            <label className="block text-xs font-semibold text-slate-700">
              Nome completo
              <input
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Seu nome"
              />
            </label>
          )}
          <label className="block text-xs font-semibold text-slate-700">
            E-mail
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
              placeholder="voce@exemplo.com"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Senha
            <input
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
              placeholder="Mínimo de 6 caracteres"
            />
          </label>
          {isSignUp && (
            <p className="text-[11px] leading-relaxed text-slate-500">
              A conta administrativa só será concedida ao e-mail administrador configurado no projeto, após a confirmação do endereço.
            </p>
          )}
          <Button
            type="submit"
            isLoading={isSignUp ? isCreatingAccount : isSigningIn}
            className="w-full"
            leftIcon={<LogIn className="h-4 w-4" />}
          >
            {isSignUp ? 'Criar conta' : 'Entrar com e-mail'}
          </Button>
        </form>
        <div className="w-full max-w-sm space-y-3">
          <button
            type="button"
            onClick={() => {
              setIsSignUp((current) => !current);
              setNotice('');
            }}
            className="w-full text-xs font-semibold text-blue-700 hover:text-blue-900"
          >
            {isSignUp ? 'Já tem uma conta? Entrar' : 'Criar uma conta'}
          </button>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            ou
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            isLoading={isSigningIn && !isSignUp}
            className="w-full"
          >
            Continuar com Google
          </Button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { currentUser, firebaseUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-backdrop flex items-center justify-center font-sans text-slate-600">
        <div className="app-window flex min-h-[min(560px,calc(100vh-24px))] w-full items-center justify-center">
          Carregando sua conta...
        </div>
      </div>
    );
  }

  if (firebaseUser) {
    return <MainAppShell />;
  }

  return <AuthScreen />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
