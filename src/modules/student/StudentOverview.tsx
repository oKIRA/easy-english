import React, { useState, useEffect } from 'react';
import {
  Video,
  Clock,
  BookOpen,
  Award,
  CalendarCheck,
  CheckCircle2,
  Calendar as CalendarIcon,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Plus,
  FileText,
  CheckSquare,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { Booking, Course, AssessmentResult, User } from '../../shared/types';
import { Card, CardHeader } from '../../shared/design-system/Card';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import { StatCard } from '../../shared/design-system/StatCard';
import { StudyNote } from '../notes/StudyNotesView';

export const StudentOverview: React.FC<{ onNavigate: (viewId: string) => void }> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const studentId = currentUser?.uid || 'demo-student-01';

  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [assignedTeacher, setAssignedTeacher] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [latestResult, setLatestResult] = useState<AssessmentResult | null>(null);
  const [recentNotes, setRecentNotes] = useState<StudyNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar mini grid
  const daysOfWeek = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const calendarDays = [
    { day: null }, { day: null }, { day: 1 }, { day: 2 }, { day: 3 }, { day: 4 },
    { day: 5 }, { day: 6 }, { day: 7 }, { day: 8, isEvent: true }, { day: 9 }, { day: 10 }, { day: 11 },
    { day: 12 }, { day: 13, isEvent: true }, { day: 14 }, { day: 15 }, { day: 16 }, { day: 17 }, { day: 18, isEvent: true },
    { day: 19 }, { day: 20 }, { day: 21 }, { day: 22 }, { day: 23, isEvent: true }, { day: 24 }, { day: 25 },
    { day: 26 }, { day: 27 }, { day: 28 }, { day: 29 }, { day: 30 }, { day: 31 },
  ];

  useEffect(() => {
    // Load notes from localStorage for quick notes preview
    try {
      const saved = localStorage.getItem('easy_english_study_notes');
      if (saved) {
        setRecentNotes(JSON.parse(saved).slice(0, 3));
      }
    } catch {}

    async function loadStudentData() {
      try {
        setLoading(true);

        // Find active relationship to get teacher
        const relSnap = await getDocs(
          query(
            collection(db, 'teacherStudentRelationships'),
            where('studentId', '==', studentId),
            where('status', '==', 'active')
          )
        );

        let teacherUid = 'demo-teacher-01';
        relSnap.forEach((d) => {
          teacherUid = d.data().teacherId;
        });

        const tDoc = await getDoc(doc(db, 'users', teacherUid));
        if (tDoc.exists()) setAssignedTeacher({ uid: tDoc.id, ...tDoc.data() } as User);

        // Courses
        const cSnap = await getDocs(
          query(collection(db, 'courses'), where('teacherId', '==', teacherUid))
        );
        const cList: Course[] = [];
        cSnap.forEach((d) => cList.push({ id: d.id, ...d.data() } as Course));
        setCourses(cList);

        // Bookings
        const bSnap = await getDocs(
          query(
            collection(db, 'bookings'),
            where('studentId', '==', studentId),
            where('status', '==', 'confirmed')
          )
        );
        bSnap.forEach((d) => {
          if (!nextBooking) setNextBooking({ id: d.id, ...d.data() } as Booking);
        });

        // Results
        const rSnap = await getDocs(
          query(collection(db, 'assessmentResults'), where('studentId', '==', studentId))
        );
        rSnap.forEach((d) => {
          setLatestResult({ id: d.id, ...d.data() } as AssessmentResult);
        });
      } catch (e) {
        console.warn('Student overview preview mode', e);
      } finally {
        setLoading(false);
      }
    }

    loadStudentData();
  }, [studentId]);

  return (
    <div className="space-y-6 text-left">
      {/* 1. Header Banner - Clean SaaS Presentation (Blue #EFF6FF subtle card, border #DBEAFE) */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-7 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#EFF6FF] border border-[#DBEAFE] text-[11px] font-semibold text-[#2563EB]">
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Plano Semanal de Estudos</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
              Bem-vindo(a) de volta, {currentUser?.name?.split(' ')[0] || 'Beatriz'}
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] font-normal leading-relaxed max-w-xl">
              Você concluiu <strong className="text-[#2563EB] font-bold">70%</strong> da sua meta semanal de prática em inglês. Continue o ritmo para avançar para o nível B2!
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('courses')}
              className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold shadow-2xs hover:bg-[#1E3A8A] transition-all"
            >
              Continuar Aula
            </button>
            <button
              onClick={() => onNavigate('notes')}
              className="px-4 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#0F172A] text-xs font-semibold hover:bg-slate-50 transition-all"
            >
              Abrir Caderno
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Cards - Clean white cards, pure blue icons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#64748B]">Cursos Ativos</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-[#0F172A]">{courses.length || 6}</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">3 módulos em andamento</div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#64748B]">Aulas Concluídas</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-[#0F172A]">12</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">+2 aulas esta semana</div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#64748B]">Tarefas e Quizzes</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-[#0F172A]">8</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">1 pendente para amanhã</div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#64748B]">Nível CEFR Atual</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-[#1E3A8A]">B1+</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">Rumo a B2 Vantage</div>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Estudos Recentes & Progresso & Anotações Recentes */}
        <div className="lg:col-span-7 space-y-6">
          {/* Estudos Recentes & Progresso */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E2E8F0]">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                  Estudos Recentes e Progresso
                </h2>
                <p className="text-xs text-[#64748B]">Continue exatamente de onde você parou</p>
              </div>
              <button
                onClick={() => onNavigate('courses')}
                className="text-xs font-semibold text-[#2563EB] hover:text-[#1E3A8A] flex items-center gap-1"
              >
                Ver todos <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Course Item 1 */}
              <div className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-blue-300 transition-all bg-slate-50/50">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div>
                    <span className="font-bold text-[#0F172A]">Business English Negotiations</span>
                    <span className="text-[#64748B] block text-[11px]">Capítulo 4 • Second & Third Conditionals</span>
                  </div>
                  <span className="font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded text-[11px]">
                    91% concluído
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-[#2563EB] transition-all duration-500 w-[91%]" />
                </div>
              </div>

              {/* Course Item 2 */}
              <div className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-blue-300 transition-all bg-slate-50/50">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div>
                    <span className="font-bold text-[#0F172A]">Advanced Grammar & Phrasal Verbs</span>
                    <span className="text-[#64748B] block text-[11px]">Módulo 2 • High Frequency Prepositions</span>
                  </div>
                  <span className="font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded text-[11px]">
                    65% concluído
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-[#2563EB] transition-all duration-500 w-[65%]" />
                </div>
              </div>

              {/* Course Item 3 */}
              <div className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-blue-300 transition-all bg-slate-50/50">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div>
                    <span className="font-bold text-[#0F172A]">Pronunciation & Accent Reduction</span>
                    <span className="text-[#64748B] block text-[11px]">Capítulo 2 • Glottal Stops and T-Flapping</span>
                  </div>
                  <span className="font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded text-[11px]">
                    40% concluído
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-[#2563EB] transition-all duration-500 w-[40%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Anotações Recentes (Inspirado no Lovable Note-Taking) */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                    Anotações Recentes
                  </h2>
                  <p className="text-xs text-[#64748B]">Caderno de anotações e fichas de vocabulário</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('notes')}
                className="text-xs font-semibold text-[#2563EB] hover:text-[#1E3A8A] flex items-center gap-1"
              >
                Abrir Caderno <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => onNavigate('notes')}
                className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#2563EB] transition-all cursor-pointer bg-white group text-left"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB]">
                    Gramática
                  </span>
                  <span className="text-[10px] text-slate-400">Há 1 hora</span>
                </div>
                <h3 className="text-xs font-bold text-[#0F172A] group-hover:text-[#2563EB] truncate">
                  Conditional Sentences in Negotiations
                </h3>
                <p className="text-[11px] text-[#64748B] line-clamp-2 mt-1">
                  Second vs Third Conditional in business context, diplomacy formulas...
                </p>
              </div>

              <div
                onClick={() => onNavigate('notes')}
                className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#2563EB] transition-all cursor-pointer bg-white group text-left"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB]">
                    Reuniões
                  </span>
                  <span className="text-[10px] text-slate-400">Ontem</span>
                </div>
                <h3 className="text-xs font-bold text-[#0F172A] group-hover:text-[#2563EB] truncate">
                  Idiomatic Expressions for Meetings
                </h3>
                <p className="text-[11px] text-[#64748B] line-clamp-2 mt-1">
                  To park an idea, touch base, ballpark figures and compromise rules...
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Próximos Compromissos & Calendário & Atalhos */}
        <div className="lg:col-span-5 space-y-6">
          {/* Próxima Mentoria Confirmada */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E2E8F0]">
              <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">Próxima Aula de Conversação</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                Confirmada
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#1E3A8A]">
                    {nextBooking?.notes || 'Executive Fluency 1-on-1'}
                  </h3>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Professor: {assignedTeacher?.name || 'Prof. Michael Davies'}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-white text-[#2563EB] shadow-2xs">
                  <Video className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#0F172A] font-semibold">
                <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Amanhã • 09:00 - 10:00 (BRT)</span>
              </div>

              <a
                href={nextBooking?.zoomJoinUrl || 'https://zoom.us/j/98451207841?pwd=EasyEnglish2026'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1E3A8A] transition-colors"
              >
                <Video className="w-3.5 h-3.5" /> Entrar na Sala Zoom
              </a>
            </div>
          </div>

          {/* Calendário e Compromissos */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">Agenda Mensal</h2>
              <span className="text-xs font-medium text-[#64748B]">Outubro 2026</span>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 mb-2">
              {daysOfWeek.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {calendarDays.map((c, i) => (
                <div key={i} className="h-7 flex items-center justify-center">
                  {c.day ? (
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-medium transition-all ${
                        c.isEvent
                          ? 'bg-[#2563EB] text-white font-bold'
                          : 'text-[#0F172A] hover:bg-slate-100'
                      }`}
                    >
                      {c.day}
                    </span>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="pt-4 border-t border-[#E2E8F0] mt-4 space-y-2">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                Atalhos Rápidos
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => onNavigate('notes')}
                  className="flex items-center gap-2 p-2 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Nova Anotação</span>
                </button>
                <button
                  onClick={() => onNavigate('schedule')}
                  className="flex items-center gap-2 p-2 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Agendar Aula</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
