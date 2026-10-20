import React, { useState } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  CheckCircle2,
  Database,
  Sparkles,
  ShieldCheck,
  BookOpen,
  UserCheck,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../modules/auth/AuthContext';
import { Badge } from '../design-system/Badge';
import { Button } from '../design-system/Button';
import { seedInitialDatabase } from '../../services/seedService';
import { useToast } from '../design-system/Toast';

export interface TopbarProps {
  currentViewTitle?: string;
  onMenuToggle?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentViewTitle = 'Visão geral',
  onMenuToggle,
  searchQuery = '',
  onSearchChange,
}) => {
  const { currentUser, activeRole, isDemoMode, switchDemoRole, signInWithGoogle, signOut } = useAuth();
  const { success, error } = useToast();

  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      await seedInitialDatabase();
      success('Banco de dados carregado', 'Dados pedagógicos e avaliações prontos.');
    } catch (err) {
      error('Falha ao inicializar dados', String(err));
    } finally {
      setIsSeeding(false);
    }
  };

  const roleConfigs = {
    admin: { label: 'Administrador', badge: 'rose', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    teacher: { label: 'Professor', badge: 'emerald', icon: <BookOpen className="w-3.5 h-3.5" /> },
    student: { label: 'Aluno', badge: 'blue', icon: <UserCheck className="w-3.5 h-3.5" /> },
  } as const;

  const currentRoleBadge = roleConfigs[activeRole] || roleConfigs.student;

  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
    : 'EE';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E2E8F0] bg-white px-4 md:px-8">
      {/* Left: Mobile Toggle & Page Title & Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Abrir menu lateral"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="hidden sm:flex flex-col text-left min-w-[140px]">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <span>Easy English</span>
            <span>/</span>
            <span className="text-slate-600 font-medium capitalize">{currentViewTitle}</span>
          </div>
          <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none mt-0.5">{currentViewTitle}</h1>
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1 max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Pesquisar estudos, aulas, notas..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full rounded-xl bg-slate-100/80 border border-slate-200/60 pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
          />
        </div>
      </div>

      {/* Right Actions: Seed Data, Role Switcher, Notifications, User Avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Seed Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSeed}
          isLoading={isSeeding}
          leftIcon={<Database className="w-3.5 h-3.5 text-blue-600" />}
          className="hidden lg:inline-flex text-xs"
        >
          {isSeeding ? 'Carregando...' : 'Carregar Demo'}
        </Button>

        {/* Demo Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 transition-colors text-xs font-semibold text-slate-800"
            title="Alternar perfil de teste"
          >
            <span className="hidden xl:inline text-slate-500 font-normal">Perfil:</span>
            <Badge variant={currentRoleBadge.badge as any} size="sm">
              <span className="flex items-center gap-1">
                {currentRoleBadge.icon}
                {currentRoleBadge.label}
              </span>
            </Badge>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isRoleMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 border-b border-slate-100 mb-1 text-left">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Simulação de Papéis (RBAC)
                </p>
                <p className="text-[11px] text-slate-500">
                  Alterne entre perfis para testar permissões
                </p>
              </div>

              <button
                onClick={() => {
                  switchDemoRole('student');
                  setIsRoleMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                  activeRole === 'student' ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="font-semibold">Estudante (Aluno)</p>
                    <p className="text-[10px] text-slate-400">Beatriz Santos (B1)</p>
                  </div>
                </div>
                {activeRole === 'student' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </button>

              <button
                onClick={() => {
                  switchDemoRole('teacher');
                  setIsRoleMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                  activeRole === 'teacher' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="font-semibold">Professor Mentor</p>
                    <p className="text-[10px] text-slate-400">Prof. Michael Davies</p>
                  </div>
                </div>
                {activeRole === 'teacher' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </button>

              <button
                onClick={() => {
                  switchDemoRole('admin');
                  setIsRoleMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                  activeRole === 'admin' ? 'bg-rose-50 text-rose-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-rose-600" />
                  <div>
                    <p className="font-semibold">Coordenação (Admin)</p>
                    <p className="text-[10px] text-slate-400">Helena Rocha</p>
                  </div>
                </div>
                {activeRole === 'admin' && <CheckCircle2 className="w-4 h-4 text-rose-600" />}
              </button>

              <div className="border-t border-slate-100 my-1 pt-1">
                <button
                  onClick={() => {
                    signInWithGoogle();
                    setIsRoleMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Entrar com Conta Google</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notifications with counter pill */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 relative transition-colors"
            aria-label="Notificações"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50 text-left">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">Notificações Recentes</span>
                <span className="text-[10px] text-blue-600 font-semibold cursor-pointer">Marcar lidas</span>
              </div>
              <div className="py-2 space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                  <p className="font-semibold text-slate-900">Aula Confirmada no Zoom</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Sua mentoria de Business English está agendada para amanhã às 09:00.
                  </p>
                  <span className="text-[9px] text-slate-400 mt-1 block">Há 2 horas</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="font-semibold text-slate-900">Nova Nota Atribuída</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Seu Quiz de Condicionais foi corrigido. Nota: 100/100!
                  </p>
                  <span className="text-[9px] text-slate-400 mt-1 block">Ontem</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Circular User Avatar (as in reference screenshot) */}
        <div
          onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
          className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow-xs hover:ring-2 hover:ring-blue-500/20 transition-all"
          title={currentUser?.name || 'Perfil'}
        >
          {initials}
        </div>
      </div>
    </header>
  );
};
