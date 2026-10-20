import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Card, CardHeader } from '../../shared/design-system/Card';
import { Badge } from '../../shared/design-system/Badge';
import { StatCard } from '../../shared/design-system/StatCard';

export const StudentProgressView: React.FC = () => {
  const skills = [
    { name: 'Listening & Comprehension', level: '78%', color: 'bg-blue-600' },
    { name: 'Speaking & Fluency', level: '65%', color: 'bg-emerald-500' },
    { name: 'Business Grammar & Conditionals', level: '85%', color: 'bg-purple-600' },
    { name: 'Executive Vocabulary', level: '72%', color: 'bg-amber-500' },
    { name: 'Pronunciation & Intonation', level: '60%', color: 'bg-indigo-500' },
  ];

  const weeklyActivity = [
    { day: 'Seg', hours: 1.2, goal: 1.0 },
    { day: 'Ter', hours: 0.8, goal: 1.0 },
    { day: 'Qua', hours: 1.5, goal: 1.0 },
    { day: 'Qui', hours: 1.0, goal: 1.0 },
    { day: 'Sex', hours: 1.4, goal: 1.0 },
    { day: 'Sáb', hours: 0.5, goal: 1.0 },
    { day: 'Dom', hours: 0.6, goal: 1.0 },
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Meu Progresso de Aprendizagem</h1>
        <p className="text-xs text-slate-500 mt-1">
          Acompanhe suas horas de estudo, evolução nas competências do CEFR e conclusão de metas pedagógicas.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          emoji="⏱️"
          title="Horas Praticadas"
          value="28.5 hrs"
          subtitle="Neste mês de estudos"
          color="blue"
        />
        <StatCard
          emoji="📈"
          title="Nível CEFR Atual"
          value="B1+"
          subtitle="Meta semestral: B2 First"
          color="purple"
        />
        <StatCard
          emoji="🎯"
          title="Meta Semanal"
          value="70%"
          subtitle="7.0 de 10.0 horas atingidas"
          color="emerald"
        />
        <StatCard
          emoji="🏅"
          title="Média de Notas"
          value="94.0"
          subtitle="Em avaliações e quizzes"
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Skill Breakdown */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader
              title="Competências Linguísticas & Desempenho"
              subtitle="Avaliado através de exercícios práticos e sessões de mentoria"
              icon={<Award className="w-5 h-5 text-blue-600" />}
            />

            <div className="space-y-5 pt-2">
              {skills.map((s) => (
                <div key={s.name}>
                  <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-800">{s.name}</span>
                    <span className="font-bold text-slate-900">{s.level}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.color} transition-all duration-500`}
                      style={{ width: s.level }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column (5 cols): Weekly Study Rhythm */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader
              title="Ritmo Semanal de Prática"
              subtitle="Horas dedicadas por dia"
              icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
            />

            <div className="flex items-end justify-between gap-2 h-44 pt-6 px-2">
              {weeklyActivity.map((w) => {
                const heightPercent = Math.min(100, (w.hours / 2.0) * 100);
                return (
                  <div key={w.day} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-700">
                      {w.hours}h
                    </span>
                    <div className="w-full bg-slate-100 rounded-t-lg h-32 flex items-end justify-center overflow-hidden">
                      <div
                        className="w-full bg-blue-600 rounded-t-lg transition-all duration-300 hover:bg-blue-700"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">{w.day}</span>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Média diária: 1.0 h</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ritmo Consistente
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
