import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  RefreshCw,
  FileVideo,
  Clock,
} from 'lucide-react';
import { collection, getDocs, doc, setDoc, query, writeBatch } from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { StorageQuota, MediaAsset, User } from '../../shared/types';
import { Button } from '../../shared/design-system/Button';
import { Card, CardHeader } from '../../shared/design-system/Card';
import { Badge } from '../../shared/design-system/Badge';
import { useToast } from '../../shared/design-system/Toast';

const GLOBAL_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;
const TEACHER_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;

export const StorageQuotaView: React.FC = () => {
  const [globalQuota, setGlobalQuota] = useState<StorageQuota>({
    id: 'global',
    scopeType: 'global',
    scopeId: 'global',
    limitBytes: GLOBAL_LIMIT_BYTES,
    usedBytes: 0,
    reservedBytes: 0,
    updatedAt: new Date().toISOString(),
  });

  const [teacherQuotas, setTeacherQuotas] = useState<StorageQuota[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [mediaList, setMediaList] = useState<MediaAsset[]>([]);
  const [isReconciling, setIsReconciling] = useState(false);
  const [loading, setLoading] = useState(true);

  const { success, error } = useToast();

  const loadQuotaData = async () => {
    try {
      const [quotaSnapshot, usersSnap, mediaSnap] = await Promise.all([
        getDocs(collection(db, 'storageQuotas')),
        getDocs(query(collection(db, 'users'))),
        getDocs(collection(db, 'mediaAssets')),
      ]);
      const quotas = quotaSnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as StorageQuota));
      const global = quotas.find((quota) => quota.scopeId === 'global');
      setGlobalQuota(global || {
        id: 'global',
        scopeType: 'global',
        scopeId: 'global',
        limitBytes: GLOBAL_LIMIT_BYTES,
        usedBytes: 0,
        reservedBytes: 0,
        updatedAt: new Date().toISOString(),
      });
      setTeacherQuotas(quotas.filter((quota) => quota.scopeId !== 'global'));
      setTeachers(usersSnap.docs
        .map((d) => ({ uid: d.id, ...d.data() } as User))
        .filter((user) => user.role === 'teacher'));
      setMediaList(mediaSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MediaAsset)));
    } catch (e) {
      console.error('Failed to load storage quota data:', e);
      error('Não foi possível carregar as cotas de armazenamento', String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotaData();
  }, []);

  const handleReconcile = async () => {
    try {
      setIsReconciling(true);
      const mediaSnap = await getDocs(collection(db, 'mediaAssets'));
      let totalUsed = 0;
      const teacherMap: Record<string, number> = {};

      mediaSnap.forEach((d) => {
        const m = d.data() as MediaAsset;
        if (m.status === 'active') {
          totalUsed += m.sizeBytes || 0;
          teacherMap[m.teacherId] = (teacherMap[m.teacherId] || 0) + (m.sizeBytes || 0);
        }
      });

      const existingGlobal = globalQuota;
      const updatedGlobal: StorageQuota = {
        ...existingGlobal,
        id: 'global',
        scopeType: 'global',
        scopeId: 'global',
        limitBytes: existingGlobal.limitBytes || GLOBAL_LIMIT_BYTES,
        usedBytes: totalUsed,
        reservedBytes: existingGlobal.reservedBytes || 0,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'storageQuotas', 'global'), updatedGlobal);
      setGlobalQuota(updatedGlobal);

      const updatedTeacherQuotas = teachers.map((teacher) => {
        const existingQuota = teacherQuotas.find((quota) => quota.scopeId === teacher.uid);
        const quota: StorageQuota = {
          id: teacher.uid,
          scopeType: 'teacher',
          scopeId: teacher.uid,
          limitBytes: existingQuota?.limitBytes || TEACHER_LIMIT_BYTES,
          usedBytes: teacherMap[teacher.uid] || 0,
          reservedBytes: existingQuota?.reservedBytes || 0,
          updatedAt: new Date().toISOString(),
        };
        return quota;
      });
      for (let offset = 0; offset < updatedTeacherQuotas.length; offset += 450) {
        const batch = writeBatch(db);
        updatedTeacherQuotas.slice(offset, offset + 450).forEach((quota) => {
          batch.set(doc(db, 'storageQuotas', quota.scopeId), quota);
        });
        await batch.commit();
      }
      setTeacherQuotas(updatedTeacherQuotas);
      setMediaList(mediaSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MediaAsset)));

      // Audit log
      await setDoc(doc(db, 'auditLogs', `log-${Date.now()}`), {
        actorId: 'admin',
        actorName: 'Coordenação Pedagógica',
        action: 'RECONCILE_STORAGE_QUOTA',
        entityType: 'storageQuotas',
        entityId: 'global',
        metadata: { reconciledBytes: totalUsed },
        createdAt: new Date().toISOString(),
      });

      success('Reconciliação Concluída', 'Cotas calculadas com base nos arquivos físicos ativos no Cloud Storage.');
    } catch (e) {
      console.error('Failed to reconcile storage quotas:', e);
      error('Falha ao reconciliar cotas de armazenamento', String(e));
    } finally {
      setIsReconciling(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const globalLimitBytes = globalQuota.limitBytes || GLOBAL_LIMIT_BYTES;
  const globalUsedPercent = Math.min(100, Math.round((globalQuota.usedBytes / globalLimitBytes) * 100));
  const usageByTeacher = mediaList.reduce<Record<string, number>>((usage, media) => {
    if (media.status === 'active') usage[media.teacherId] = (usage[media.teacherId] || 0) + (media.sizeBytes || 0);
    return usage;
  }, {});

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Armazenamento & Controle de Custos de Vídeo</h1>
          <p className="text-xs text-slate-500 mt-1">
            Governança da cota do Cloud Storage. Vídeos binários são isolados do Firestore com expiração automática.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReconcile}
          isLoading={isReconciling}
          leftIcon={<RefreshCw className="w-3.5 h-3.5 text-blue-600" />}
        >
          Reconciliar Cotas
        </Button>
      </div>

      {/* Global Progress Bar */}
      <Card>
        <CardHeader
          title="Cota Global da Plataforma (10 GB)"
          subtitle="Capacidade total configurada para a instituição no Cloud Storage"
          icon={<HardDrive className="w-5 h-5 text-blue-600" />}
          action={
            <Badge variant={globalUsedPercent > 80 ? 'rose' : globalUsedPercent > 50 ? 'amber' : 'emerald'}>
              {globalUsedPercent}% Utilizado
            </Badge>
          }
        />
        <div className="space-y-3">
          <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                globalUsedPercent > 80
                  ? 'bg-rose-500'
                  : globalUsedPercent > 50
                  ? 'bg-amber-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${globalUsedPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Utilizado: {formatBytes(globalQuota.usedBytes)}</span>
            <span>Reservado: {formatBytes(globalQuota.reservedBytes)}</span>
            <span>Limite Máximo: {formatBytes(globalLimitBytes)}</span>
          </div>
        </div>
      </Card>

      {/* Limit rules grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
            <FileVideo className="w-4 h-4 text-blue-600" /> Limite Máximo por Vídeo
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">500 MB</p>
          <p className="text-slate-500 mt-1">Uploads que excederem este valor são rejeitados antes do streaming.</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
            <HardDrive className="w-4 h-4 text-emerald-600" /> Cota Individual por Professor
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{formatBytes(TEACHER_LIMIT_BYTES)}</p>
          <p className="text-slate-500 mt-1">Cada docente possui sua própria fatia isolada de capacidade.</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
            <Clock className="w-4 h-4 text-amber-600" /> Política de Auto-Expiração
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">30 / 60 / 90 dias</p>
          <p className="text-slate-500 mt-1">Vídeos antigos são expurgados do bucket para prevenir custos ociosos.</p>
        </div>
      </div>

      {/* Quotas Per Teacher Table */}
      <Card>
        <CardHeader
          title="Consumo por Professor Docente"
          subtitle="Consumo calculado com arquivos ativos; teto de 2 GB por docente"
        />
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3">Professor</th>
                <th className="px-4 py-3">Espaço Consumido</th>
                <th className="px-4 py-3">Limite Permitido</th>
                <th className="px-4 py-3">Utilização %</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {teachers.length ? teachers.map((teacher) => {
                const quota = teacherQuotas.find((item) => item.scopeId === teacher.uid);
                const usedBytes = usageByTeacher[teacher.uid] ?? 0;
                const limitBytes = quota?.limitBytes || TEACHER_LIMIT_BYTES;
                const usedPercent = Math.min(100, Math.round((usedBytes / limitBytes) * 100));
                return (
                  <tr key={teacher.uid}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{teacher.name || teacher.email}</td>
                    <td className="px-4 py-3">{formatBytes(usedBytes)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatBytes(limitBytes)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={usedPercent >= 80 ? 'bg-rose-500 h-full' : 'bg-emerald-500 h-full'}
                            style={{ width: `${usedPercent}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-500">{usedPercent}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={usedPercent >= 100 ? 'rose' : usedPercent >= 80 ? 'amber' : 'emerald'}>
                        {usedPercent >= 100 ? 'Limite atingido' : usedPercent >= 80 ? 'Atenção' : 'Regular'}
                      </Badge>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    {loading ? 'Carregando professores...' : 'Nenhum professor cadastrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
