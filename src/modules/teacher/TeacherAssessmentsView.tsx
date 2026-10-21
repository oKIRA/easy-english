import React, { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  CheckCircle2,
  Clock,
  Edit2,
  FileCheck,
  UserCheck,
  HelpCircle,
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
import { Assessment, AssessmentResult, AssessmentQuestion } from '../../shared/types';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import { Card, CardHeader } from '../../shared/design-system/Card';
import { Modal } from '../../shared/design-system/Modal';
import { Input } from '../../shared/design-system/Input';
import { Tabs } from '../../shared/design-system/Tabs';
import { useToast } from '../../shared/design-system/Toast';

export const TeacherAssessmentsView: React.FC = () => {
  const { currentUser } = useAuth();
  const teacherId = currentUser!.uid;

  const [activeTab, setActiveTab] = useState<'assessments' | 'submissions'>('submissions');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);

  // New Assessment modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<AssessmentQuestion[]>(() => [createQuestion()]);

  // Grade Modal
  const [selectedResult, setSelectedResult] = useState<AssessmentResult | null>(null);
  const [gradeScore, setGradeScore] = useState(90);
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [isGrading, setIsGrading] = useState(false);

  const { success, error } = useToast();

  function createQuestion(): AssessmentQuestion {
    return {
      id: `question-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      prompt: '',
      type: 'multiple_choice',
      options: ['', ''],
      correctAnswer: '',
      points: 1,
    };
  }

  const loadAssessmentsData = async () => {
    try {
      setLoading(true);
      // Load assessments
      const aSnap = await getDocs(
        query(collection(db, 'assessments'), where('teacherId', '==', teacherId))
      );
      const aList: Assessment[] = [];
      aSnap.forEach((d) => aList.push({ id: d.id, ...d.data() } as Assessment));
      setAssessments(aList);

      // Load results
      const rSnap = await getDocs(
        query(collection(db, 'assessmentResults'), where('teacherId', '==', teacherId))
      );
      const rList: AssessmentResult[] = [];
      rSnap.forEach((d) => rList.push({ id: d.id, ...d.data() } as AssessmentResult));
      setResults(rList);
    } catch (e) {
      console.warn('Using default assessments data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssessmentsData();
  }, [teacherId]);

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (questions.some((question) => !question.correctAnswer || !question.options?.includes(question.correctAnswer))) {
      error('Selecione a alternativa correta de cada pergunta.');
      return;
    }

    try {
      const assessmentId = `eval-${Date.now()}`;
      const maxScore = questions.reduce((total, question) => total + question.points, 0);

      const newEval: Assessment = {
        id: assessmentId,
        teacherId,
        title,
        description,
        assessmentType: 'quiz',
        maxScore,
        passingScore: Math.ceil(maxScore * 0.7),
        questions,
        status: 'published',
        dueAt: new Date(Date.now() + 14 * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'assessments', assessmentId), {
        ...newEval,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Audit Log
      await setDoc(doc(db, 'auditLogs', `log-${Date.now()}`), {
        actorId: teacherId,
        actorName: currentUser?.name || 'Professor',
        action: 'CREATE_ASSESSMENT',
        entityType: 'assessments',
        entityId: assessmentId,
        metadata: { title, questionCount: questions.length },
        createdAt: new Date().toISOString(),
      });

      setAssessments((prev) => [newEval, ...prev]);
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setQuestions(() => [createQuestion()]);
      success('Avaliação criada e disponibilizada aos alunos!');
    } catch (err) {
      error('Falha ao criar avaliação', String(err));
    }
  };

  const handleSaveGrade = async () => {
    if (!selectedResult) return;
    const maxScore = selectedResult.maxScore ?? 100;
    const score = Math.min(maxScore, Math.max(0, Number(gradeScore)));
    try {
      setIsGrading(true);
      await updateDoc(doc(db, 'assessmentResults', selectedResult.id), {
        score,
        feedback: gradeFeedback,
        status: 'graded',
        gradedBy: teacherId,
        gradedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });

      // Send student notification
      await setDoc(doc(db, 'notifications', `notif-${Date.now()}`), {
        userId: selectedResult.studentId,
        type: 'new_grade',
        title: 'Nova Nota Disponível',
        message: `Sua avaliação foi corrigida pelo Prof. ${currentUser?.name || 'Docente'}. Nota: ${score}/${maxScore}.`,
        relatedEntityId: selectedResult.id,
        readAt: null,
        createdAt: new Date().toISOString(),
      });

      // Audit Log
      await setDoc(doc(db, 'auditLogs', `log-${Date.now()}`), {
        actorId: teacherId,
        actorName: currentUser?.name || 'Professor',
        action: 'GRADE_ASSESSMENT_RESULT',
        entityType: 'assessmentResults',
        entityId: selectedResult.id,
        targetUserId: selectedResult.studentId,
        metadata: { score, maxScore, feedback: gradeFeedback },
        createdAt: new Date().toISOString(),
      });

      setResults((prev) =>
        prev.map((r) =>
          r.id === selectedResult.id
            ? { ...r, score, maxScore, feedback: gradeFeedback, status: 'graded' }
            : r
        )
      );

      setSelectedResult(null);
      success('Avaliação corrigida!', 'Nota e feedback registrados com notificação enviada ao estudante.');
    } catch (err) {
      error('Erro ao registrar nota', String(err));
    } finally {
      setIsGrading(false);
    }
  };

  const openGradeModal = (res: AssessmentResult) => {
    setSelectedResult(res);
    setGradeScore(res.score ?? Math.min(85, res.maxScore ?? 100));
    setGradeFeedback(res.feedback || '');
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Avaliações, Quizzes & Devolutivas</h1>
          <p className="text-xs text-slate-500 mt-1">
            Crie testes práticos, analise envios dos alunos e atribua notas e feedbacks pedagógicos detalhados.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Nova Avaliação
        </Button>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as any)}
        tabs={[
          { id: 'submissions', label: 'Envios de Alunos & Correções', badge: results.length },
          { id: 'assessments', label: 'Avaliações Criadas', badge: assessments.length },
        ]}
      />

      {/* Tab 1: Submissions */}
      {activeTab === 'submissions' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3">Aluno</th>
                <th className="px-4 py-3">Avaliação</th>
                <th className="px-4 py-3">Nota Atual</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Feedback Pedagógico</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {results.length > 0 ? (
                results.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-slate-900">Beatriz Santos</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {assessments.find((assessment) => assessment.id === r.assessmentId)?.title || 'Avaliação'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-bold text-slate-900">{r.score}</span>
                      <span className="text-slate-400 text-[10px]"> / {r.maxScore ?? 100}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={r.status === 'graded' ? 'emerald' : 'amber'}>
                        {r.status === 'graded' ? 'Corrigido' : 'Pendente de Nota'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate italic">
                      {r.feedback || 'Sem feedback atribuído'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openGradeModal(r)}
                        leftIcon={<Edit2 className="w-3.5 h-3.5 text-blue-600" />}
                      >
                        {r.status === 'graded' ? 'Editar Nota' : 'Avaliar'}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    {loading ? 'Carregando envios...' : 'Nenhum envio de aluno no momento.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Assessments created */}
      {activeTab === 'assessments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assessments.map((a) => (
            <Card key={a.id} className="flex flex-col justify-between hoverable">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="blue" className="uppercase" size="sm">
                    {a.assessmentType}
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Pontos Máx: {a.maxScore}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-900">{a.title}</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{a.description}</p>
                <div className="mt-3 text-[10px] text-slate-400 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{a.questions?.length || 0} questões interativas</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-4">
                <span className="text-[10px] text-emerald-600 font-semibold">Publicado</span>
                <Badge variant="slate" size="sm">
                  Ativo
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: New Assessment */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Criar novo quiz"
        description="Escreva suas perguntas, personalize as alternativas e marque a resposta correta."
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateAssessment} className="space-y-5 text-xs">
          <Input
            label="Título do quiz"
            placeholder="Ex.: Revisão da Unidade 2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Orientações para o aluno</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explique o que o aluno precisa saber antes de responder."
              className="w-full rounded-lg border border-slate-300 p-2 text-xs"
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-900">Perguntas e alternativas</h4>
                <p className="mt-1 text-[11px] text-slate-500">
                  Adicione quantas perguntas precisar. Cada pergunta pode ter seu próprio número de alternativas.
                </p>
              </div>
              <span className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-800">
                Pontuação total: {questions.reduce((total, question) => total + question.points, 0)}
              </span>
            </div>

            {questions.map((question, questionIndex) => (
              <section key={question.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h5 className="font-bold text-slate-800">Pergunta {questionIndex + 1}</h5>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`${question.id}-points`} className="text-[11px] font-medium text-slate-600">
                      Pontos
                    </label>
                    <input
                      id={`${question.id}-points`}
                      type="number"
                      min="1"
                      step="1"
                      value={question.points}
                      onChange={(event) => {
                        const points = Math.max(1, Number(event.target.value) || 1);
                        setQuestions((current) =>
                          current.map((item) => item.id === question.id ? { ...item, points } : item)
                        );
                      }}
                      className="w-20 rounded-lg border border-slate-300 bg-white p-2 text-xs"
                      aria-label={`Pontos da pergunta ${questionIndex + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))}
                      disabled={questions.length === 1}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Remover pergunta ${questionIndex + 1}`}
                      title="Remover pergunta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={question.prompt}
                  onChange={(event) =>
                    setQuestions((current) =>
                      current.map((item) => item.id === question.id ? { ...item, prompt: event.target.value } : item)
                    )
                  }
                  placeholder="Digite o enunciado da pergunta"
                  aria-label={`Enunciado da pergunta ${questionIndex + 1}`}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs"
                  required
                />

                <fieldset className="space-y-2">
                  <legend className="text-[11px] font-semibold text-slate-700">
                    Alternativas <span className="font-normal text-slate-500">(selecione a resposta correta)</span>
                  </legend>
                  {question.options?.map((option, optionIndex) => (
                    <div key={`${question.id}-option-${optionIndex}`} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`${question.id}-correct`}
                        checked={Boolean(option) && question.correctAnswer === option}
                        onChange={() =>
                          setQuestions((current) =>
                            current.map((item) =>
                              item.id === question.id ? { ...item, correctAnswer: option } : item
                            )
                          )
                        }
                        aria-label={`Marcar alternativa ${optionIndex + 1} como correta`}
                        required={!question.correctAnswer}
                        className="h-4 w-4 accent-blue-600"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(event) => {
                          const value = event.target.value;
                          setQuestions((current) =>
                            current.map((item) => {
                              if (item.id !== question.id) return item;
                              const options = [...(item.options || [])];
                              const previousValue = options[optionIndex];
                              options[optionIndex] = value;
                              return {
                                ...item,
                                options,
                                correctAnswer: item.correctAnswer === previousValue && previousValue ? value : item.correctAnswer,
                              };
                            })
                          );
                        }}
                        placeholder={`Alternativa ${optionIndex + 1}`}
                        aria-label={`Alternativa ${optionIndex + 1} da pergunta ${questionIndex + 1}`}
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white p-2 text-xs"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setQuestions((current) =>
                            current.map((item) => {
                              if (item.id !== question.id || !item.options) return item;
                              const options = item.options.filter((_, index) => index !== optionIndex);
                              const correctAnswer = item.correctAnswer === option ? options[0] || '' : item.correctAnswer;
                              return { ...item, options, correctAnswer };
                            })
                          )
                        }
                        disabled={(question.options?.length || 0) <= 2}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Remover alternativa ${optionIndex + 1}`}
                        title="Remover alternativa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setQuestions((current) =>
                        current.map((item) =>
                          item.id === question.id ? { ...item, options: [...(item.options || []), ''] } : item
                        )
                      )
                    }
                    className="rounded-lg px-2 py-1.5 font-semibold text-blue-700 transition-colors hover:bg-blue-50"
                  >
                    + Adicionar alternativa
                  </button>
                </fieldset>
              </section>
            ))}

            <Button type="button" variant="outline" onClick={() => setQuestions((current) => [...current, createQuestion()])}>
              + Adicionar pergunta
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Publicar quiz</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Grade Submission */}
      <Modal
        isOpen={Boolean(selectedResult)}
        onClose={() => setSelectedResult(null)}
        title="Atribuir Nota & Feedback Pedagógico"
        description="Preserva o histórico de alterações para a integridade acadêmica."
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nota Final (0 a {selectedResult?.maxScore ?? 100})
            </label>
            <input
              type="number"
              min={0}
              max={selectedResult?.maxScore ?? 100}
              value={gradeScore}
              onChange={(e) => setGradeScore(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Feedback Construtivo & Devolutiva ao Aluno
            </label>
            <textarea
              rows={4}
              value={gradeFeedback}
              onChange={(e) => setGradeFeedback(e.target.value)}
              placeholder="Aponte os acertos, expressões bem empregadas e recomendações de estudo para as próximas sessões..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setSelectedResult(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveGrade} isLoading={isGrading} leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}>
              Registrar Nota
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
