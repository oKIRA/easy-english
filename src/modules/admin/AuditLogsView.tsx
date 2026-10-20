import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  Lock,
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { AuditLog } from '../../shared/types';
import { Badge } from '../../shared/design-system/Badge';
import { Input } from '../../shared/design-system/Input';
import { Modal } from '../../shared/design-system/Modal';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true);
        const q = query(collection(db, 'auditLogs'), limit(50));
        const snap = await getDocs(q);
        const list: AuditLog[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as AuditLog));
        setLogs(list);
      } catch (e) {
        console.warn('Error loading audit logs', e);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.actorName && l.actorName.toLowerCase().includes(search.toLowerCase())) ||
      l.entityType.toLowerCase().includes(search.toLowerCase())
  );

  const getActionBadge = (action: string) => {
    if (action.includes('ASSIGN')) return <Badge variant="purple">Vínculo</Badge>;
    if (action.includes('UNASSIGN')) return <Badge variant="rose">Desvinculação</Badge>;
    if (action.includes('CREATE')) return <Badge variant="emerald">Criação</Badge>;
    if (action.includes('RECONCILE')) return <Badge variant="blue">Reconciliação</Badge>;
    return <Badge variant="slate">{action}</Badge>;
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Logs de Auditoria & Conformidade</h1>
          <p className="text-xs text-slate-500 mt-1">
            Trilha de auditoria imutável de operações críticas: vínculos, papéis, notas e manuseio de mídias.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Registros Imutáveis</span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs max-w-md">
        <Input
          placeholder="Buscar por ação, autor ou entidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
        />
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 font-semibold text-slate-700">
            <tr>
              <th className="px-4 py-3">Timestamp (UTC)</th>
              <th className="px-4 py-3">Ação Executada</th>
              <th className="px-4 py-3">Agente Responsável</th>
              <th className="px-4 py-3">Entidade Afetada</th>
              <th className="px-4 py-3 text-right">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">
                    {new Date(log.createdAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      {getActionBadge(log.action)}
                      <span className="font-semibold text-slate-900">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {log.actorName || log.actorId}
                  </td>
                  <td className="px-4 py-3.5">
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-700">
                      {log.entityType}/{log.entityId}
                    </code>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver Metadados
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {loading ? 'Carregando auditoria...' : 'Nenhum registro de auditoria encontrado.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Metadata Detail Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Detalhes do Registro de Auditoria"
        description={`Evento ${selectedLog?.action} registrado no sistema.`}
      >
        {selectedLog && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono">
              <div>
                <span className="text-slate-400 text-[10px] block">LOG ID:</span>
                <span className="text-slate-800">{selectedLog.id}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">DATA / HORA:</span>
                <span className="text-slate-800">{new Date(selectedLog.createdAt).toISOString()}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">AGENTE:</span>
                <span className="text-slate-800">{selectedLog.actorName || selectedLog.actorId}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">TARGET USER:</span>
                <span className="text-slate-800">{selectedLog.targetUserId || 'N/A'}</span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-700 block mb-1">Payload de Metadados:</span>
              <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-60">
                {JSON.stringify(selectedLog.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
