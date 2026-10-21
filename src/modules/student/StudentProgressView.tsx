import React from 'react';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from '../../shared/design-system/EmptyState';

export const StudentProgressView: React.FC = () => (
  <div className="space-y-6 text-left">
    <div>
      <h1 className="text-xl font-bold tracking-tight text-slate-900">Meu progresso</h1>
      <p className="mt-1 text-xs text-slate-500">
        Acompanhe sua evolução conforme as atividades forem registradas.
      </p>
    </div>
    <EmptyState
      icon={<BarChart3 className="h-6 w-6" />}
      title="Ainda não há dados de progresso"
      description="Seu nível, horas de estudo e desempenho serão exibidos quando houver informações reais registradas no perfil."
    />
  </div>
);
