import React, { useState, useEffect } from 'react';
import {
  Video,
  Calendar,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Key,
  ShieldCheck,
  AlertCircle,
  Link,
  Unlink,
} from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { Card, CardHeader } from '../../shared/design-system/Card';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import { Modal } from '../../shared/design-system/Modal';
import { Input } from '../../shared/design-system/Input';
import { useToast } from '../../shared/design-system/Toast';

export const TeacherIntegrationsView: React.FC = () => {
  const { currentUser } = useAuth();
  const teacherId = currentUser?.uid || 'demo-teacher-01';

  // Integration States
  const [zoomConnected, setZoomConnected] = useState(true);
  const [zoomMeetingId, setZoomMeetingId] = useState('984 5120 7841');
  const [zoomPasscode, setZoomPasscode] = useState('EasyEnglish2026');

  const [calendarConnected, setCalendarConnected] = useState(true);
  const [calendarEmail, setCalendarEmail] = useState(currentUser?.email || 'michael.davies@easyenglish.edu');
  const [autoSync, setAutoSync] = useState(true);

  // Modal: Zoom Settings
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [tempMeetingId, setTempMeetingId] = useState(zoomMeetingId);
  const [tempPasscode, setTempPasscode] = useState(zoomPasscode);

  const { success, info } = useToast();

  useEffect(() => {
    async function loadIntegrationConfig() {
      try {
        const snap = await getDoc(doc(db, 'integrationConnections', `${teacherId}-zoom`));
        if (snap.exists()) {
          const data = snap.data();
          setZoomConnected(data.status === 'connected');
          if (data.externalAccountId) setZoomMeetingId(data.externalAccountId);
        }
      } catch {}
    }
    loadIntegrationConfig();
  }, [teacherId]);

  const handleToggleZoom = async () => {
    const nextState = !zoomConnected;
    setZoomConnected(nextState);
    await setDoc(
      doc(db, 'integrationConnections', `${teacherId}-zoom`),
      {
        userId: teacherId,
        provider: 'zoom',
        status: nextState ? 'connected' : 'disconnected',
        scopes: ['meeting:write', 'meeting:read'],
        externalAccountId: zoomMeetingId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    if (nextState) {
      success('Zoom Conectado', 'Aulas agendadas gerarão links de videoconferência automaticamente.');
    } else {
      info('Zoom Desconectado', 'Links de videoconferência não serão criados.');
    }
  };

  const handleToggleCalendar = async () => {
    const nextState = !calendarConnected;
    setCalendarConnected(nextState);
    await setDoc(
      doc(db, 'integrationConnections', `${teacherId}-calendar`),
      {
        userId: teacherId,
        provider: 'google_calendar',
        status: nextState ? 'connected' : 'disconnected',
        scopes: ['https://www.googleapis.com/auth/calendar.events'],
        externalAccountId: calendarEmail,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    if (nextState) {
      success('Google Calendar Conectado', 'Suas aulas serão sincronizadas à sua agenda Google.');
    } else {
      info('Google Calendar Desconectado');
    }
  };

  const handleSaveZoomSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setZoomMeetingId(tempMeetingId);
    setZoomPasscode(tempPasscode);
    setIsZoomModalOpen(false);
    success('Configuração Zoom Atualizada', 'ID Pessoal e senha configurados.');
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Integrações de Videoconferência & Agenda</h1>
        <p className="text-xs text-slate-500 mt-1">
          Conecte sua conta do Zoom para geração de salas virtuais e o Google Agenda para sincronização de eventos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Zoom Card */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Zoom Videoconferência</h3>
                  <p className="text-[11px] text-slate-500">Geração automática de reuniões e links de aula</p>
                </div>
              </div>
              <Badge variant={zoomConnected ? 'emerald' : 'slate'} dot>
                {zoomConnected ? 'Conectado' : 'Desconectado'}
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">ID de Reunião do Docente:</span>
                  <span className="font-mono font-bold text-slate-900">{zoomMeetingId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Senha / Passcode:</span>
                  <span className="font-mono text-slate-700">{zoomPasscode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Permissão OAuth:</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> meeting:write
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Ao confirmar uma reserva com um aluno, o sistema orquestra a criação da sala Zoom e fornece o link seguro na área do aluno e do professor.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTempMeetingId(zoomMeetingId);
                setTempPasscode(zoomPasscode);
                setIsZoomModalOpen(true);
              }}
            >
              Ajustar ID da Sala
            </Button>
            <Button
              size="sm"
              variant={zoomConnected ? 'ghost' : 'primary'}
              onClick={handleToggleZoom}
              leftIcon={zoomConnected ? <Unlink className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />}
            >
              {zoomConnected ? 'Desconectar Zoom' : 'Conectar Zoom'}
            </Button>
          </div>
        </Card>

        {/* Google Calendar Card */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Google Calendar (Agenda)</h3>
                  <p className="text-[11px] text-slate-500">Sincronização bidirecional de reservas</p>
                </div>
              </div>
              <Badge variant={calendarConnected ? 'emerald' : 'slate'} dot>
                {calendarConnected ? 'Sincronizado' : 'Inativo'}
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Conta Google Vinculada:</span>
                  <span className="font-semibold text-slate-900">{calendarEmail}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Auto-sincronização:</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Habilitada (Tempo Real)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Escopo Autorizado:</span>
                  <span className="font-mono text-[10px] text-slate-600">calendar.events</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                As aulas agendadas e eventuais cancelamentos serão refletidos na sua agenda com lembretes automáticos para o aluno e o professor.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
            <span className="text-[10px] text-slate-400 font-mono">Status: Sincronizado</span>
            <Button
              size="sm"
              variant={calendarConnected ? 'ghost' : 'primary'}
              onClick={handleToggleCalendar}
              leftIcon={calendarConnected ? <Unlink className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />}
            >
              {calendarConnected ? 'Desconectar Agenda' : 'Conectar Google Agenda'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Modal: Zoom Room ID Settings */}
      <Modal
        isOpen={isZoomModalOpen}
        onClose={() => setIsZoomModalOpen(false)}
        title="Configurar Sala Zoom do Docente"
        description="Você pode utilizar seu ID Pessoal de Reunião (PMI) do Zoom ou links dinâmicos."
      >
        <form onSubmit={handleSaveZoomSettings} className="space-y-4 text-xs">
          <Input
            label="ID da Reunião Zoom (Personal Meeting ID)"
            value={tempMeetingId}
            onChange={(e) => setTempMeetingId(e.target.value)}
            placeholder="Ex: 984 5120 7841"
            required
          />
          <Input
            label="Senha da Sala (Passcode)"
            value={tempPasscode}
            onChange={(e) => setTempPasscode(e.target.value)}
            placeholder="Ex: Fluently2026"
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsZoomModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar Configuração</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
