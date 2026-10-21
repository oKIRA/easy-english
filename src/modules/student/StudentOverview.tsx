import React, { useEffect, useState } from 'react';
import { Award, BookOpen, CalendarClock, CheckSquare } from 'lucide-react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { AssessmentResult, Booking, Course } from '../../shared/types';
import { Card, CardHeader } from '../../shared/design-system/Card';
import { Button } from '../../shared/design-system/Button';
import { useToast } from '../../shared/design-system/Toast';

export const StudentOverview: React.FC<{ onNavigate: (viewId: string) => void }> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [completedAssessments, setCompletedAssessments] = useState(0);
  const [englishLevel, setEnglishLevel] = useState<string | null>(null);
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  useEffect(() => {
    const loadStudentData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const studentId = currentUser.uid;
        const [relationships, results, bookings, profile] = await Promise.all([
          getDocs(query(
            collection(db, 'teacherStudentRelationships'),
            where('studentId', '==', studentId),
            where('status', '==', 'active')
          )),
          getDocs(query(collection(db, 'assessmentResults'), where('studentId', '==', studentId))),
          getDocs(query(collection(db, 'bookings'), where('studentId', '==', studentId))),
          getDoc(doc(db, 'studentProfiles', studentId)),
        ]);

        const teacherIds = Array.from(new Set(
          relationships.docs.map((relationship) => relationship.data().teacherId as string)
        ));
        const courseSnapshots = await Promise.all(
          teacherIds.map((teacherId) =>
            getDocs(query(
              collection(db, 'courses'),
              where('teacherId', '==', teacherId),
              where('status', '==', 'published')
            ))
          )
        );

        setCourses(courseSnapshots.flatMap((snapshot) =>
          snapshot.docs.map((course) => ({ id: course.id, ...course.data() } as Course))
        ));
        setCompletedAssessments(results.docs.filter((result) => result.data().status === 'graded').length);
        setEnglishLevel(profile.exists() ? profile.data().englishLevel || null : null);

        const upcoming = bookings.docs
          .map((booking) => ({ id: booking.id, ...booking.data() } as Booking))
          .filter((booking) =>
            booking.status === 'confirmed' && new Date(booking.startAt).getTime() >= Date.now()
          )
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
        setNextBooking(upcoming[0] || null);
      } catch (err) {
        console.error('Failed to load student overview:', err);
        error('Não foi possível carregar seus dados acadêmicos', String(err));
      } finally {
        setLoading(false);
      }
    };

    void loadStudentData();
  }, [currentUser, error]);

  const summaryCards = [
    { title: 'Cursos disponíveis', value: courses.length, icon: <BookOpen className="h-4 w-4" /> },
    { title: 'Avaliações concluídas', value: completedAssessments, icon: <CheckSquare className="h-4 w-4" /> },
    { title: 'Nível de inglês', value: englishLevel || 'Não informado', icon: <Award className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Olá, {currentUser?.name?.split(' ')[0] || 'estudante'}
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Seus dados acadêmicos aparecem aqui conforme forem cadastrados e suas atividades forem realizadas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.title} className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">{card.icon}</div>
            <div>
              <p className="text-xs text-slate-500">{card.title}</p>
              <p className="text-xl font-bold text-slate-900">{loading ? '—' : card.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Meus cursos"
            subtitle="Cursos publicados pelo professor vinculado à sua conta."
            icon={<BookOpen className="h-5 w-5 text-blue-600" />}
          />
          {courses.length ? (
            <ul className="divide-y divide-slate-100">
              {courses.map((course) => (
                <li key={course.id} className="py-3">
                  <p className="text-sm font-semibold text-slate-900">{course.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{course.description || 'Sem descrição.'}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-5 text-center text-xs text-slate-500">
              {loading ? 'Carregando cursos...' : 'Nenhum curso foi atribuído a você ainda.'}
            </p>
          )}
          <Button size="sm" variant="outline" onClick={() => onNavigate('courses')}>
            Abrir cursos
          </Button>
        </Card>

        <Card>
          <CardHeader
            title="Próxima aula"
            subtitle="Reservas confirmadas vinculadas à sua conta."
            icon={<CalendarClock className="h-5 w-5 text-blue-600" />}
          />
          {nextBooking ? (
            <div className="space-y-2 py-3">
              <p className="text-sm font-semibold text-slate-900">
                {new Date(nextBooking.startAt).toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-slate-500">{nextBooking.notes || 'Sem observações.'}</p>
              {nextBooking.zoomJoinUrl && (
                <a
                  href={nextBooking.zoomJoinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Entrar na aula
                </a>
              )}
            </div>
          ) : (
            <p className="py-5 text-center text-xs text-slate-500">
              {loading ? 'Carregando agenda...' : 'Você ainda não tem aulas confirmadas.'}
            </p>
          )}
          <Button size="sm" variant="outline" onClick={() => onNavigate('schedule')}>
            Abrir agenda
          </Button>
        </Card>
      </div>
    </div>
  );
};
