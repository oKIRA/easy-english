import React, { useState } from 'react';
import { BookOpen, LogOut, Menu, Search, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../../modules/auth/AuthContext';
import { Badge } from '../design-system/Badge';

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
  const { currentUser, activeRole, signOut } = useAuth();

  const roleConfigs = {
    admin: { label: 'Administrador', badge: 'rose' as const, icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    teacher: { label: 'Professor', badge: 'emerald' as const, icon: <BookOpen className="w-3.5 h-3.5" /> },
    student: { label: 'Aluno', badge: 'blue' as const, icon: <UserCheck className="w-3.5 h-3.5" /> },
  };
  const currentRoleBadge = roleConfigs[activeRole];
  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((namePart) => namePart[0])
        .slice(0, 2)
        .join('')
    : 'EE';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E2E8F0] bg-white px-4 md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="Abrir menu lateral"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="hidden min-w-[140px] flex-col text-left sm:flex">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <span>Easy English</span>
            <span>/</span>
            <span className="font-medium capitalize text-slate-600">{currentViewTitle}</span>
          </div>
          <h1 className="mt-0.5 text-sm font-bold leading-none tracking-tight text-slate-900">{currentViewTitle}</h1>
        </div>

        <div className="relative w-full max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Pesquisar estudos, aulas, notas..."
            value={searchQuery}
            onChange={(event) => onSearchChange?.(event.target.value)}
            className="w-full rounded-xl border border-slate-200/60 bg-slate-100/80 py-1.5 pl-9 pr-4 text-xs text-slate-800 transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10"
          />
        </div>
      </div>

      <div className="ml-3 flex shrink-0 items-center gap-2 sm:gap-3">
        <Badge variant={currentRoleBadge.badge} size="sm">
          <span className="flex items-center gap-1">
            {currentRoleBadge.icon}
            <span className="hidden sm:inline">{currentRoleBadge.label}</span>
          </span>
        </Badge>

        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs"
          title={currentUser?.name || 'Perfil'}
          aria-label={`Usuário ${currentUser?.name || ''}`}
        >
          {initials}
        </div>

        <button
          onClick={() => signOut()}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600"
          title="Sair"
          aria-label="Sair da conta"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
