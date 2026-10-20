import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Link,
  Unlink,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { Card, CardHeader } from '../../shared/design-system/Card';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import { useToast } from '../../shared/design-system/Toast';

export const StudentIntegrationsView: React.FC = () => {
  const { currentUser } = useAuth();
  const studentId = currentUser?.uid || 'demo-student-01';

  const [calendarConnected, setCalendarConnected] = useState(true);
  const [userEmail, setUserEmail] = useState(currentUser?.email || 'beatriz.santos@student.fluently.edu');
  const [selectedTimezone, setSelectedTimezone] = useState('America/Sao_Paulo');

  const { success, info } = useToast();

  const handleToggleCalendar = async () => {
    const nextState = !calendarConnected;
    setCalendarConnected(nextState);
    await setDoc(
      doc(db, 'integrationConnections', `${studentId}-calendar`),
      {
        userId: studentId,
        provider: 'google_calendar',
        status: nextState ? 'connected' : 'disconnected',
        scopes: ['https://www.googleapis.com/auth/calendar.events'],
        externalAccountId: userEmail,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    if (nextState) {
      success('Google Agenda Conectada', 'Suas aulas agendadas serão adicionadas automaticamente ao seu calendário.');
    } else {
      info('Google Agenda Desconectada');
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Preferências & Google Agenda</h1>
        <p className="text-xs text-slate-500 mt-1">
          Sincronize suas aulas confirmadas com seu calendário pessoal para receber notificações no celular.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Google Calendar Card */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Google Calendar (Agenda Pessoal)</h3>
                  <p className="text-[11px] text-slate-500">Adicione convites automáticos com link do Zoom</p>
                </div>
              </div>
              <Badge variant={calendarConnected ? 'emerald' : 'slate'} dot>
                {calendarConnected ? 'Sincronizado' : 'Desconectado'}
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Conta Google:</span>
                  <span className="font-semibold text-slate-900">{userEmail}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Lembretes automáticos:</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 30 min antes da aula
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Ao reservar uma aula com seu professor mentor, um evento privado é inserido na sua agenda pessoal contendo o link de acesso direto do Zoom.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
            <span className="text-[10px] text-slate-400 font-mono">Status: Ativo</span>
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

        {/* Timezone & Localization */}
        <Card>
          <CardHeader
            title="Fuso Horário Preferencial"
            subtitle="Garante a exibição correta dos horários de agendamento"
            icon={<Clock className="w-5 h-5 text-blue-600" />}
          />
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fuso Horário Atual
              </label>
              <select
                value={selectedTimezone}
                onChange={(e) => {
                  setSelectedTimezone(e.target.value);
                  success('Fuso horário atualizado');
                }}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono"
              >
                <option value="America/Sao_Paulo">America/Sao_Paulo (Horário de Brasília, UTC-3)</option>
                <option value="America/Manaus">America/Manaus (UTC-4)</option>
                <option value="America/Noronha">America/Noronha (UTC-2)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
              </select>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 leading-relaxed">
              As reservas e horários são sincronizados universalmente em UTC e apresentados no fuso configurado acima.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
