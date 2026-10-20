/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './modules/auth/AuthContext';
import { ToastProvider, useToast } from './shared/design-system/Toast';
import { Topbar } from './shared/components/Topbar';
import { Sidebar } from './shared/components/Sidebar';

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

// Seeder
import { isDatabaseSeeded, seedInitialDatabase } from './services/seedService';
import { testFirestoreConnection } from './infrastructure/firebase/firebase';

function MainAppShell() {
  const { activeRole } = useAuth();
  const { info } = useToast();
  const [currentView, setCurrentView] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // When role changes, reset to overview of that role
  useEffect(() => {
    setCurrentView('overview');
  }, [activeRole]);

  // Check connection and seed database on initial boot if empty
  useEffect(() => {
    async function bootCheck() {
      try {
        await testFirestoreConnection();
        const seeded = await isDatabaseSeeded();
        if (!seeded) {
          console.log('Database empty. Seeding initial data...');
          await seedInitialDatabase();
        }
      } catch (e) {
        console.warn('Initial boot check notice:', e);
      }
    }
    bootCheck();
  }, []);

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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-[#0F172A] antialiased selection:bg-blue-100 selection:text-blue-900">
      <Topbar
        currentViewTitle={viewTitles[currentView] || 'Visão geral'}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        searchQuery={globalSearch}
        onSearchChange={setGlobalSearch}
      />

      <div className="flex-1 flex w-full">
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainAppShell />
      </AuthProvider>
    </ToastProvider>
  );
}
