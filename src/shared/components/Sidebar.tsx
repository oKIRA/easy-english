import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  CheckSquare,
  Calendar,
  BarChart3,
  GraduationCap,
  Users,
  Settings,
  Link2,
  HardDrive,
  FileCheck2,
  Video,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../modules/auth/AuthContext';
import { Badge } from '../design-system/Badge';

export interface SidebarProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpen = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { currentUser, activeRole, isDemoMode, signOut } = useAuth();

  // Navigation Items per Role
  const studentNav = [
    { id: 'overview', label: 'Visão geral', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'courses', label: 'Meus estudos', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'notes', label: 'Materiais e anotações', icon: <FileText className="w-4 h-4" /> },
    { id: 'assessments', label: 'Atividades e tarefas', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'schedule', label: 'Agenda', icon: <Calendar className="w-4 h-4" /> },
    { id: 'progress', label: 'Progresso', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'my_teacher', label: 'Professores', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'settings', label: 'Configurações', icon: <Settings className="w-4 h-4" /> },
  ];

  const teacherNav = [
    { id: 'overview', label: 'Visão geral', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'courses', label: 'Meus cursos e aulas', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'notes', label: 'Materiais e anotações', icon: <FileText className="w-4 h-4" /> },
    { id: 'assessments', label: 'Atividades e tarefas', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'schedule', label: 'Agenda e horários', icon: <Calendar className="w-4 h-4" /> },
    { id: 'students', label: 'Alunos', icon: <Users className="w-4 h-4" /> },
    { id: 'media', label: 'Vídeos e gravação', icon: <Video className="w-4 h-4" /> },
    { id: 'settings', label: 'Configurações', icon: <Settings className="w-4 h-4" /> },
  ];

  const adminNav = [
    { id: 'overview', label: 'Visão geral', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'users', label: 'Usuários e permissões', icon: <Users className="w-4 h-4" /> },
    { id: 'relationships', label: 'Vínculos aluno-professor', icon: <Link2 className="w-4 h-4" /> },
    { id: 'notes', label: 'Materiais e anotações', icon: <FileText className="w-4 h-4" /> },
    { id: 'storage', label: 'Cotas e armazenamento', icon: <HardDrive className="w-4 h-4" /> },
    { id: 'audit', label: 'Logs de auditoria', icon: <FileCheck2 className="w-4 h-4" /> },
    { id: 'settings', label: 'Configurações', icon: <Settings className="w-4 h-4" /> },
  ];

  const navItems = activeRole === 'admin' ? adminNav : activeRole === 'teacher' ? teacherNav : studentNav;

  const roleLabels = {
    admin: 'Administração',
    teacher: 'Professor Mentor',
    student: 'Estudante',
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-2xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-[#E2E8F0] transition-all duration-200 ease-in-out md:static md:translate-x-0 flex flex-col justify-between ${
          isOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        } ${isCollapsed ? 'md:w-20' : 'md:w-64 w-72'}`}
      >
        {/* Top: Logo & Platform Identity */}
        <div>
          <div className={`h-16 flex items-center border-b border-[#E2E8F0] px-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs shrink-0">
                <GraduationCap className="h-5 w-5" />
              </div>
              {!isCollapsed && (
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold tracking-tight text-slate-900">Easy English</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium tracking-tight block">
                    Plataforma de Estudos
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Collapse Toggle */}
            {!isCollapsed && onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden md:flex p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Recolher menu lateral"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <div className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    onClose?.();
                  }}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-150 ${
                    isCollapsed ? 'justify-center px-2' : 'text-left'
                  } ${
                    isActive
                      ? 'bg-[#EFF6FF] text-[#1E3A8A] font-semibold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className={`shrink-0 ${isActive ? 'text-[#2563EB]' : 'text-slate-400'}`}>
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Section: User Profile & Expand Toggle */}
        <div className="p-3 border-t border-[#E2E8F0] space-y-2">
          {/* User Profile Mini Bar */}
          <div className={`flex items-center gap-2.5 p-2 rounded-xl bg-slate-50/70 border border-slate-100 ${isCollapsed ? 'justify-center p-1.5' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              {currentUser?.name
                ? currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                : 'EE'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {currentUser?.name || 'Estudante'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {roleLabels[activeRole]}
                </p>
              </div>
            )}
            {!isCollapsed && !isDemoMode && (
              <button
                onClick={() => signOut()}
                className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                title="Sair"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* If collapsed, offer button to expand */}
          {isCollapsed && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              title="Expandir barra lateral"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
