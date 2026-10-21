import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Shield,
  GraduationCap,
  CheckCircle,
  XCircle,
  MoreVertical,
} from 'lucide-react';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { User, UserRole, UserStatus } from '../../shared/types';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import { Input } from '../../shared/design-system/Input';
import { Modal } from '../../shared/design-system/Modal';
import { useToast } from '../../shared/design-system/Toast';

interface UserInvitation {
  name: string;
  email: string;
  role: UserRole;
  specialties?: string[];
  createdAt: string;
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [loading, setLoading] = useState(true);

  const [isCreateInvitationOpen, setIsCreateInvitationOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'teacher' | 'student'>('teacher');
  const [specialties, setSpecialties] = useState('Business English, Conversação');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error } = useToast();
  const { currentUser } = useAuth();

  const loadUsers = async () => {
    try {
      setLoading(true);
      const [snap, invitationSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'userInvitations')),
      ]);
      const list: User[] = [];
      snap.forEach((d) => list.push({ uid: d.id, ...d.data() } as User));
      const invitationList: UserInvitation[] = [];
      invitationSnap.forEach((d) => invitationList.push(d.data() as UserInvitation));
      setUsers(list);
      setInvitations(invitationList);
    } catch (err) {
      setUsers([]);
      setInvitations([]);
      error('Não foi possível carregar os usuários', String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: serverTimestamp(),
      });

      // If promoted to teacher, create teacher profile if not present
      if (newRole === 'teacher') {
        await setDoc(
          doc(db, 'teacherProfiles', userId),
          {
            teacherId: userId,
            bio: 'Docente de língua inglesa certificado.',
            specialties: ['General English', 'Grammar'],
            languages: ['Inglês', 'Português'],
            timezone: 'America/Sao_Paulo',
            bookingSettings: {
              slotDurationMinutes: 45,
              advanceNoticeHours: 12,
              cancellationNoticeHours: 24,
              maxAdvanceDays: 30,
            },
            isAcceptingStudents: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      setUsers((prev) =>
        prev.map((u) => (u.uid === userId ? { ...u, role: newRole } : u))
      );
      success('Papel atualizado com sucesso!', `Usuário agora possui papel ${newRole}.`);
    } catch (err) {
      error('Falha ao atualizar papel', String(err));
    }
  };

  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      setUsers((prev) =>
        prev.map((u) => (u.uid === userId ? { ...u, status: newStatus } : u))
      );
      success('Status atualizado com sucesso!', `Conta agora está ${newStatus}.`);
    } catch (err) {
      error('Falha ao alterar status', String(err));
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) {
      error('Preencha nome e e-mail');
      return;
    }

    try {
      setIsSubmitting(true);
      const normalizedEmail = inviteEmail.trim().toLowerCase();
      if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
        error('Este e-mail já possui uma conta na plataforma.');
        return;
      }
      if (invitations.some((invitation) => invitation.email === normalizedEmail)) {
        error('Já existe um convite pendente para este e-mail.');
        return;
      }

      const invitation: UserInvitation = {
        name: inviteName,
        email: normalizedEmail,
        role: inviteRole,
        specialties: inviteRole === 'teacher'
          ? specialties.split(',').map((specialty) => specialty.trim()).filter(Boolean)
          : [],
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'userInvitations', normalizedEmail), {
        ...invitation,
        createdBy: currentUser?.uid,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'auditLogs', `log-${Date.now()}`), {
        actorId: currentUser?.uid,
        actorName: currentUser?.name || 'Administrador',
        action: inviteRole === 'teacher' ? 'INVITE_TEACHER' : 'INVITE_STUDENT',
        entityType: 'userInvitations',
        entityId: normalizedEmail,
        metadata: { name: inviteName, email: normalizedEmail, role: inviteRole },
        createdAt: new Date().toISOString(),
      });

      setInvitations((previous) => [invitation, ...previous]);
      setIsCreateInvitationOpen(false);
      setInviteName('');
      setInviteEmail('');
      success(
        'Convite criado',
        `Peça para ${normalizedEmail} entrar com a própria conta Google para ativar o perfil de ${inviteRole === 'teacher' ? 'professor' : 'aluno'}.`
      );
    } catch (err) {
      error('Erro ao cadastrar professor', String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelInvitation = async (email: string) => {
    try {
      await deleteDoc(doc(db, 'userInvitations', email));
      setInvitations((previous) => previous.filter((invitation) => invitation.email !== email));
      success('Convite cancelado.');
    } catch (err) {
      error('Não foi possível cancelar o convite', String(err));
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gestão de Usuários & Professores</h1>
          <p className="text-xs text-slate-500 mt-1">
            Administre papéis, status de contas e crie novos perfis docentes com privilégios verificados.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsCreateInvitationOpen(true)}
          leftIcon={<UserPlus className="w-3.5 h-3.5" />}
        >
          Convidar Usuário
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">Filtrar por Papel:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os Papéis</option>
            <option value="admin">Administrador</option>
            <option value="teacher">Professor</option>
            <option value="student">Aluno</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 font-semibold text-slate-700">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Papel Atual</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Alterar Papel</th>
              <th className="px-4 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-200">
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">{user.email}</td>
                  <td className="px-4 py-3.5">
                    {user.role === 'admin' && <Badge variant="rose">Admin</Badge>}
                    {user.role === 'teacher' && <Badge variant="emerald">Professor</Badge>}
                    {user.role === 'student' && <Badge variant="blue">Aluno</Badge>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                        user.status === 'active' ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          user.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                      {user.status === 'active' ? 'Ativo' : 'Inativo / Suspenso'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="student">Aluno</option>
                      <option value="teacher">Professor</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {user.status === 'active' ? (
                      <button
                        onClick={() => handleStatusChange(user.uid, 'suspended')}
                        className="text-slate-400 hover:text-rose-600 text-xs transition-colors"
                        title="Suspender acesso"
                      >
                        Suspender
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(user.uid, 'active')}
                        className="text-emerald-600 hover:text-emerald-700 font-semibold text-xs transition-colors"
                      >
                        Ativar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                  {loading ? 'Carregando usuários...' : 'Nenhum usuário localizado.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">Convites pendentes</h2>
          <p className="mt-1 text-xs text-slate-500">
            O acesso será ativado quando a pessoa entrar com a própria conta Google.
          </p>
        </div>
        {invitations.length ? (
          <ul className="divide-y divide-slate-100">
            {invitations.map((invitation) => (
              <li key={invitation.email} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-slate-900">{invitation.name}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{invitation.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={invitation.role === 'teacher' ? 'emerald' : 'blue'}>
                    {invitation.role === 'teacher' ? 'Professor' : 'Aluno'}
                  </Badge>
                  <Badge variant="amber">Aguardando primeiro acesso</Badge>
                  <button
                    type="button"
                    onClick={() => handleCancelInvitation(invitation.email)}
                    className="text-xs font-medium text-slate-500 transition-colors hover:text-rose-600"
                  >
                    Cancelar convite
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-5 text-xs text-slate-400">
            {loading ? 'Carregando convites...' : 'Nenhum convite pendente.'}
          </p>
        )}
      </section>

      {/* Modal: Create invitation */}
      <Modal
        isOpen={isCreateInvitationOpen}
        onClose={() => setIsCreateInvitationOpen(false)}
        title="Convidar usuário"
        description="O convidado deve entrar com uma conta Google que use o mesmo e-mail informado."
      >
        <form onSubmit={handleCreateTeacher} className="space-y-4">
          <Input
            label="Nome completo"
            placeholder="Ex.: Elena Rostova"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            required
          />
          <Input
            label="E-mail da conta Google"
            type="email"
            placeholder="Ex.: elena@escola.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Perfil de acesso</label>
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as 'teacher' | 'student')}
              className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
            >
              <option value="teacher">Professor</option>
              <option value="student">Aluno</option>
            </select>
          </div>
          {inviteRole === 'teacher' && (
            <Input
              label="Especialidades pedagógicas (separadas por vírgula)"
              placeholder="Ex.: TOEFL, Conversação, Business English"
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
            />
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsCreateInvitationOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Criar convite
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
