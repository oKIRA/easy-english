import React, { useState, useEffect } from 'react';
import {
  Video,
  UploadCloud,
  HardDrive,
  Clock,
  Trash2,
  Play,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { MediaAsset, StorageQuota } from '../../shared/types';
import { Button } from '../../shared/design-system/Button';
import { Card, CardHeader } from '../../shared/design-system/Card';
import { Badge } from '../../shared/design-system/Badge';
import { Modal } from '../../shared/design-system/Modal';
import { Input } from '../../shared/design-system/Input';
import { VideoPlayer } from '../../shared/design-system/VideoPlayer';
import { useToast } from '../../shared/design-system/Toast';

export const TeacherMediaView: React.FC = () => {
  const { currentUser } = useAuth();
  const teacherId = currentUser?.uid || '';

  const [mediaList, setMediaList] = useState<MediaAsset[]>([]);
  const [quota, setQuota] = useState<StorageQuota>({
    id: teacherId,
    scopeType: 'teacher',
    scopeId: teacherId,
    limitBytes: 2 * 1024 * 1024 * 1024, // 2 GB
    usedBytes: 0,
    reservedBytes: 0,
    updatedAt: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [simulatedSizeMb, setSimulatedSizeMb] = useState<number>(0);
  const [expirationDays, setExpirationDays] = useState<number>(60);
  const [videoUrl, setVideoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preview video modal
  const [previewMedia, setPreviewMedia] = useState<MediaAsset | null>(null);

  const { success, error } = useToast();

  const loadMedia = async () => {
    if (!teacherId) return;
    try {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, 'mediaAssets'), where('teacherId', '==', teacherId))
      );
      const list: MediaAsset[] = [];
      let totalUsed = 0;
      snap.forEach((d) => {
        const m = { id: d.id, ...d.data() } as MediaAsset;
        list.push(m);
        if (m.status === 'active') totalUsed += m.sizeBytes || 0;
      });

      setMediaList(list);
      setQuota((prev) => ({
        ...prev,
        usedBytes: totalUsed,
      }));
    } catch (e) {
      console.error('Failed to load teacher media:', e);
      error('Não foi possível carregar seus vídeos', String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [teacherId]);

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId) {
      error('Não foi possível identificar o professor autenticado.');
      return;
    }

    // 1. Validate max file size: 500 MB limit
    if (simulatedSizeMb <= 0 || simulatedSizeMb > 500) {
      error('Limite por arquivo excedido', 'O tamanho máximo por vídeo é de 500 MB para preservação de custos.');
      return;
    }

    const newBytes = simulatedSizeMb * 1024 * 1024;

    // 2. Validate teacher quota: 2 GB limit
    if (quota.usedBytes + newBytes > quota.limitBytes) {
      error('Cota de armazenamento excedida', 'Você atingiu o teto de 2.0 GB alocados ao seu perfil. Exclua gravações antigas para liberar espaço.');
      return;
    }

    try {
      setIsSubmitting(true);
      const mediaId = `media-${Date.now()}`;
      const expiresAt = new Date(Date.now() + expirationDays * 86400000).toISOString();

      const newMedia: MediaAsset = {
        id: mediaId,
        ownerId: teacherId,
        teacherId,
        title: videoTitle,
        description: videoDesc,
        storagePath: `media/${teacherId}/${videoTitle.toLowerCase().replace(/\s+/g, '_')}.mp4`,
        downloadUrl: videoUrl,
        mimeType: 'video/mp4',
        sizeBytes: newBytes,
        durationSeconds: 1800,
        status: 'active',
        visibility: 'all_my_students',
        expiresAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'mediaAssets', mediaId), {
        ...newMedia,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update quota in Firestore
      const updatedUsedBytes = quota.usedBytes + newBytes;
      await setDoc(doc(db, 'storageQuotas', teacherId), {
        ...quota,
        usedBytes: updatedUsedBytes,
        updatedAt: new Date().toISOString(),
      });

      // Audit Log
      await setDoc(doc(db, 'auditLogs', `log-${Date.now()}`), {
        actorId: teacherId,
        actorName: currentUser?.name || 'Professor',
        action: 'UPLOAD_MEDIA_VIDEO',
        entityType: 'mediaAssets',
        entityId: mediaId,
        metadata: {
          title: videoTitle,
          sizeMb: simulatedSizeMb,
          expiresInDays: expirationDays,
        },
        createdAt: new Date().toISOString(),
      });

      setMediaList((prev) => [newMedia, ...prev]);
      setQuota((prev) => ({ ...prev, usedBytes: updatedUsedBytes }));
      setIsUploadModalOpen(false);
      setVideoTitle('');
      setVideoDesc('');
      success('Vídeo enviado com sucesso!', 'Salvo no Cloud Storage com cota reservada e expiração agendada.');
    } catch (err) {
      error('Falha ao registrar vídeo', String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVideo = async (media: MediaAsset) => {
    try {
      await deleteDoc(doc(db, 'mediaAssets', media.id));

      // Liberar cota atomicamente
      const freedBytes = Math.max(0, quota.usedBytes - media.sizeBytes);
      await updateDoc(doc(db, 'storageQuotas', teacherId), {
        usedBytes: freedBytes,
        updatedAt: new Date().toISOString(),
      });

      // Audit Log
      await setDoc(doc(db, 'auditLogs', `log-${Date.now()}`), {
        actorId: teacherId,
        actorName: currentUser?.name || 'Professor',
        action: 'DELETE_MEDIA_VIDEO',
        entityType: 'mediaAssets',
        entityId: media.id,
        metadata: { freedBytes: media.sizeBytes },
        createdAt: new Date().toISOString(),
      });

      setMediaList((prev) => prev.filter((m) => m.id !== media.id));
      setQuota((prev) => ({ ...prev, usedBytes: freedBytes }));
      success('Vídeo excluído!', `${(media.sizeBytes / (1024 * 1024)).toFixed(0)} MB liberados na sua cota.`);
    } catch (err) {
      error('Erro ao excluir vídeo');
    }
  };

  const usedPercentage = Math.min(100, Math.round((quota.usedBytes / quota.limitBytes) * 100));

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vídeos Gravados & Cota de Armazenamento</h1>
          <p className="text-xs text-slate-500 mt-1">
            Controle de custos do Cloud Storage. Cada professor dispõe de até 2 GB com expiração programada.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsUploadModalOpen(true)}
          leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
        >
          Subir Nova Gravação
        </Button>
      </div>

      {/* Quota Progress Card */}
      <Card>
        <CardHeader
          title="Minha Cota Docente (Teto: 2.000 MB)"
          subtitle="Consumo de armazenamento em nuvem no Cloud Storage"
          icon={<HardDrive className="w-5 h-5 text-blue-600" />}
          action={
            <Badge variant={usedPercentage > 80 ? 'rose' : usedPercentage > 50 ? 'amber' : 'emerald'}>
              {usedPercentage}% Usado ({(quota.usedBytes / (1024 * 1024)).toFixed(0)} MB)
            </Badge>
          }
        />
        <div className="space-y-3">
          <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                usedPercentage > 80
                  ? 'bg-rose-500'
                  : usedPercentage > 50
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(5, usedPercentage)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Usado: {(quota.usedBytes / (1024 * 1024)).toFixed(0)} MB</span>
            <span>Disponível: {((quota.limitBytes - quota.usedBytes) / (1024 * 1024)).toFixed(0)} MB</span>
            <span>Teto Máximo: 2.048 MB</span>
          </div>
        </div>
      </Card>

      {/* Media Videos Library */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {mediaList.length > 0 ? (
          mediaList.map((m) => {
            const sizeMb = (m.sizeBytes / (1024 * 1024)).toFixed(0);
            return (
              <Card key={m.id} className="flex flex-col justify-between hoverable">
                <div>
                  {/* Thumbnail / Play Button */}
                  <div
                    onClick={() => setPreviewMedia(m)}
                    className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden cursor-pointer group flex items-center justify-center mb-3 shadow-xs"
                  >
                    <div className="absolute inset-0 bg-blue-900/20 group-hover:bg-blue-900/40 transition-colors" />
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 ml-0.5" />
                    </div>
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white rounded text-[10px] font-mono">
                      {sizeMb} MB
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{m.title}</h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {m.description || 'Gravação da aula prática com foco em conversação e vocabulário.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-4">
                  <div className="flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Expira em:{' '}
                      {m.expiresAt
                        ? new Date(m.expiresAt).toLocaleDateString('pt-BR')
                        : '60 dias'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteVideo(m)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Excluir vídeo e liberar cota"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            {loading ? 'Carregando acervo...' : 'Nenhuma videoaula gravada ainda.'}
          </div>
        )}
      </div>

      {/* Modal: Upload Video */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Enviar Videoaula para o Cloud Storage"
        description="Vídeos são verificados contra o teto de 500 MB por arquivo e 2 GB totais."
      >
        <form onSubmit={handleUploadVideo} className="space-y-4 text-xs">
          <Input
            label="Título da Gravação"
            placeholder="Ex: Pitching Masterclass & Pronunciation Drill"
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tamanho do Arquivo (MB) — Teto Máximo: 500 MB
            </label>
            <input
              type="number"
              min={10}
              max={600}
              value={simulatedSizeMb}
              onChange={(e) => setSimulatedSizeMb(Number(e.target.value))}
              className={`w-full rounded-lg border p-2 text-xs font-mono ${
                simulatedSizeMb > 500
                  ? 'border-rose-400 bg-rose-50 text-rose-800'
                  : 'border-slate-300 text-slate-900'
              }`}
              required
            />
            {simulatedSizeMb > 500 && (
              <p className="text-[11px] font-semibold text-rose-600 mt-1">
                Aviso: Arquivos com mais de 500 MB são bloqueados para evitar estouro de custos.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Política de Expiração Automática (Auto-Purge)
            </label>
            <select
              value={expirationDays}
              onChange={(e) => setExpirationDays(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900"
            >
              <option value={30}>30 dias (Recomendado para aulas individuais)</option>
              <option value={60}>60 dias (Aulas regulares de módulo)</option>
              <option value={90}>90 dias (Gravações de masterclass especiais)</option>
            </select>
          </div>

          <div>
            <Input
              label="URL da Mídia (YouTube, Vimeo ou MP4 direto)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://..."
              helperText="Suporta links diretos .mp4/.webm e vídeos do YouTube."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notas da Sessão Gravada</label>
            <textarea
              rows={3}
              value={videoDesc}
              onChange={(e) => setVideoDesc(e.target.value)}
              placeholder="Pontos gramaticais abordados e minutagem dos tópicos..."
              className="w-full rounded-lg border border-slate-300 p-2 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsUploadModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Salvar Vídeo & Reservar Cota
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Video Player Preview */}
      <Modal
        isOpen={Boolean(previewMedia)}
        onClose={() => setPreviewMedia(null)}
        title={previewMedia?.title || 'Player de Videoaula'}
        maxWidth="3xl"
      >
        {previewMedia && (
          <div className="space-y-4">
            {previewMedia.downloadUrl
              ? <VideoPlayer src={previewMedia.downloadUrl} title={previewMedia.title} />
              : <p className="text-sm text-slate-500">Este item não possui uma URL de reprodução cadastrada.</p>}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              <p className="font-semibold text-slate-900 mb-1">Descrição do Professor:</p>
              <p>{previewMedia.description || 'Sem descrição.'}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
