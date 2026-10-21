import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Video,
  FileText,
  Clock,
  Play,
  Layers,
  CheckCircle2,
  Download,
  ExternalLink,
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { Course, CourseModule, Lesson, LearningAsset } from '../../shared/types';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import { Card, CardHeader } from '../../shared/design-system/Card';
import { Modal } from '../../shared/design-system/Modal';
import { VideoPlayer } from '../../shared/design-system/VideoPlayer';
import { DocumentViewer } from '../../shared/design-system/DocumentViewer';

export const StudentCoursesView: React.FC = () => {
  const { currentUser } = useAuth();
  const studentId = currentUser?.uid;

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [assets, setAssets] = useState<LearningAsset[]>([]);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudentCourses() {
      if (!studentId) {
        setCourses([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Find teacher
        const relSnap = await getDocs(
          query(
            collection(db, 'teacherStudentRelationships'),
            where('studentId', '==', studentId),
            where('status', '==', 'active')
          )
        );

        const teacherId = relSnap.docs[0]?.data().teacherId as string | undefined;
        if (!teacherId) {
          setCourses([]);
          return;
        }

        // Load published courses from this teacher
        const cSnap = await getDocs(
          query(
            collection(db, 'courses'),
            where('teacherId', '==', teacherId),
            where('status', '==', 'published')
          )
        );
        const cList: Course[] = [];
        cSnap.forEach((d) => cList.push({ id: d.id, ...d.data() } as Course));
        setCourses(cList);

        if (cList.length > 0) {
          selectCourse(cList[0]);
        }
      } catch (e) {
        console.warn('Student courses preview mode', e);
      } finally {
        setLoading(false);
      }
    }
    loadStudentCourses();
  }, [studentId]);

  const selectCourse = async (course: Course) => {
    setSelectedCourse(course);
    try {
      const mSnap = await getDocs(
        query(
          collection(db, 'modules'),
          where('courseId', '==', course.id),
          where('status', '==', 'published')
        )
      );
      const mList: CourseModule[] = [];
      mSnap.forEach((d) => mList.push({ id: d.id, ...d.data() } as CourseModule));
      mList.sort((a, b) => a.order - b.order);
      setModules(mList);

      const lSnap = await getDocs(
        query(
          collection(db, 'lessons'),
          where('courseId', '==', course.id),
          where('status', '==', 'published')
        )
      );
      const lList: Lesson[] = [];
      lSnap.forEach((d) => lList.push({ id: d.id, ...d.data() } as Lesson));
      lList.sort((a, b) => a.order - b.order);
      setLessons(lList);

      const aSnap = await getDocs(
        query(collection(db, 'learningAssets'), where('courseId', '==', course.id))
      );
      const aList: LearningAsset[] = [];
      aSnap.forEach((d) => aList.push({ id: d.id, ...d.data() } as LearningAsset));
      setAssets(aList);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLessonEnded = (lessonId: string) => {
    setCompletedLessons((prev) => new Set([...prev, lessonId]));
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Minhas Aulas & Cursos de Inglês</h1>
        <p className="text-xs text-slate-500 mt-1">
          Conteúdo pedagógico preparado pelo seu professor mentor. Assista às videoaulas e pratique os diálogos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Catalog (Assigned courses) */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Cursos Matriculados</h2>
          {courses.map((c) => {
            const isSelected = selectedCourse?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => selectCourse(c)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Badge variant="purple" size="sm">
                    {c.level}
                  </Badge>
                  <span className="text-[10px] text-emerald-600 font-semibold">Liberado</span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{c.title}</h3>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                  {c.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Modules & Lessons Player */}
        <div className="lg:col-span-2 space-y-4">
          {selectedCourse && (
            <Card>
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">{selectedCourse.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{selectedCourse.description}</p>
              </div>

              {/* Modules breakdown */}
              <div className="pt-4 space-y-4">
                {modules.map((m) => {
                  const moduleLessons = lessons.filter((l) => l.moduleId === m.id);
                  return (
                    <div key={m.id} className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                      <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-600" />
                          <h3 className="text-xs font-bold text-slate-900">{m.title}</h3>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">{moduleLessons.length} aulas</span>
                      </div>

                      <div className="p-3 space-y-2">
                        {moduleLessons.map((l) => {
                          const isDone = completedLessons.has(l.id);
                          return (
                            <div
                              key={l.id}
                              onClick={() => setActiveLesson(l)}
                              className="p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-400 cursor-pointer flex items-center justify-between transition-all group shadow-2xs"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                  {l.contentType === 'video' ? (
                                    <Play className="w-4 h-4 ml-0.5" />
                                  ) : (
                                    <FileText className="w-4 h-4" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                    {l.title}
                                  </h4>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> {l.estimatedDuration} min
                                    </span>
                                    <span>•</span>
                                    <span className="capitalize">{l.contentType}</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                {isDone ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Assistido
                                  </span>
                                ) : (
                                  <Button size="sm" variant="ghost" className="text-xs">
                                    Iniciar Aula
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Course Attachments */}
              {assets.length > 0 && (
                <div className="pt-4 border-t border-slate-100 mt-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Materiais de Apoio para Download
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {assets.map((asset) => (
                      <a
                        key={asset.id}
                        href={asset.externalUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{asset.title}</span>
                        </div>
                        <Download className="w-4 h-4 text-blue-600 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Modal: Full Lesson Viewer */}
      <Modal
        isOpen={Boolean(activeLesson)}
        onClose={() => setActiveLesson(null)}
        title={activeLesson?.title || 'Aula'}
        maxWidth="3xl"
      >
        {activeLesson && (
          <div className="space-y-4 text-xs">
            {activeLesson.contentType === 'video' && (
              <VideoPlayer
                src={
                  activeLesson.videoUrl ||
                  'https://vjs.zencdn.net/v/oceans.mp4'
                }
                title={activeLesson.title}
                onEnded={() => handleLessonEnded(activeLesson.id)}
              />
            )}

            <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs space-y-2">
              <h4 className="font-bold text-[#1E3A8A] text-sm pb-2 border-b border-[#E2E8F0]">
                Conteúdo & Transcrição da Aula
              </h4>
              <DocumentViewer
                content={
                  activeLesson.contentText ||
                  'Pratique a pronúncia das frases em voz alta. Anote suas dúvidas para a próxima sessão de mentoria ao vivo.'
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant={completedLessons.has(activeLesson.id) ? 'outline' : 'primary'}
                onClick={() => {
                  handleLessonEnded(activeLesson.id);
                  setActiveLesson(null);
                }}
              >
                {completedLessons.has(activeLesson.id) ? 'Fechar Aula' : 'Marcar Aula como Concluída'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
