import React, { useState, useEffect } from 'react';
import {
  Edit3,
  Save,
} from 'lucide-react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { User, StudentProfile, TeacherStudentRelationship } from '../../shared/types';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import { Modal } from '../../shared/design-system/Modal';
import { useToast } from '../../shared/design-system/Toast';

export const TeacherStudentsView: React.FC = () => {
  const { currentUser, activeRole } = useAuth();
  const teacherId = currentUser?.uid;

  const [myStudents, setMyStudents] = useState<Array<{ user: User; profile?: StudentProfile; relId: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Selected student for Dossier & Private Notes
  const [selectedStudent, setSelectedStudent] = useState<{ user: User; profile?: StudentProfile; relId: string } | null>(null);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const { success, error } = useToast();

  const loadStudentsData = async () => {
    try {
      setLoading(true);

      if (!teacherId) {
        setMyStudents([]);
        return;
      }

      const relQuery = activeRole === 'admin'
        ? query(collection(db, 'teacherStudentRelationships'), where('status', '==', 'active'))
        : query(
            collection(db, 'teacherStudentRelationships'),
            where('teacherId', '==', teacherId),
            where('status', '==', 'active')
          );
      const relSnap = await getDocs(relQuery);
      const activeRels = relSnap.docs.map(
        (relationship) => ({ id: relationship.id, ...relationship.data() } as TeacherStudentRelationship)
      );

      const students: User[] = [];
      if (activeRole === 'admin') {
        const userSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
        userSnapshot.docs.forEach((student) => students.push({ uid: student.id, ...student.data() } as User));
      } else {
        const assignedStudents = await Promise.all(
          activeRels.map((relationship) => getDoc(doc(db, 'users', relationship.studentId)))
        );
        assignedStudents.forEach((student) => {
          if (student.exists() && student.data().role === 'student') {
            students.push({ uid: student.id, ...student.data() } as User);
          }
        });
      }

      const relationshipByStudent = new Map(
        activeRels.map((relationship) => [relationship.studentId, relationship])
      );
      const myStudentsList = await Promise.all(students.map(async (student) => {
        const [relationship, profileSnapshot] = await Promise.all([
          Promise.resolve(relationshipByStudent.get(student.uid)),
          getDoc(doc(db, 'studentProfiles', student.uid)),
        ]);
        return {
          user: student,
          profile: profileSnapshot.exists() ? profileSnapshot.data() as StudentProfile : undefined,
          relId: relationship?.id || '',
        };
      }));

      setMyStudents(myStudentsList);
    } catch (e) {
      console.error('Failed to load student list:', e);
      error('Erro ao carregar lista de alunos', String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStudentsData();
  }, [teacherId, activeRole]);

  // Save private teacher notes (not visible to the student per spec)
  const handleSaveNotes = async () => {
    if (!selectedStudent) return;
    try {
      setIsSavingNotes(true);
      await setDoc(
        doc(db, 'studentProfiles', selectedStudent.user.uid),
        {
          studentId: selectedStudent.user.uid,
          notes: teacherNotes,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Audit Log
      await setDoc(doc(db, 'auditLogs', `log-${Date.now()}`), {
        actorId: teacherId,
        actorName: currentUser?.name || 'Professor',
        action: 'UPDATE_STUDENT_PEDAGOGICAL_NOTES',
        entityType: 'studentProfiles',
        entityId: selectedStudent.user.uid,
        targetUserId: selectedStudent.user.uid,
        createdAt: new Date().toISOString(),
      });

      setMyStudents((prev) =>
        prev.map((item) =>
          item.user.uid === selectedStudent.user.uid
            ? {
                ...item,
                profile: item.profile
                  ? { ...item.profile, notes: teacherNotes }
                  : ({ studentId: item.user.uid, notes: teacherNotes }),
              }
            : item
        )
      );

      success('Observações salvas', 'As notas pedagógicas foram registradas com sigilo docente.');
      setSelectedStudent(null);
    } catch (err) {
      error('Erro ao salvar observações', String(err));
    } finally {
      setIsSavingNotes(false);
    }
  };

  const openDossier = (item: { user: User; profile?: StudentProfile; relId: string }) => {
    setSelectedStudent(item);
    setTeacherNotes(item.profile?.notes || '');
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          {activeRole === 'admin' ? 'Todos os Alunos' : 'Meus Alunos'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {activeRole === 'admin'
            ? 'Visualize os perfis de todos os alunos cadastrados e seus vínculos ativos.'
            : 'Visualize somente os alunos vinculados ao seu perfil.'}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 font-semibold text-slate-700">
            <tr>
              <th className="px-4 py-3">Aluno</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Nível CEFR</th>
              <th className="px-4 py-3">Objetivos de Aprendizagem</th>
              <th className="px-4 py-3">Notas Privadas do Professor</th>
              <th className="px-4 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {myStudents.length > 0 ? (
              myStudents.map((item) => (
                <tr key={item.user.uid} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                        {item.user.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 block">{item.user.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {item.relId ? 'Vínculo ativo' : 'Sem professor vinculado'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">{item.user.email}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant="purple" size="sm">{item.profile?.englishLevel || 'Não informado'}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">
                    {item.profile?.learningGoals?.join(', ') || 'Não informado'}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate italic">
                    {item.profile?.notes || 'Sem observações registradas ainda'}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDossier(item)}
                      leftIcon={<Edit3 className="w-3.5 h-3.5 text-blue-600" />}
                    >
                      Dossiê & Notas
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {loading
                    ? 'Carregando...'
                    : activeRole === 'admin'
                      ? 'Nenhum aluno cadastrado.'
                      : 'Você não possui alunos vinculados no momento.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Student Dossier & Private Teacher Notes */}
      <Modal
        isOpen={Boolean(selectedStudent)}
        onClose={() => setSelectedStudent(null)}
        title={`Dossiê Pedagógico: ${selectedStudent?.user.name}`}
        description="Informações acadêmicas e anotações privadas do docente."
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 block text-[10px]">E-mail</span>
              <span className="font-semibold text-slate-900">{selectedStudent?.user.email}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Nível de Inglês</span>
              <span className="font-semibold text-purple-700">{selectedStudent?.profile?.englishLevel || 'Não informado'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block text-[10px]">Objetivos Declarados</span>
              <span className="text-slate-700">
                {selectedStudent?.profile?.learningGoals?.join(', ') || 'Não informado'}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-800">Notas Pedagógicas Privadas</label>
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Sigiloso (Aluno não visualiza)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Registre pontos de atenção (gramática, pronúncia, vocabulário) e histórico de desempenho do estudante.
            </p>
            <textarea
              rows={5}
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              placeholder="Ex: Aluna apresenta boa fluência mas hesita no uso de Third Conditional. Recomendar exercícios práticos..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setSelectedStudent(null)}>
              Fechar
            </Button>
            <Button onClick={handleSaveNotes} isLoading={isSavingNotes} leftIcon={<Save className="w-3.5 h-3.5" />}>
              Salvar Notas
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
