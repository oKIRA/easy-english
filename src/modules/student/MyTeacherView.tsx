import React, { useState, useEffect } from 'react';
import {
  Compass,
  Calendar,
  Languages,
  Award,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { TeacherProfile, User } from '../../shared/types';
import { Button } from '../../shared/design-system/Button';
import { Card, CardHeader } from '../../shared/design-system/Card';
import { Badge } from '../../shared/design-system/Badge';

export const MyTeacherView: React.FC<{ onNavigate: (viewId: string) => void }> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const studentId = currentUser?.uid || 'demo-student-01';

  const [teacher, setTeacher] = useState<User | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [assignedDate, setAssignedDate] = useState<string>('2026-02-15');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMyTeacher() {
      try {
        setLoading(true);
        const relSnap = await getDocs(
          query(
            collection(db, 'teacherStudentRelationships'),
            where('studentId', '==', studentId),
            where('status', '==', 'active')
          )
        );

        let tId: string | null = null;
        relSnap.forEach((d) => {
          tId = d.data().teacherId;
          if (d.data().assignedAt) setAssignedDate(d.data().assignedAt);
        });

        if (tId) {
          const uDoc = await getDoc(doc(db, 'users', tId));
          if (uDoc.exists()) setTeacher({ uid: uDoc.id, ...uDoc.data() } as User);

          const pDoc = await getDoc(doc(db, 'teacherProfiles', tId));
          if (pDoc.exists()) setProfile(pDoc.data() as TeacherProfile);
        } else {
          // Fallback to default demo teacher
          setTeacher({
            uid: 'demo-teacher-01',
            name: 'Prof. Michael Davies',
            email: 'michael.davies@fluently.edu',
            role: 'teacher',
            status: 'active',
            timezone: 'America/Sao_Paulo',
            createdAt: '',
            updatedAt: '',
          });
          setProfile({
            teacherId: 'demo-teacher-01',
            bio: 'Certificado CELTA pela Universidade de Cambridge com 12 anos de experiência em Business English e preparação para exames internacionais (IELTS/TOEFL/FCE).',
            specialties: ['Business English', 'Cambridge Exams (FCE/CAE)', 'Pronunciation & Accent Reduction'],
            languages: ['Inglês (Nativo)', 'Português (Fluente)', 'Espanhol (Básico)'],
            timezone: 'America/Sao_Paulo',
            bookingSettings: {
              slotDurationMinutes: 45,
              advanceNoticeHours: 12,
              cancellationNoticeHours: 24,
              maxAdvanceDays: 30,
            },
            isAcceptingStudents: true,
            createdAt: '',
            updatedAt: '',
          });
        }
      } catch (e) {
        console.warn('Teacher fetch preview', e);
      } finally {
        setLoading(false);
      }
    }
    loadMyTeacher();
  }, [studentId]);

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Meu Professor Mentor</h1>
          <p className="text-xs text-slate-500 mt-1">
            Plano pedagógico individualizado. Seu vínculo é gerenciado pela coordenação da instituição.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => onNavigate('booking')}
          leftIcon={<Calendar className="w-3.5 h-3.5" />}
        >
          Agendar Aula com este Docente
        </Button>
      </div>

      {/* Security Rule Note: Aluno visualiza somente o professor ao qual está vinculado */}
      <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-blue-900 font-medium">
          <Lock className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Vínculo Acadêmico Ativo desde {new Date(assignedDate).toLocaleDateString('pt-BR')}</span>
        </div>
        <Badge variant="blue" size="sm">
          Mentoria Exclusiva
        </Badge>
      </div>

      {/* Teacher Profile Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-5">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-slate-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center font-bold text-3xl shadow-lg shrink-0">
              {teacher?.name ? teacher.name.charAt(0) : 'M'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{teacher?.name || 'Prof. Michael Davies'}</h2>
                <Badge variant="emerald" size="sm" dot>
                  Docente Verificado
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">{teacher?.email || 'michael.davies@fluently.edu'}</p>
              <div className="pt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> Fuso: {teacher?.timezone || 'America/Sao_Paulo'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-purple-600" /> Duração da Sessão: 45 minutos
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Apresentação Profissional</h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              {profile?.bio ||
                'Certificado CELTA pela Universidade de Cambridge com 12 anos de experiência em Business English e preparação para exames internacionais.'}
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Especialidades & Metodologia</h3>
            <div className="flex flex-wrap gap-1.5">
              {(profile?.specialties || ['Business English', 'Cambridge Exams (FCE/CAE)', 'Pronunciation']).map((s) => (
                <Badge key={s} variant="slate">
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Idiomas de Instrução</h3>
            <div className="flex flex-wrap gap-2 text-xs text-slate-700">
              {(profile?.languages || ['Inglês (Nativo)', 'Português (Fluente)']).map((l) => (
                <span key={l} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-medium">
                  {l}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Pedagogical Agreement & Booking Guidelines */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Regras de Agendamento" subtitle="Parâmetros definidos pelo professor" />
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span>Duração de cada aula:</span>
                <span className="font-bold text-slate-900">45 minutos</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span>Antecedência mínima:</span>
                <span className="font-bold text-slate-900">12 horas</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span>Prazo de cancelamento:</span>
                <span className="font-bold text-slate-900">24 horas antes</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span>Plataforma de vídeo:</span>
                <span className="font-bold text-blue-600">Zoom Integrado</span>
              </div>
            </div>

            <Button
              className="w-full mt-4"
              size="sm"
              onClick={() => onNavigate('booking')}
            >
              Consultar Horários Disponíveis
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
