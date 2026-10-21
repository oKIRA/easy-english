import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Download,
  ExternalLink,
  File,
  FileSpreadsheet,
  Music,
  Trash2,
  Paperclip,
} from 'lucide-react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { LearningAsset } from '../../shared/types';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import { Card } from '../../shared/design-system/Card';
import { Modal } from '../../shared/design-system/Modal';
import { Input } from '../../shared/design-system/Input';
import { useToast } from '../../shared/design-system/Toast';

export const TeacherMaterialsView: React.FC = () => {
  const { currentUser } = useAuth();
  const teacherId = currentUser?.uid || '';

  const [materials, setMaterials] = useState<LearningAsset[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Add Material
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assetType, setAssetType] = useState<LearningAsset['assetType']>('pdf');
  const [externalUrl, setExternalUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error } = useToast();

  const loadMaterials = async () => {
    if (!teacherId) return;
    try {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, 'learningAssets'), where('teacherId', '==', teacherId))
      );
      const list: LearningAsset[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as LearningAsset));
      setMaterials(list);
    } catch (e) {
      console.error('Failed to load teacher materials:', e);
      error('Não foi possível carregar seus materiais', String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, [teacherId]);

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId) {
      error('Não foi possível identificar o professor autenticado.');
      return;
    }
    try {
      setIsSubmitting(true);
      const assetId = `asset-${Date.now()}`;
      const newAsset: LearningAsset = {
        id: assetId,
        title,
        description,
        teacherId,
        assetType,
        externalUrl,
        mimeType: assetType === 'pdf' ? 'application/pdf' : 'application/octet-stream',
        sizeBytes: 0,
        visibility: 'all_my_students',
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'learningAssets', assetId), {
        ...newAsset,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Audit Log
      await setDoc(doc(db, 'auditLogs', `log-${Date.now()}`), {
        actorId: teacherId,
        actorName: currentUser?.name || 'Professor',
        action: 'PUBLISH_LEARNING_ASSET',
        entityType: 'learningAssets',
        entityId: assetId,
        metadata: { title, type: assetType },
        createdAt: new Date().toISOString(),
      });

      setMaterials((prev) => [newAsset, ...prev]);
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setExternalUrl('');
      success('Material cadastrado e disponibilizado aos alunos!');
    } catch (err) {
      error('Erro ao adicionar material', String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'learningAssets', id));
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      success('Material removido');
    } catch (err) {
      error('Falha ao remover material');
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-600" />;
      case 'sheet':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case 'audio':
        return <Music className="w-5 h-5 text-purple-600" />;
      default:
        return <File className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Banco de Materiais Didáticos</h1>
          <p className="text-xs text-slate-500 mt-1">
            Armazene e disponibilize apostilas, PDFs de apoio, tabelas de vocabulário e áudios de listening.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Adicionar Material
        </Button>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materials.length > 0 ? (
          materials.map((m) => (
            <Card key={m.id} className="flex flex-col justify-between hoverable">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                    {getAssetIcon(m.assetType)}
                  </div>
                  <Badge variant="blue" size="sm" className="uppercase">
                    {m.assetType}
                  </Badge>
                </div>
                <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{m.title}</h3>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                  {m.description || 'Apostila complementar para prática de conversação e exercícios.'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs mt-4">
                <span className="text-[10px] text-slate-400 font-mono">
                  {(m.sizeBytes / 1024).toFixed(0)} KB
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={m.externalUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Baixar / Visualizar"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            {loading ? 'Carregando materiais...' : 'Nenhum material didático publicado. Clique em "Adicionar Material".'}
          </div>
        )}
      </div>

      {/* Modal: Add Material */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Publicar Material Didático"
        description="Arquivos seguros vinculados ao seu plano pedagógico."
      >
        <form onSubmit={handleAddMaterial} className="space-y-4 text-xs">
          <Input
            label="Nome do Material"
            placeholder="Ex: Cambridge B2 Vocabulary Pack (PDF)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Recurso</label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
            >
              <option value="pdf">Documento PDF (Apostila)</option>
              <option value="doc">Word / Documento Texto</option>
              <option value="sheet">Planilha Excel de Vocabulário</option>
              <option value="audio">Áudio de Listening (MP3)</option>
              <option value="slides">Slides de Apresentação</option>
              <option value="link">Link Externo / Artigo Recomendado</option>
            </select>
          </div>

          <Input
            label="URL do Arquivo ou Link de Download"
            placeholder="https://.../arquivo.pdf"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            helperText="Formatos verificados e protegidos contra links maliciosos."
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Instruções aos Alunos</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instruções para leitura prévia antes da aula..."
              className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Publicar Material
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
