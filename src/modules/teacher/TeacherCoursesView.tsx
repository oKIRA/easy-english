import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Video,
  FileText,
  Clock,
  Layers,
  ChevronRight,
  Eye,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { Course, CourseModule, Lesson } from '../../shared/types';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import { Card, CardHeader } from '../../shared/design-system/Card';
import { Modal } from '../../shared/design-system/Modal';
import { Input } from '../../shared/design-system/Input';
import { useToast } from '../../shared/design-system/Toast';
import { WordEditor } from '../../shared/design-system/WordEditor';

export const TeacherCoursesView: React.FC = () => {
  const { currentUser } = useAuth();
  const teacherId = currentUser?.uid || 'demo-teacher-01';

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: New Course
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseLevel, setCourseLevel] = useState('B1 - B2 Intermediate');
  const [courseVisibility, setCourseVisibility] = useState<'all_my_students' | 'enrolled_only'>('all_my_students');

  // Modal: New Module
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDesc, setModuleDesc] = useState('');

  // Modal: New Lesson
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [targetModuleId, setTargetModuleId] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContentType, setLessonContentType] = useState<'video' | 'text'>('video');
  const [lessonDuration, setLessonDuration] = useState(25);
  const [lessonVideoUrl, setLessonVideoUrl] = useState('https://vjs.zencdn.net/v/oceans.mp4');
  const [lessonText, setLessonText] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();

  const loadCourses = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, 'courses'), where('teacherId', '==', teacherId))
      );
      const list: Course[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Course));
      setCourses(list);

      if (list.length > 0 && !selectedCourse) {
        selectCourse(list[0]);
      }
    } catch (e) {
      console.warn('Using default course data', e);
    } finally {
      setLoading(false);
    }
  };

  const selectCourse = async (course: Course) => {
    setSelectedCourse(course);
    try {
      // Load modules
      const mSnap = await getDocs(
        query(collection(db, 'modules'), where('courseId', '==', course.id))
      );
      const mList: CourseModule[] = [];
      mSnap.forEach((d) => mList.push({ id: d.id, ...d.data() } as CourseModule));
      mList.sort((a, b) => a.order - b.order);
      setModules(mList);

      // Load lessons
      const lSnap = await getDocs(
        query(collection(db, 'lessons'), where('courseId', '==', course.id))
      );
      const lList: Lesson[] = [];
      lSnap.forEach((d) => lList.push({ id: d.id, ...d.data() } as Lesson));
      lList.sort((a, b) => a.order - b.order);
      setLessons(lList);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [teacherId]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const newCourseId = `course-${Date.now()}`;
      const newCourse: Course = {
        id: newCourseId,
        title: courseTitle,
        description: courseDesc,
        teacherId,
        status: 'published',
        visibility: courseVisibility,
        level: courseLevel,
        modulesCount: 0,
        lessonsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'courses', newCourseId), {
        ...newCourse,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Audit Log
      await setDoc(doc(db, 'auditLogs', `log-${Date.now()}`), {
        actorId: teacherId,
        actorName: currentUser?.name || 'Professor',
        action: 'CREATE_COURSE',
        entityType: 'courses',
        entityId: newCourseId,
        metadata: { title: courseTitle },
        createdAt: new Date().toISOString(),
      });

      setCourses((prev) => [newCourse, ...prev]);
      setIsCourseModalOpen(false);
      setCourseTitle('');
      setCourseDesc('');
      selectCourse(newCourse);
      success('Curso criado com sucesso!', 'Agora você pode adicionar módulos e lições.');
    } catch (err) {
      error('Falha ao criar curso', String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    try {
      setIsSubmitting(true);
      const newModId = `mod-${Date.now()}`;
      const newMod: CourseModule = {
        id: newModId,
        courseId: selectedCourse.id,
        title: moduleTitle,
        description: moduleDesc,
        order: modules.length + 1,
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'modules', newModId), {
        ...newMod,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setModules((prev) => [...prev, newMod]);
      setIsModuleModalOpen(false);
      setModuleTitle('');
      setModuleDesc('');
      success('Módulo adicionado!');
    } catch (err) {
      error('Erro ao adicionar módulo', String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !targetModuleId) return;
    try {
      setIsSubmitting(true);
      const newLessonId = `lesson-${Date.now()}`;
      const newLesson: Lesson = {
        id: newLessonId,
        courseId: selectedCourse.id,
        moduleId: targetModuleId,
        teacherId,
        title: lessonTitle,
        description: '',
        contentType: lessonContentType,
        order: lessons.length + 1,
        status: 'published',
        visibility: 'all_my_students',
        estimatedDuration: Number(lessonDuration),
        videoUrl: lessonContentType === 'video' ? lessonVideoUrl : undefined,
        contentText: lessonText,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'lessons', newLessonId), {
        ...newLesson,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setLessons((prev) => [...prev, newLesson]);
      setIsLessonModalOpen(false);
      setLessonTitle('');
      setLessonText('');
      success('Aula publicada!');
    } catch (err) {
      error('Erro ao criar aula', String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCourseStatus = async (course: Course) => {
    const nextStatus = course.status === 'published' ? 'draft' : 'published';
    try {
      await updateDoc(doc(db, 'courses', course.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, status: nextStatus } : c))
      );
      if (selectedCourse?.id === course.id) {
        setSelectedCourse({ ...selectedCourse, status: nextStatus });
      }
      success(`Curso alterado para ${nextStatus === 'published' ? 'Publicado' : 'Rascunho'}`);
    } catch (err) {
      error('Erro ao alternar status do curso');
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Estúdio de Cursos & Aulas</h1>
          <p className="text-xs text-slate-500 mt-1">
            Organize trilhas pedagógicas, módulos temáticos e videoaulas para seus alunos vinculados.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsCourseModalOpen(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Criar Novo Curso
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Course Selector List */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Meus Cursos Cadastrados ({courses.length})
          </h2>
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
                  <Badge variant={c.status === 'published' ? 'emerald' : 'amber'} size="sm">
                    {c.status === 'published' ? 'Publicado' : 'Rascunho'}
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-semibold">{c.level}</span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{c.title}</h3>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{c.description}</p>
              </div>
            );
          })}
        </div>

        {/* Right Column: Selected Course Structure (Modules & Lessons) */}
        <div className="lg:col-span-2 space-y-4">
          {selectedCourse ? (
            <Card>
              {/* Course Title Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{selectedCourse.title}</h2>
                    <Badge variant={selectedCourse.status === 'published' ? 'emerald' : 'amber'}>
                      {selectedCourse.status === 'published' ? 'Publicado' : 'Rascunho'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedCourse.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleCourseStatus(selectedCourse)}
                  >
                    {selectedCourse.status === 'published' ? 'Tornar Rascunho' : 'Publicar Curso'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsModuleModalOpen(true)}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Novo Módulo
                  </Button>
                </div>
              </div>

              {/* Modules & Lessons tree */}
              <div className="pt-4 space-y-4">
                {modules.length > 0 ? (
                  modules.map((m) => {
                    const moduleLessons = lessons.filter((l) => l.moduleId === m.id);
                    return (
                      <div key={m.id} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50">
                        {/* Module Header */}
                        <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-blue-600" />
                            <h3 className="text-xs font-bold text-slate-900">{m.title}</h3>
                            <span className="text-[10px] text-slate-400">({moduleLessons.length} aulas)</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setTargetModuleId(m.id);
                              setIsLessonModalOpen(true);
                            }}
                            leftIcon={<Plus className="w-3.5 h-3.5 text-blue-600" />}
                          >
                            Adicionar Aula
                          </Button>
                        </div>

                        {/* Lessons in this Module */}
                        <div className="p-3 space-y-2">
                          {moduleLessons.length > 0 ? (
                            moduleLessons.map((l) => (
                              <div
                                key={l.id}
                                className="p-2.5 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2.5">
                                  {l.contentType === 'video' ? (
                                    <Video className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-blue-600" />
                                  )}
                                  <div>
                                    <p className="font-semibold text-slate-900">{l.title}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                      <span className="flex items-center gap-0.5">
                                        <Clock className="w-3 h-3" /> {l.estimatedDuration} min
                                      </span>
                                      <span>•</span>
                                      <span className="capitalize">{l.contentType}</span>
                                    </div>
                                  </div>
                                </div>
                                <Badge variant="slate" size="sm">
                                  {l.status === 'published' ? 'Disponível' : 'Oculta'}
                                </Badge>
                              </div>
                            ))
                          ) : (
                            <p className="text-[11px] text-slate-400 py-2 text-center">
                              Nenhuma aula neste módulo. Clique em "Adicionar Aula" acima.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Nenhum módulo criado para este curso ainda. Clique em "Novo Módulo".
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="text-center py-12 text-slate-400 text-xs">
              Selecione ou crie um curso para visualizar seus módulos e aulas.
            </Card>
          )}
        </div>
      </div>

      {/* Modal: New Course */}
      <Modal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        title="Criar Novo Curso de Inglês"
        description="Defina os metadados do curso e seu nível de proficiência alvo."
      >
        <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
          <Input
            label="Título do Curso"
            placeholder="Ex: Advanced Fluency & Public Speaking"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            required
          />
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição Pedagógica</label>
            <textarea
              rows={3}
              placeholder="Descreva o público-alvo, competências desenvolvidas e expectativas..."
              value={courseDesc}
              onChange={(e) => setCourseDesc(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nível de Referência (CEFR)</label>
            <select
              value={courseLevel}
              onChange={(e) => setCourseLevel(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="A1 - A2 Elementary">A1 - A2 Elementary</option>
              <option value="B1 - B2 Intermediate">B1 - B2 Intermediate</option>
              <option value="C1 - C2 Advanced / Mastery">C1 - C2 Advanced / Mastery</option>
              <option value="Business & Executive">Business & Executive</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsCourseModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Salvar Curso
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Module */}
      <Modal
        isOpen={isModuleModalOpen}
        onClose={() => setIsModuleModalOpen(false)}
        title="Adicionar Módulo"
        description="Organize suas aulas em etapas pedagógicas estruturadas."
      >
        <form onSubmit={handleCreateModule} className="space-y-4 text-xs">
          <Input
            label="Título do Módulo"
            placeholder="Ex: Módulo 3: Presentation Skills & Storytelling"
            value={moduleTitle}
            onChange={(e) => setModuleTitle(e.target.value)}
            required
          />
          <Input
            label="Breve Resumo (opcional)"
            placeholder="Ex: Estruturas narrativas e transições em palestras"
            value={moduleDesc}
            onChange={(e) => setModuleDesc(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsModuleModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Criar Módulo
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Lesson */}
      <Modal
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        title="Adicionar Nova Aula"
        description="Publique uma videoaula gravada ou conteúdo em texto com exercícios."
      >
        <form onSubmit={handleCreateLesson} className="space-y-4 text-xs">
          <Input
            label="Título da Aula"
            placeholder="Ex: 3.1 The Hook: Grabbing Attention from the First Slide"
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Conteúdo</label>
              <select
                value={lessonContentType}
                onChange={(e) => setLessonContentType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
              >
                <option value="video">Videoaula (Player Nativo)</option>
                <option value="text">Texto / Exercícios Interativos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Duração Estimada (min)</label>
              <input
                type="number"
                value={lessonDuration}
                onChange={(e) => setLessonDuration(Number(e.target.value))}
                min={5}
                max={120}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
              />
            </div>
          </div>

          {lessonContentType === 'video' ? (
            <div className="space-y-1.5">
              <Input
                label="URL do Vídeo (YouTube, Vimeo ou MP4 direto)"
                value={lessonVideoUrl}
                onChange={(e) => setLessonVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... ou https://.../video.mp4"
                helperText="Suporta links do YouTube, Vimeo e vídeos MP4/WebM diretos."
                required
              />
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-500">Exemplos rápidos:</span>
                <button
                  type="button"
                  onClick={() => setLessonVideoUrl('https://vjs.zencdn.net/v/oceans.mp4')}
                  className="text-[11px] text-blue-600 hover:underline"
                >
                  Vídeo MP4 Demo
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => setLessonVideoUrl('https://www.youtube.com/watch?v=juKd26qkNAw')}
                  className="text-[11px] text-blue-600 hover:underline"
                >
                  Aula YouTube Demo
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Conteúdo da Aula (Texto formatado no estilo Word)
              </label>
              <WordEditor
                value={lessonText}
                onChange={setLessonText}
                minHeight="200px"
                placeholder="Insira as frases-chave, vocabulário e exercícios..."
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsLessonModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Publicar Aula
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
