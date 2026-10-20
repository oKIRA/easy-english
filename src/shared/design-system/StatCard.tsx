import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  emoji?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'yellow' | 'purple' | 'slate';
  trend?: {
    value: string;
    isPositive?: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  emoji,
  color = 'blue',
  trend,
}) => {
  const colorStyles = {
    blue: {
      bg: 'bg-white',
      badgeBg: 'bg-blue-50 text-blue-600 border-blue-100',
      numColor: 'text-blue-600',
    },
    emerald: {
      bg: 'bg-white',
      badgeBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      numColor: 'text-emerald-600',
    },
    amber: {
      bg: 'bg-white',
      badgeBg: 'bg-amber-50 text-amber-600 border-amber-100',
      numColor: 'text-amber-600',
    },
    yellow: {
      bg: 'bg-white',
      badgeBg: 'bg-yellow-50 text-yellow-600 border-yellow-100',
      numColor: 'text-yellow-600',
    },
    purple: {
      bg: 'bg-white',
      badgeBg: 'bg-purple-50 text-purple-600 border-purple-100',
      numColor: 'text-purple-600',
    },
    slate: {
      bg: 'bg-white',
      badgeBg: 'bg-slate-50 text-slate-600 border-slate-200',
      numColor: 'text-slate-800',
    },
  };

  const scheme = colorStyles[color];

  return (
    <div
      className={`rounded-2xl border border-slate-200/90 ${scheme.bg} p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all hover:border-slate-300 flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between mb-3">
        {emoji ? (
          <span className="text-xl">{emoji}</span>
        ) : (
          icon && (
            <div className={`p-2 rounded-xl border ${scheme.badgeBg} flex items-center justify-center`}>
              {icon}
            </div>
          )
        )}
        {trend && (
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              trend.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      <div>
        <div className={`text-2xl font-bold tracking-tight ${scheme.numColor}`}>
          {value}
        </div>
        <div className="text-xs font-medium text-slate-600 mt-1">{title}</div>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};
