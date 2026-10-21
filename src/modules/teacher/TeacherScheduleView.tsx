import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Video,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import {
  collection,
  getDoc,
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
import { AvailabilitySlot, Booking } from '../../shared/types';
import { Button } from '../../shared/design-system/Button';
import { Card, CardHeader } from '../../shared/design-system/Card';
import { Badge } from '../../shared/design-system/Badge';
import { Modal } from '../../shared/design-system/Modal';
import { useToast } from '../../shared/design-system/Toast';

export const TeacherScheduleView: React.FC = () => {
  const { currentUser } = useAuth();
  const teacherId = currentUser?.uid || '';

  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // New slot modal
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [slotDate, setSlotDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [slotTime, setSlotTime] = useState('14:00');
  const [slotDuration, setSlotDuration] = useState(45);

  const { success, error } = useToast();

  const loadScheduleData = async () => {
    if (!teacherId) return;
    try {
      setLoading(true);
      // 1. Slots
      const sSnap = await getDocs(
        query(collection(db, 'availabilitySlots'), where('teacherId', '==', teacherId))
      );
      const sList: AvailabilitySlot[] = [];
      sSnap.forEach((d) => sList.push({ id: d.id, ...d.data() } as AvailabilitySlot));
      sList.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      setSlots(sList);

      // 2. Bookings
      const bSnap = await getDocs(
        query(collection(db, 'bookings'), where('teacherId', '==', teacherId))
      );
      const bList: Booking[] = [];
      bSnap.forEach((d) => bList.push({ id: d.id, ...d.data() } as Booking));
      bList.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      setBookings(bList);
      const relSnap = await getDocs(query(
        collection(db, 'teacherStudentRelationships'),
        where('teacherId', '==', teacherId),
        where('status', '==', 'active')
      ));
      const activeStudentIds = new Set(relSnap.docs.map((relationship) => relationship.data().studentId));
      const bookingStudentIds = [...new Set(bList.map((booking) => booking.studentId))]
        .filter((studentId) => activeStudentIds.has(studentId));
      const studentSnapshots = await Promise.all(
        bookingStudentIds.map((studentId) => getDoc(doc(db, 'users', studentId)))
      );
      const names: Record<string, string> = {};
      studentSnapshots.forEach((student) => {
        if (student.exists()) names[student.id] = String(student.data().name || '');
      });
      setStudentNames(names);
    } catch (e) {
      console.error('Failed to load teacher schedule:', e);
      error('Falha ao carregar a agenda docente', String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadScheduleData();
  }, [teacherId]);

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const [hours, minutes] = slotTime.split(':').map(Number);
      const start = new Date(slotDate);
      start.setHours(hours, minutes, 0, 0);

      const end = new Date(start);
      end.setMinutes(end.getMinutes() + Number(slotDuration));

      const slotId = `slot-${Date.now()}`;
      const newSlot: AvailabilitySlot = {
        id: slotId,
        teacherId,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        timezone: 'America/Sao_Paulo',
        status: 'available',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'availabilitySlots', slotId), {
        ...newSlot,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSlots((prev) => [...prev, newSlot].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));
      setIsSlotModalOpen(false);
      success('Horário de disponibilidade adicionado!');
    } catch (err) {
      error('Falha ao adicionar horário');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await deleteDoc(doc(db, 'availabilitySlots', slotId));
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      success('Horário removido com sucesso.');
    } catch {
      error('Erro ao excluir horário');
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'completed',
        updatedAt: serverTimestamp(),
      });
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'completed' } : b))
      );
      success('Aula marcada como concluída!');
    } catch {
      error('Erro ao atualizar aula');
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Disponibilidade & Agenda de Aulas</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure horários em que você aceita reservas e gerencie as aulas confirmadas com link Zoom.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsSlotModalOpen(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Novo Horário Disponível
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confirmed Bookings */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-emerald-600" /> Aulas Agendadas com Alunos ({bookings.length})
          </h2>

          <div className="space-y-3">
            {bookings.length > 0 ? (
              bookings.map((b) => (
                <Card key={b.id} className="border-l-4 border-l-blue-600">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {new Date(b.startAt).toLocaleDateString('pt-BR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <Badge variant={b.status === 'confirmed' ? 'emerald' : 'slate'} size="sm">
                          {b.status === 'confirmed' ? 'Confirmada' : b.status}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-blue-700 mt-1">
                        {new Date(b.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(b.endAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        Aluno: {studentNames[b.studentId] || 'Aluno'}
                      </p>
                      {b.notes && <p className="text-[11px] text-slate-400 italic mt-0.5">{b.notes}</p>}
                    </div>

                    <div className="text-right">
                      {b.status === 'confirmed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCompleteBooking(b.id)}
                          className="text-[11px]"
                        >
                          Concluir
                        </Button>
                      )}
                    </div>
                  </div>

                  {b.zoomJoinUrl && (
                    <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-mono text-slate-500">ID: {b.zoomMeetingId || 'Zoom'}</span>
                      <a
                        href={b.zoomJoinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition-colors"
                      >
                        <Video className="w-3.5 h-3.5" /> Abrir Sala Zoom
                      </a>
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <Card className="text-center py-12 text-slate-400 text-xs">
                Nenhuma aula agendada no momento.
              </Card>
            )}
          </div>
        </div>

        {/* Availability Slots Grid */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" /> Meus Slots de Disponibilidade ({slots.length})
          </h2>

          <div className="space-y-2">
            {slots.length > 0 ? (
              slots.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between shadow-2xs text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <CalendarIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        {new Date(s.startAt).toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {new Date(s.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(s.endAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={s.status === 'booked' ? 'amber' : 'emerald'} size="sm">
                      {s.status === 'booked' ? 'Reservado' : 'Disponível'}
                    </Badge>
                    {s.status !== 'booked' && (
                      <button
                        onClick={() => handleDeleteSlot(s.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                        title="Excluir slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <Card className="text-center py-12 text-slate-400 text-xs">
                Nenhum slot cadastrado. Clique em "Novo Horário Disponível" para abrir sua agenda.
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modal: New Availability Slot */}
      <Modal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        title="Disponibilizar Horário na Agenda"
        description="Seus alunos vinculados poderão reservar aulas neste intervalo."
      >
        <form onSubmit={handleCreateSlot} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Data</label>
            <input
              type="date"
              value={slotDate}
              onChange={(e) => setSlotDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Horário de Início</label>
              <input
                type="time"
                value={slotTime}
                onChange={(e) => setSlotTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Duração da Aula (min)</label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
              >
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos (Padrão)</option>
                <option value={60}>60 minutos (1 hora)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsSlotModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar Horário</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
