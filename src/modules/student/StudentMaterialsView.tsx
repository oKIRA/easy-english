import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  Music,
  ExternalLink,
  File,
  Search,
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { LearningAsset } from '../../shared/types';
import { Card } from '../../shared/design-system/Card';
import { Badge } from '../../shared/design-system/Badge';
import { Input } from '../../shared/design-system/Input';

export const StudentMaterialsView: React.FC = () => {
  const { currentUser } = useAuth();
  const studentId = currentUser?.uid || 'demo-student-01';

  const [materials, setMaterials] = useState<LearningAsset[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMaterials() {
      try {
        setLoading(true);
        // Find assigned teacher
        const relSnap = await getDocs(
          query(
            collection(db, 'teacherStudentRelationships'),
            where('studentId', '==', studentId),
            where('status', '==', 'active')
          )
        );

        let teacherId = 'demo-teacher-01';
        relSnap.forEach((d) => (teacherId = d.data().teacherId));

        const snap = await getDocs(
          query(
            collection(db, 'learningAssets'),
            where('teacherId', '==', teacherId),
            where('status', '==', 'published')
          )
        );
        const list: LearningAsset[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as LearningAsset));
        setMaterials(list);
      } catch (e) {
        console.warn('Student materials fallback', e);
      } finally {
        setLoading(false);
      }
    }
    loadMaterials();
  }, [studentId]);

  const filteredMaterials = materials.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(search.toLowerCase()))
  );

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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Materiais Didáticos de Apoio</h1>
          <p className="text-xs text-slate-500 mt-1">
            Arquivos, guias práticos e materiais de leitura disponibilizados pelo seu professor mentor.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            placeholder="Buscar material didático..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMaterials.length > 0 ? (
          filteredMaterials.map((m) => (
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
                  {m.description || 'Apostila recomendada para fixação de vocabulário e exercícios práticos.'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs mt-4">
                <span className="text-[10px] text-slate-400 font-mono">
                  {(m.sizeBytes / 1024).toFixed(0)} KB
                </span>
                <a
                  href={m.externalUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar Arquivo
                </a>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            {loading ? 'Carregando materiais...' : 'Nenhum material encontrado.'}
          </div>
        )}
      </div>
    </div>
  );
};
