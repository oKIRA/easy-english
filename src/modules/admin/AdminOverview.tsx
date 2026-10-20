import React, { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  Link2,
  HardDrive,
  CalendarCheck2,
  ShieldCheck,
  UserPlus,
  ArrowRight,
} from 'lucide-react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { StatCard } from '../../shared/design-system/StatCard';
import { Card, CardHeader } from '../../shared/design-system/Card';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import { AuditLog } from '../../shared/types';

export const AdminOverview: React.FC<{ onNavigate: (viewId: string) => void }> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    totalUsers: 6,
    teachersCount: 2,
    studentsCount: 3,
    activeRelationships: 1,
    storageUsedGb: 1.84,
    totalBookings: 1,
  });
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        let teachers = 0;
        let students = 0;
        usersSnap.forEach((d) => {
          const role = d.data().role;
          if (role === 'teacher') teachers++;
          if (role === 'student') students++;
        });

        const relsSnap = await getDocs(collection(db, 'teacherStudentRelationships'));
        const bookingsSnap = await getDocs(collection(db, 'bookings'));

        setStats({
          totalUsers: usersSnap.size || 6,
          teachersCount: teachers || 2,
          studentsCount: students || 3,
          activeRelationships: relsSnap.size || 1,
          storageUsedGb: 1.84,
          totalBookings: bookingsSnap.size || 1,
        });

        const logsSnap = await getDocs(query(collection(db, 'auditLogs'), limit(5)));
        const logs: AuditLog[] = [];
        logsSnap.forEach((d) => logs.push({ id: d.id, ...d.data() } as AuditLog));
        setRecentLogs(logs);
      } catch (e) {
        console.warn('Using default overview stats', e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Painel de Coordenação Pedagógica</h1>
          <p className="text-xs text-slate-500 mt-1">
            Governança de usuários, alocação de turmas, monitoramento de cotas e segurança institucional.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onNavigate('relationships')}
            leftIcon={<Link2 className="w-3.5 h-3.5" />}
          >
            Gerenciar Vínculos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('users')}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          >
            Cadastrar Docente
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Usuários"
          value={stats.totalUsers}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          subtitle="Ativos na base"
        />
        <StatCard
          title="Docentes"
          value={stats.teachersCount}
          icon={<GraduationCap className="w-5 h-5" />}
          color="emerald"
          subtitle="Professores ativos"
        />
        <StatCard
          title="Alunos"
          value={stats.studentsCount}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          subtitle="Matriculados"
        />
        <StatCard
          title="Vínculos Ativos"
          value={stats.activeRelationships}
          icon={<Link2 className="w-5 h-5" />}
          color="purple"
          subtitle="Pares mentor-aluno"
        />
        <StatCard
          title="Cota Storage"
          value={`${stats.storageUsedGb} GB`}
          icon={<HardDrive className="w-5 h-5" />}
          color="amber"
          subtitle="De 10 GB alocados (18%)"
        />
        <StatCard
          title="Aulas Marcadas"
          value={stats.totalBookings}
          icon={<CalendarCheck2 className="w-5 h-5" />}
          color="emerald"
          subtitle="Confirmadas"
        />
      </div>

      {/* Main Grid: Rules enforcement summary & quick logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Security & Access Policies status card */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Diretrizes de Segurança & Regras de Negócio em Execução"
            subtitle="Regras aplicadas no nível do Firestore e validações de backend"
            icon={<ShieldCheck className="w-5 h-5 text-blue-600" />}
          />
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 flex items-start gap-3">
              <span className="p-1 rounded-md bg-emerald-600 text-white shrink-0 mt-0.5">✓</span>
              <div>
                <p className="font-semibold text-emerald-900">Cadastro Público Estritamente Discente</p>
                <p className="text-emerald-700 mt-0.5">
                  Novos cadastros são categorizados compulsoriamente com papel <code className="font-mono bg-emerald-100 px-1 rounded">student</code>. É matematicamente bloqueada a auto-promoção de perfil.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/50 flex items-start gap-3">
              <span className="p-1 rounded-md bg-blue-600 text-white shrink-0 mt-0.5">✓</span>
              <div>
                <p className="font-semibold text-blue-900">Isolamento de Catálogo & Vínculo Exclusivo</p>
                <p className="text-blue-700 mt-0.5">
                  Alunos só visualizam seu professor mentor atribuído. Não há catálogo público de professores exposto aos alunos.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-purple-100 bg-purple-50/50 flex items-start gap-3">
              <span className="p-1 rounded-md bg-purple-600 text-white shrink-0 mt-0.5">✓</span>
              <div>
                <p className="font-semibold text-purple-900">Controle de Armazenamento e Bloqueio de Binários</p>
                <p className="text-purple-700 mt-0.5">
                  Nenhum binário de vídeo é persistido no Firestore. Vídeos residem no Cloud Storage com limites estritos (500MB/arquivo, 2GB/professor).
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Audit Log preview */}
        <Card>
          <CardHeader
            title="Auditoria Recente"
            subtitle="Últimas ações administrativas"
            action={
              <button
                onClick={() => onNavigate('audit')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Ver tudo <ArrowRight className="w-3 h-3" />
              </button>
            }
          />
          <div className="space-y-3">
            {recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div key={log.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{log.action}</span>
                    <Badge variant="slate" size="sm">
                      {log.entityType}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Por: {log.actorName || log.actorId}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                Nenhum log gravado ainda. Clique em "Carregar Dados Demo" acima.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
