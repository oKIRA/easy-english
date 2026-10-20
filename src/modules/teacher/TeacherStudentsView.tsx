import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  BookOpen,
  Award,
  Edit3,
  Save,
  CheckCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { User, StudentProfile, TeacherStudentRelationship } from '../../shared/types';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import { Tabs } from '../../shared/design-system/Tabs';
import { Modal } from '../../shared/design-system/Modal';
import { useToast } from '../../shared/design-system/Toast';

export const TeacherStudentsView: React.FC = () => {
  const { currentUser } = useAuth();
  const teacherId = currentUser?.uid || 'demo-teacher-01';

  const [activeTab, setActiveTab] = useState<'my_students' | 'available_students'>('my_students');
  const [myStudents, setMyStudents] = useState<Array<{ user: User; profile?: StudentProfile; relId: string }>>([]);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected student for Dossier & Private Notes
  const [selectedStudent, setSelectedStudent] = useState<{ user: User; profile?: StudentProfile; relId: string } | null>(null);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const { success, error, info } = useToast();

  const loadStudentsData = async () => {
    try {
      setLoading(true);

      // 1. Get all relationships
      const relSnap = await getDocs(collection(db, 'teacherStudentRelationships'));
      const activeRels: TeacherStudentRelationship[] = [];
      const studentIdsWithTeacher = new Set<string>();

      relSnap.forEach((d) => {
        const r = { id: d.id, ...d.data() } as TeacherStudentRelationship;
        if (r.status === 'active') {
          studentIdsWithTeacher.add(r.studentId);
          if (r.teacherId === teacherId) {
            activeRels.push(r);
          }
        }
      });

      // 2. Get all students
      const usersSnap = await getDocs(collection(db, 'users'));
      const allStudents: User[] = [];
      usersSnap.forEach((d) => {
        const u = { uid: d.id, ...d.data() } as User;
        if (u.role === 'student' && u.status === 'active') {
          allStudents.push(u);
        }
      });

      // 3. For my students, fetch profiles
      const myStudentsList: Array<{ user: User; profile?: StudentProfile; relId: string }> = [];
      for (const rel of activeRels) {
        const userObj = allStudents.find((s) => s.uid === rel.studentId);
        if (userObj) {
          let prof: StudentProfile | undefined;
          try {
            const pSnap = await getDoc(doc(db, 'studentProfiles', rel.studentId));
            if (pSnap.exists()) {
              prof = pSnap.data() as StudentProfile;
            }
          } catch {}
          myStudentsList.push({ user: userObj, profile: prof, relId: rel.id });
        }
      }

      // 4. Available students: students with NO active relationship
      const availableList = allStudents.filter((s) => !studentIdsWithTeacher.has(s.uid));

      setMyStudents(myStudentsList);
      setAvailableStudents(availableList);
    } catch (e) {
      console.error(e);
      error('Erro ao carregar lista de alunos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentsData();
  }, [teacherId]);

  // Bind an available student to THIS teacher (Teacher cannot bind to other teachers)
  const handleAssignToMe = async (student: User) => {
    try {
      const relId = `rel-${Date.now()}`;
      const newRel: TeacherStudentRelationship = {
        id: relId,
        studentId: student.uid,
        teacherId: teacherId,
        status: 'active',
        assignedBy: teacherId,
        assignedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'teacherStudentRelationships', relId), {
        ...newRel,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Audit log
      await setDoc(doc(db, 'auditLogs', `log-${Date.now()}`), {
        actorId: teacherId,
        actorName: currentUser?.name || 'Professor',
        action: 'TEACHER_ASSIGN_STUDENT',
        entityType: 'teacherStudentRelationships',
        entityId: relId,
        targetUserId: student.uid,
        createdAt: new Date().toISOString(),
      });

      success('Aluno vinculado com sucesso!', `${student.name} agora faz parte da sua turma individual.`);
      await loadStudentsData();
    } catch (err) {
      error('Falha ao vincular aluno', String(err));
    }
  };

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
                  : ({ studentId: item.user.uid, englishLevel: 'B1', learningGoals: [], notes: teacherNotes, createdAt: '', updatedAt: '' }),
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
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Meus Alunos & Gestão de Vínculos</h1>
        <p className="text-xs text-slate-500 mt-1">
          Acompanhe dossiês acadêmicos, níveis de proficiência (CEFR) e vincule alunos disponíveis à sua mentoria.
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as any)}
        tabs={[
          { id: 'my_students', label: 'Alunos sob Minha Responsabilidade', badge: myStudents.length },
          { id: 'available_students', label: 'Alunos Disponíveis na Plataforma', badge: availableStudents.length },
        ]}
      />

      {/* Tab 1: My Students */}
      {activeTab === 'my_students' && (
        <div className="space-y-4">
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
                            <span className="text-[10px] text-slate-400">Vínculo Ativo</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{item.user.email}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant="purple" size="sm">
                          {item.profile?.englishLevel || 'B1 Intermediate'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">
                        {item.profile?.learningGoals?.join(', ') || 'Fluência geral & Reuniões'}
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
                      {loading ? 'Carregando...' : 'Você não possui nenhum aluno vinculado no momento.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Available Students */}
      {activeTab === 'available_students' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-amber-900 space-y-1">
              <p className="font-semibold">Regra de Segurança e Concorrência Docente:</p>
              <p className="text-amber-700 leading-relaxed">
                Você pode consultar alunos não vinculados e associá-los ao <strong>seu próprio perfil</strong>. É proibido pela arquitetura alterar ou capturar alunos associados a outros professores.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <th className="px-4 py-3">Aluno Disponível</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Status de Matrícula</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {availableStudents.length > 0 ? (
                  availableStudents.map((student) => (
                    <tr key={student.uid} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-slate-900">{student.name}</td>
                      <td className="px-4 py-3.5 text-slate-500">{student.email}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant="amber">Sem Professor Mentor</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="emerald"
                          onClick={() => handleAssignToMe(student)}
                          leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                        >
                          Vincular a Mim
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      {loading ? 'Carregando...' : 'Nenhum aluno sem vínculo disponível no momento.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              <span className="font-semibold text-purple-700">{selectedStudent?.profile?.englishLevel || 'B1 Intermediate'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block text-[10px]">Objetivos Declarados</span>
              <span className="text-slate-700">
                {selectedStudent?.profile?.learningGoals?.join(', ') || 'Fluência corporativa e preparação técnica'}
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
