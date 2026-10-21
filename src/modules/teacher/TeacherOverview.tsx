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
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { StatCard } from '../../shared/design-system/StatCard';
import { Card, CardHeader } from '../../shared/design-system/Card';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import { Booking } from '../../shared/types';
import { useToast } from '../../shared/design-system/Toast';

export const TeacherOverview: React.FC<{ onNavigate: (viewId: string) => void }> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    studentsCount: 0,
    confirmedBookings: 0,
    coursesCount: 0,
    storageUsedBytes: 0,
    storageLimitBytes: 0,
  });
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [nextStudentName, setNextStudentName] = useState('');
  const { error } = useToast();

  useEffect(() => {
    async function loadTeacherDashboard() {
      if (!currentUser?.uid) return;
      try {
        const teacherId = currentUser.uid;
        const [relSnap, coursesSnap, bookingsSnap, quotaSnapshot] = await Promise.all([
          getDocs(query(
            collection(db, 'teacherStudentRelationships'),
            where('teacherId', '==', teacherId),
            where('status', '==', 'active')
          )),
          getDocs(query(collection(db, 'courses'), where('teacherId', '==', teacherId))),
          getDocs(query(
            collection(db, 'bookings'),
            where('teacherId', '==', teacherId),
            where('status', '==', 'confirmed')
          )),
          getDoc(doc(db, 'storageQuotas', teacherId)),
        ]);
        const activeStudentIds = new Set(relSnap.docs.map((relationship) => relationship.data().studentId));
        const bookings = bookingsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Booking))
          .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());
        const nextB = bookings.find((booking) => new Date(booking.startAt).getTime() >= Date.now()) || null;
        let studentName = '';
        if (nextB && activeStudentIds.has(nextB.studentId)) {
          const studentSnapshot = await getDoc(doc(db, 'users', nextB.studentId));
          if (studentSnapshot.exists()) studentName = String(studentSnapshot.data().name || '');
        }

        setStats({
          studentsCount: activeStudentIds.size,
          confirmedBookings: bookingsSnap.size,
          coursesCount: coursesSnap.size,
          storageUsedBytes: quotaSnapshot.exists() ? Number(quotaSnapshot.data().usedBytes) || 0 : 0,
          storageLimitBytes: quotaSnapshot.exists() ? Number(quotaSnapshot.data().limitBytes) || 0 : 0,
        });
        setNextBooking(nextB);
        setNextStudentName(studentName);
      } catch (e) {
        console.error('Failed to load teacher overview:', e);
        error('Não foi possível carregar o painel docente', String(e));
      }
    }
    void loadTeacherDashboard();
  }, [currentUser, error]);

  const storagePercent = stats.storageLimitBytes
    ? Math.round((stats.storageUsedBytes / stats.storageLimitBytes) * 100)
    : 0;

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
            Bem-vindo(a), {currentUser?.name || 'Professor'}
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
          value={stats.confirmedBookings}
          icon={<Video className="w-5 h-5" />}
          color="emerald"
          subtitle="Aulas confirmadas"
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
          value={`${(stats.storageUsedBytes / (1024 * 1024)).toFixed(0)} MB`}
          icon={<HardDrive className="w-5 h-5" />}
          color="amber"
          subtitle={stats.storageLimitBytes
            ? `De ${(stats.storageLimitBytes / (1024 * 1024)).toFixed(0)} MB (${storagePercent}% em uso)`
            : 'Cota ainda não configurada'}
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
            action={nextBooking && <Badge variant="emerald" dot>Confirmada</Badge>}
          />
          {nextBooking ? (
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Aluno Mentorando:</span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">{nextStudentName || 'Aluno'}</h3>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Horário:</span>
                  <p className="text-sm font-bold text-slate-900">{new Date(nextBooking.startAt).toLocaleString('pt-BR')}</p>
                  <p className="text-[11px] text-slate-400">
                    até {new Date(nextBooking.endAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {nextBooking.zoomJoinUrl && (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">Zoom ID:</span>
                    <span>{nextBooking.zoomMeetingId || 'Zoom'}</span>
                  </div>
                  <a
                    href={nextBooking.zoomJoinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm transition-colors"
                  >
                    <Video className="w-4 h-4" /> Iniciar Sala Zoom
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
              Nenhuma aula futura confirmada.
            </p>
          )}
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
