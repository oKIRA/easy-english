import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  HelpCircle,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { Assessment, AssessmentResult } from '../../shared/types';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import { Card, CardHeader } from '../../shared/design-system/Card';
import { Modal } from '../../shared/design-system/Modal';
import { useToast } from '../../shared/design-system/Toast';

export const StudentAssessmentsView: React.FC = () => {
  const { currentUser } = useAuth();
  const studentId = currentUser!.uid;

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Assessment | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedResult, setCompletedResult] = useState<{ score: number; maxScore: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const { success, error } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      // Load available assessments
      const aSnap = await getDocs(
        query(collection(db, 'assessments'), where('status', '==', 'published'))
      );
      const aList: Assessment[] = [];
      aSnap.forEach((d) => aList.push({ id: d.id, ...d.data() } as Assessment));
      setAssessments(aList);

      // Load my results
      const rSnap = await getDocs(
        query(collection(db, 'assessmentResults'), where('studentId', '==', studentId))
      );
      const rList: AssessmentResult[] = [];
      rSnap.forEach((d) => rList.push({ id: d.id, ...d.data() } as AssessmentResult));
      setResults(rList);
    } catch (e) {
      console.warn('Student assessments preview', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId]);

  const startQuiz = (quiz: Assessment) => {
    setActiveQuiz(quiz);
    setSelectedAnswers({});
    setCompletedResult(null);
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    const questions = activeQuiz.questions || [];
    if (!questions.length || questions.some((question) => !selectedAnswers[question.id])) {
      error('Responda todas as perguntas antes de enviar o quiz.');
      return;
    }

    try {
      setIsSubmitting(true);
      let calculatedScore = 0;

      // Calculate score based on correct answers
      questions.forEach((q) => {
        if (selectedAnswers[q.id] === q.correctAnswer) {
          calculatedScore += q.points;
        }
      });

      const resultId = `res-${studentId}-${activeQuiz.id}`;
      const newResult: AssessmentResult = {
        id: resultId,
        assessmentId: activeQuiz.id,
        studentId,
        teacherId: activeQuiz.teacherId,
        score: calculatedScore,
        maxScore: activeQuiz.maxScore,
        answers: selectedAnswers,
        feedback: 'Quiz corrigido automaticamente.',
        status: 'graded',
        gradedBy: activeQuiz.teacherId,
        gradedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'assessmentResults', resultId), {
        ...newResult,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Audit Log
      await setDoc(doc(db, 'auditLogs', `log-${Date.now()}`), {
        actorId: studentId,
        actorName: currentUser?.name || 'Aluno',
        action: 'SUBMIT_ASSESSMENT',
        entityType: 'assessmentResults',
        entityId: resultId,
        metadata: { score: calculatedScore, maxScore: activeQuiz.maxScore },
        createdAt: new Date().toISOString(),
      });

      setResults((prev) => [newResult, ...prev.filter((r) => r.assessmentId !== activeQuiz.id)]);
      setCompletedResult({ score: calculatedScore, maxScore: activeQuiz.maxScore });
      success('Avaliação concluída e registrada!', `Sua nota foi ${calculatedScore} / ${activeQuiz.maxScore}.`);
    } catch (err) {
      error('Falha ao enviar respostas');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Minhas Avaliações, Notas & Devolutivas</h1>
        <p className="text-xs text-slate-500 mt-1">
          Realize testes práticos de proficiência em inglês e consulte os feedbacks atribuídos pelo seu professor mentor.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Tests to Take */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-600" /> Testes Disponíveis para Responder
          </h2>

          <div className="space-y-3">
            {assessments.map((a) => {
              const alreadyTaken = results.find((r) => r.assessmentId === a.id);
              return (
                <Card key={a.id} className="hoverable">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="blue" size="sm" className="uppercase">
                          {a.assessmentType}
                        </Badge>
                        {alreadyTaken && (
                          <Badge variant="emerald" size="sm">
                            Realizado (Nota: {alreadyTaken.score})
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-xs font-bold text-slate-900">{a.title}</h3>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{a.description}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <Button
                        size="sm"
                        variant={alreadyTaken ? 'outline' : 'primary'}
                        onClick={() => startQuiz(a)}
                      >
                        {alreadyTaken ? 'Refazer Teste' : 'Iniciar Teste'}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* History of Grades & Feedback */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-600" /> Meu Histórico Acadêmico de Notas
          </h2>

          <div className="space-y-3">
            {results.length > 0 ? (
              results.map((r) => (
                <Card key={r.id} className="border-l-4 border-l-purple-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900">
                      {assessments.find((assessment) => assessment.id === r.assessmentId)?.title || 'Quiz'}
                    </span>
                    <Badge variant={r.score >= (r.maxScore ?? 100) * 0.7 ? 'emerald' : 'amber'} size="sm">
                      Nota: {r.score} / {r.maxScore ?? 100}
                    </Badge>
                  </div>

                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-xs">
                    <span className="font-semibold text-purple-900 block mb-1">
                      Comentário do Professor Mentor:
                    </span>
                    <p className="text-slate-700 italic">
                      "{r.feedback || 'Bom domínio gramatical! Continue praticando os phrasal verbs.'}"
                    </p>
                  </div>

                  <div className="pt-2 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Corrigido pelo docente</span>
                    <span>{r.gradedAt ? new Date(r.gradedAt).toLocaleDateString('pt-BR') : 'Recentemente'}</span>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="text-center py-12 text-slate-400 text-xs">
                Você ainda não concluiu avaliações. Selecione um teste ao lado.
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Interactive Quiz Taker */}
      <Modal
        isOpen={Boolean(activeQuiz)}
        onClose={() => setActiveQuiz(null)}
        title={activeQuiz?.title || 'Avaliação de Inglês'}
        description="Leia atentamente cada enunciado e escolha a alternativa correta."
        maxWidth="2xl"
      >
        {activeQuiz && (
          <div className="space-y-6 text-xs">
            {completedResult ? (
              <div className="p-6 text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-lg font-bold text-emerald-900">Teste Concluído!</h3>
                <p className="text-xs text-emerald-700">
                  Sua pontuação final:{' '}
                  <strong className="text-base font-bold">
                    {completedResult.score} / {completedResult.maxScore} pontos
                  </strong>
                </p>
                <Button size="sm" onClick={() => setActiveQuiz(null)}>
                  Fechar Avaliação
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  {(activeQuiz.questions || []).map((q, qIndex) => (
                    <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                      <p className="font-bold text-slate-900 text-xs">
                        Pergunta {qIndex + 1}: {q.prompt}
                      </p>
                      <div className="space-y-2">
                        {(q.options || []).map((opt) => {
                          const isSelected = selectedAnswers[q.id] === opt;
                          return (
                            <label
                              key={opt}
                              onClick={() => setSelectedAnswers({ ...selectedAnswers, [q.id]: opt })}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50/60 font-semibold text-blue-900'
                                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                checked={isSelected}
                                onChange={() => {}}
                                className="accent-blue-600"
                              />
                              <span className="text-xs leading-relaxed">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button variant="ghost" onClick={() => setActiveQuiz(null)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmitQuiz}
                    isLoading={isSubmitting}
                    disabled={(activeQuiz.questions || []).some((question) => !selectedAnswers[question.id])}
                  >
                    Enviar Respostas para Correção
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
