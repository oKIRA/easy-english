import React, { useState, useEffect } from 'react';
import {
  Users,
  Video,
  BookOpen,
  CalendarCheck2,
  HardDrive,
  ExternalLink,
  Clock,
  Sparkles,
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { StatCard } from '../../shared/design-system/StatCard';
import { Card, CardHeader } from '../../shared/design-system/Card';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import { Booking } from '../../shared/types';

export const TeacherOverview: React.FC<{ onNavigate: (viewId: string) => void }> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    studentsCount: 1,
    todayBookings: 1,
    coursesCount: 1,
    storageQuotaMb: 680,
  });
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);

  useEffect(() => {
    async function loadTeacherDashboard() {
      try {
        const teacherId = currentUser?.uid || 'demo-teacher-01';

        // 1. My students
        const relSnap = await getDocs(
          query(
            collection(db, 'teacherStudentRelationships'),
            where('teacherId', '==', teacherId),
            where('status', '==', 'active')
          )
        );

        // 2. Courses
        const coursesSnap = await getDocs(
          query(collection(db, 'courses'), where('teacherId', '==', teacherId))
        );

        // 3. Bookings
        const bookingsSnap = await getDocs(
          query(
            collection(db, 'bookings'),
            where('teacherId', '==', teacherId),
            where('status', '==', 'confirmed')
          )
        );

        let nextB: Booking | null = null;
        bookingsSnap.forEach((d) => {
          const b = { id: d.id, ...d.data() } as Booking;
          if (!nextB) nextB = b;
        });

        setStats({
          studentsCount: relSnap.size || 1,
          todayBookings: bookingsSnap.size || 1,
          coursesCount: coursesSnap.size || 1,
          storageQuotaMb: 680,
        });
        setNextBooking(nextB);
      } catch (e) {
        console.warn('Teacher overview using default preview data', e);
      }
    }
    loadTeacherDashboard();
  }, [currentUser]);

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner - Clean SaaS Style */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 text-left shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#2563EB]" /> Painel Docente Oficial
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Bem-vindo(a), {currentUser?.name || 'Professor Michael'}
          </h1>
          <p className="text-xs text-[#64748B] max-w-xl mt-1 leading-relaxed">
            Acompanhe o progresso dos seus alunos vinculados, conduza mentorias via Zoom integrado e gerencie suas aulas e anotações.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => onNavigate('schedule')}
            leftIcon={<CalendarCheck2 className="w-4 h-4" />}
            variant="primary"
          >
            Abrir Agenda
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('courses')}
            leftIcon={<BookOpen className="w-4 h-4" />}
          >
            Criar Aula
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Alunos Vinculados"
          value={stats.studentsCount}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          subtitle="Acesso exclusivo ao seu perfil"
        />
        <StatCard
          title="Aulas Confirmadas"
          value={stats.todayBookings}
          icon={<Video className="w-5 h-5" />}
          color="emerald"
          subtitle="Sincronizadas com Zoom"
        />
        <StatCard
          title="Cursos Ativos"
          value={stats.coursesCount}
          icon={<BookOpen className="w-5 h-5" />}
          color="purple"
          subtitle="Publicados para seus alunos"
        />
        <StatCard
          title="Cota de Vídeo (Storage)"
          value={`${stats.storageQuotaMb} MB`}
          icon={<HardDrive className="w-5 h-5" />}
          color="amber"
          subtitle="De 2.000 MB (34% em uso)"
        />
      </div>

      {/* Next Class & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Lesson Card */}
        <Card className="lg:col-span-2 border-blue-200/70 bg-gradient-to-br from-white to-blue-50/20">
          <CardHeader
            title="Próxima Aula Agendada"
            subtitle="Conexão direta com videoconferência Zoom e Google Agenda"
            icon={<Clock className="w-5 h-5 text-blue-600" />}
            action={<Badge variant="emerald" dot>Confirmada</Badge>}
          />
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Aluno Mentorando:</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">Beatriz Santos (Nível B1)</h3>
                <p className="text-xs text-slate-500">Business English: Simulation & Negotiations</p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Horário:</span>
                <p className="text-sm font-bold text-slate-900">Amanhã às 09:00 - 09:45</p>
                <p className="text-[11px] text-slate-400">Fuso: America/Sao_Paulo (45 min)</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">Zoom ID:</span>
                <span>984 5120 7841</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://zoom.us/j/98451207841?pwd=EasyEnglish2026"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm transition-colors"
                >
                  <Video className="w-4 h-4" /> Iniciar Sala Zoom
                </a>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Pedagogical Actions */}
        <Card>
          <CardHeader title="Atalhos Docentes" subtitle="Navegação rápida" />
          <div className="space-y-2">
            <button
              onClick={() => onNavigate('students')}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-left transition-all text-xs font-semibold text-slate-800 flex items-center justify-between"
            >
              <span>Ver Meus Alunos & Notas Privadas</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => onNavigate('assessments')}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-left transition-all text-xs font-semibold text-slate-800 flex items-center justify-between"
            >
              <span>Corrigir Avaliações & Dar Feedback</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => onNavigate('media')}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-left transition-all text-xs font-semibold text-slate-800 flex items-center justify-between"
            >
              <span>Subir Videoaula Gravada (Cota)</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => onNavigate('integrations')}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-left transition-all text-xs font-semibold text-slate-800 flex items-center justify-between"
            >
              <span>Configurar Zoom & Google Agenda</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
