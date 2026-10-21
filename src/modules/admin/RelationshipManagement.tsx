import React, { useState, useEffect } from 'react';
import {
  Link2,
  Unlink2,
  Plus,
  UserCheck,
  GraduationCap,
  AlertCircle,
  Clock,
  History,
} from 'lucide-react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  writeBatch,
  deleteField,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { TeacherStudentRelationship, User } from '../../shared/types';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import { Modal } from '../../shared/design-system/Modal';
import { useToast } from '../../shared/design-system/Toast';

export const RelationshipManagement: React.FC = () => {
  const [relationships, setRelationships] = useState<TeacherStudentRelationship[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // New binding modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [bindingReason, setBindingReason] = useState('Matrícula semestral regular');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // End binding modal state
  const [endTargetRel, setEndTargetRel] = useState<TeacherStudentRelationship | null>(null);
  const [endReason, setEndReason] = useState('Conclusão de ciclo de estudos');

  const { success, error, info } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      // Load relationships
      const relSnap = await getDocs(collection(db, 'teacherStudentRelationships'));
      const relList: TeacherStudentRelationship[] = [];
      relSnap.forEach((d) => relList.push({ id: d.id, ...d.data() } as TeacherStudentRelationship));
      setRelationships(relList);

      // Load users
      const usersSnap = await getDocs(collection(db, 'users'));
      const tList: User[] = [];
      const sList: User[] = [];
      usersSnap.forEach((d) => {
        const u = { uid: d.id, ...d.data() } as User;
        if (u.role === 'teacher') tList.push(u);
        if (u.role === 'student') sList.push(u);
      });

      const activeRelationships = relList
        .filter((relationship) => relationship.status === 'active')
        .sort((left, right) => String(left.assignedAt).localeCompare(String(right.assignedAt)));
      const activeRelationshipByStudent = new Map<string, TeacherStudentRelationship>();
      activeRelationships.forEach((relationship) => {
        activeRelationshipByStudent.set(relationship.studentId, relationship);
      });
      const assignmentsToSync = sList.filter((student) => {
        const activeRelationship = activeRelationshipByStudent.get(student.uid);
        return student.activeTeacherId !== activeRelationship?.teacherId;
      });
      for (let offset = 0; offset < assignmentsToSync.length; offset += 450) {
        const batch = writeBatch(db);
        assignmentsToSync.slice(offset, offset + 450).forEach((student) => {
          const activeRelationship = activeRelationshipByStudent.get(student.uid);
          batch.update(doc(db, 'users', student.uid), activeRelationship
            ? { activeTeacherId: activeRelationship.teacherId }
            : { activeTeacherId: deleteField() });
        });
        await batch.commit();
      }

      setTeachers(tList);
      setStudents(sList.map((student) => {
        const relationship = activeRelationshipByStudent.get(student.uid);
        if (relationship) return { ...student, activeTeacherId: relationship.teacherId };
        const { activeTeacherId: _activeTeacherId, ...unassignedStudent } = student;
        return unassignedStudent;
      }));
    } catch (e) {
      console.error(e);
      error('Falha ao carregar vínculos e usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedTeacherId) {
      error('Selecione o aluno e o professor');
      return;
    }

    try {
      setIsSubmitting(true);

      // Rule: check if student already has an active relationship
      const activeExisting = relationships.filter(
        (r) => r.studentId === selectedStudentId && r.status === 'active'
      );

      if (activeExisting.length === 1) {
        if (activeExisting[0].teacherId === selectedTeacherId) {
          error('Este aluno já está vinculado ao professor selecionado.');
          return;
        }
        info('Transferência detectada', 'Encerrando automaticamente o vínculo anterior do aluno...');
      } else if (activeExisting.length > 1) {
        info('Vínculos duplicados detectados', 'Os vínculos ativos anteriores serão encerrados antes da nova atribuição.');
      }

      const relId = `rel-${Date.now()}`;
      const newRel: TeacherStudentRelationship = {
        id: relId,
        studentId: selectedStudentId,
        teacherId: selectedTeacherId,
        status: 'active',
        assignedBy: 'admin',
        assignedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const bindingBatch = writeBatch(db);
      activeExisting.forEach((relationship) => {
        bindingBatch.update(doc(db, 'teacherStudentRelationships', relationship.id), {
          status: 'ended',
          endedAt: new Date().toISOString(),
          endedBy: 'admin',
          endReason: `Transferência administrativa para outro docente (${selectedTeacherId})`,
          updatedAt: serverTimestamp(),
        });
      });
      bindingBatch.set(doc(db, 'teacherStudentRelationships', relId), {
        ...newRel,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      bindingBatch.update(doc(db, 'users', selectedStudentId), {
        activeTeacherId: selectedTeacherId,
      });
      await bindingBatch.commit();

      // Audit Log
      await setDoc(doc(db, 'auditLogs', `log-${Date.now()}`), {
        actorId: 'admin',
        actorName: 'Coordenação Pedagógica',
        action: 'ASSIGN_STUDENT_TO_TEACHER',
        entityType: 'teacherStudentRelationships',
        entityId: relId,
        targetUserId: selectedStudentId,
        metadata: {
          teacherId: selectedTeacherId,
          reason: bindingReason,
        },
        createdAt: new Date().toISOString(),
      });

      await loadData();
      setIsModalOpen(false);
      setSelectedStudentId('');
      setSelectedTeacherId('');
      success('Vínculo criado com sucesso!', 'O aluno agora tem acesso exclusivo ao professor mentor designado.');
    } catch (err) {
      error('Falha ao estabelecer vínculo', String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndBinding = async () => {
    if (!endTargetRel) return;

    try {
      const replacement = relationships
        .filter((relationship) =>
          relationship.studentId === endTargetRel.studentId
          && relationship.id !== endTargetRel.id
          && relationship.status === 'active'
        )
        .sort((left, right) => String(right.assignedAt).localeCompare(String(left.assignedAt)))[0];
      const endingBatch = writeBatch(db);
      endingBatch.update(doc(db, 'teacherStudentRelationships', endTargetRel.id), {
        status: 'ended',
        endedAt: new Date().toISOString(),
        endedBy: 'admin',
        endReason: endReason || 'Encerrado pela coordenação',
        updatedAt: serverTimestamp(),
      });
      endingBatch.update(
        doc(db, 'users', endTargetRel.studentId),
        replacement ? { activeTeacherId: replacement.teacherId } : { activeTeacherId: deleteField() }
      );
      await endingBatch.commit();

      // Audit Log
      await setDoc(doc(db, 'auditLogs', `log-${Date.now()}`), {
        actorId: 'admin',
        actorName: 'Coordenação Pedagógica',
        action: 'UNASSIGN_STUDENT',
        entityType: 'teacherStudentRelationships',
        entityId: endTargetRel.id,
        targetUserId: endTargetRel.studentId,
        metadata: { reason: endReason },
        createdAt: new Date().toISOString(),
      });

      setRelationships((prev) =>
        prev.map((r) =>
          r.id === endTargetRel.id
            ? { ...r, status: 'ended', endedAt: new Date().toISOString(), endReason }
            : r
        )
      );

      setEndTargetRel(null);
      success('Vínculo encerrado', 'Acesso do aluno aos horários privados foi revogado.');
    } catch (err) {
      error('Erro ao encerrar vínculo', String(err));
    }
  };

  const getStudentName = (uid: string) => students.find((s) => s.uid === uid)?.name || uid;
  const getTeacherName = (uid: string) => teachers.find((t) => t.uid === uid)?.name || uid;

  const activeRels = relationships.filter((r) => r.status === 'active');
  const pastRels = relationships.filter((r) => r.status === 'ended');

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vínculos Acadêmicos (Aluno-Professor)</h1>
          <p className="text-xs text-slate-500 mt-1">
            Governança da coleção obrigatória <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">teacherStudentRelationships</code>.
            Alunos não podem alterar ou consultar catálogo geral por conta própria.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Criar Novo Vínculo
        </Button>
      </div>

      {/* Guidelines info */}
      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 text-xs flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-blue-900 space-y-1">
          <p className="font-semibold">Regra de Integridade Referencial e Concorrência:</p>
          <p className="text-blue-700 leading-relaxed">
            Cada aluno possui no máximo 1 professor mentor ativo simultâneo. Caso um aluno seja vinculado a um novo docente, o vínculo anterior é arquivado com registro do responsável e motivo da transferência.
          </p>
        </div>
      </div>

      {/* Active Bindings Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-emerald-600" /> Vínculos Ativos ({activeRels.length})
        </h2>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3">Aluno Designado</th>
                <th className="px-4 py-3">Professor Mentor</th>
                <th className="px-4 py-3">Data de Início</th>
                <th className="px-4 py-3">Atribuído Por</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {activeRels.length > 0 ? (
                activeRels.map((rel) => (
                  <tr key={rel.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-slate-900">{getStudentName(rel.studentId)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-slate-900">{getTeacherName(rel.teacherId)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {new Date(rel.assignedAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{rel.assignedBy}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant="emerald" dot>Ativo</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setEndTargetRel(rel);
                          setEndReason('Encerramento regular de ciclo');
                        }}
                        className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold transition-colors"
                      >
                        <Unlink2 className="w-3.5 h-3.5" /> Desvincular
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    {loading ? 'Carregando vínculos...' : 'Nenhum vínculo ativo registrado no momento.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Inactive Bindings */}
      {pastRels.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" /> Histórico Acadêmico de Vínculos Encerrados ({pastRels.length})
          </h2>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white opacity-85 text-xs">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Aluno</th>
                  <th className="px-4 py-2.5">Ex-Docente</th>
                  <th className="px-4 py-2.5">Encerrado Em</th>
                  <th className="px-4 py-2.5">Motivo do Encerramento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {pastRels.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 font-medium">{getStudentName(r.studentId)}</td>
                    <td className="px-4 py-2.5">{getTeacherName(r.teacherId)}</td>
                    <td className="px-4 py-2.5 text-slate-400">
                      {r.endedAt ? new Date(r.endedAt).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 italic">{r.endReason || 'Não informado'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Binding */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Vincular Aluno a Professor"
        description="Associe formalmente o aluno ao professor responsável pelo seu plano de estudos individual."
      >
        <form onSubmit={handleCreateBinding} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Selecione o Aluno</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione um aluno...</option>
              {students.map((s) => {
                const isBound = activeRels.some((r) => r.studentId === s.uid);
                return (
                  <option key={s.uid} value={s.uid}>
                    {s.name} ({s.email}) {isBound ? '— [Já possui vínculo ativo]' : '— [Disponível]'}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Selecione o Professor Mentor</label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione um docente...</option>
              {teachers.map((t) => (
                <option key={t.uid} value={t.uid}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo / Tipo de Alocação</label>
            <input
              type="text"
              value={bindingReason}
              onChange={(e) => setBindingReason(e.target.value)}
              placeholder="Ex: Alocação pedagógica semestral"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Efetivar Vínculo
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: End Binding Confirmation */}
      <Modal
        isOpen={Boolean(endTargetRel)}
        onClose={() => setEndTargetRel(null)}
        title="Confirmar Desvinculação Acadêmica"
        description="O aluno deixará de visualizar este professor na sua grade de agendamento."
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Tem certeza que deseja encerrar o vínculo entre{' '}
            <strong className="text-slate-900">{getStudentName(endTargetRel?.studentId || '')}</strong> e o professor{' '}
            <strong className="text-slate-900">{getTeacherName(endTargetRel?.teacherId || '')}</strong>?
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo do Encerramento</label>
            <input
              type="text"
              value={endReason}
              onChange={(e) => setEndReason(e.target.value)}
              placeholder="Ex: Conclusão de módulo ou solicitação pedagógica"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEndTargetRel(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleEndBinding}>
              Encerrar Vínculo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
