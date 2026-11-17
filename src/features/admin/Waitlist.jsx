import { useMemo, useState } from 'react';
import { Hourglass, Plus, Trash2, CalendarPlus, Zap } from 'lucide-react';
import { useStore, useLookup } from '../../store/StoreContext.jsx';
import { getSlotsForService, pickProfessional } from '../../domain/availability.js';
import { PERIODS } from '../../domain/constants.js';
import { addDays, fmtLong, todayISO } from '../../domain/time.js';
import { availabilityContext, msgSlotOpen, periodOf, professionalsFor } from '../shared.js';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, WhatsAppLink, cx } from '../../components/ui.jsx';
import { ClientPicker } from './agenda/AppointmentForm.jsx';

export default function Waitlist() {
  const { db, tryAct } = useStore();
  const L = useLookup();
  const [adding, setAdding] = useState(false);
  const [fitting, setFitting] = useState(null);
  const today = todayISO();
  const ctx = availabilityContext(db);

  // Próximo horário livre (hoje ou amanhã) que combina com cada pessoa da lista
  const hints = useMemo(() => Object.fromEntries(db.waitlist.map((w) => {
    const service = L.service(w.serviceId);
    for (const date of [today, addDays(today, 1)]) {
      const slots = getSlotsForService({ date, service, professionalIds: professionalsFor(db, w.serviceId).map((p) => p.id), ...ctx })
        .filter((s) => w.preferredPeriod === 'Qualquer horário' || periodOf(s.time) === w.preferredPeriod);
      if (slots.length) return [w.id, { date, time: slots[0].time, count: slots.length }];
    }
    return [w.id, null];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [db.waitlist, db.appointments]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-bold">Lista de espera</h1><p className="text-sm text-graphite-500">Interessados em encaixe. Quando surgir uma desistência, avise com 1 clique.</p></div>
        <Button icon={Plus} onClick={() => setAdding(true)}>Adicionar</Button>
      </div>

      {db.waitlist.length === 0 ? <Card><EmptyState icon={Hourglass} title="Lista vazia" /></Card> : (
        <div className="grid gap-3 md:grid-cols-2">
          {db.waitlist.map((w) => {
            const s = L.service(w.serviceId);
            const hint = hints[w.id];
            const when = hint ? `${hint.date === today ? 'hoje' : 'amanhã'} às ${hint.time}` : '';
            return (
              <Card key={w.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><div className="font-medium">{w.name}</div><div className="text-xs text-graphite-500">{w.whatsapp}</div></div>
                  <div className="flex flex-wrap justify-end gap-1"><Badge tone="rose">{s.name}</Badge><Badge>{w.preferredPeriod}</Badge></div>
                </div>
                {w.notes && <p className="mt-2 text-sm text-graphite-600">{w.notes}</p>}
                <div className={cx('mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm', hint ? 'bg-emerald-50 text-emerald-800' : 'bg-nude-50 text-graphite-500')}>
                  <Zap className="h-4 w-4" />{hint ? `Vaga livre ${when} (${hint.count} horários)` : 'Sem vagas compatíveis hoje ou amanhã'}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <WhatsAppLink phone={w.whatsapp} message={msgSlotOpen(db.settings.clinicName, w.name, s, when)}>Avisar vaga</WhatsAppLink>
                  <Button size="sm" variant="soft" icon={CalendarPlus} onClick={() => setFitting(w)}>Encaixar</Button>
                  <Button size="sm" variant="ghost" icon={Trash2} onClick={() => tryAct('removeRow', { table: 'waitlist', id: w.id }, 'Removido da lista.')}>Remover</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {adding && <AddDialog onClose={() => setAdding(false)} />}
      {fitting && <FitDialog w={fitting} onClose={() => setFitting(null)} />}
    </div>
  );
}

function AddDialog({ onClose }) {
  const { db, tryAct } = useStore();
  const L = useLookup();
  const [clientId, setClientId] = useState('');
  const [f, setF] = useState({ name: '', whatsapp: '', serviceId: db.services[0]?.id, preferredPeriod: PERIODS[0], notes: '' });
  const save = () => {
    const c = clientId ? L.client(clientId) : null;
    if (tryAct('addToWaitlist', { ...f, clientId: clientId || null, name: c ? c.name : f.name, whatsapp: c ? c.whatsapp : f.whatsapp }, 'Adicionado à lista de espera.')) onClose();
  };
  return (
    <Modal open onClose={onClose} title="Lista de espera" footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
      <div className="space-y-3">
        <ClientPicker value={clientId} onChange={setClientId} />
        {!clientId && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ou nome (sem cadastro)"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="WhatsApp"><Input inputMode="tel" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></Field>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Procedimento"><Select value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value })} options={db.services.map((s) => ({ value: s.id, label: s.name }))} /></Field>
          <Field label="Preferência"><Select value={f.preferredPeriod} onChange={(e) => setF({ ...f, preferredPeriod: e.target.value })} options={PERIODS} /></Field>
        </div>
        <Field label="Observações"><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function FitDialog({ w, onClose }) {
  const { db, tryAct } = useStore();
  const L = useLookup();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const service = L.service(w.serviceId);
  const slots = getSlotsForService({ date, service, professionalIds: professionalsFor(db, w.serviceId).map((p) => p.id), ...availabilityContext(db), settings: { ...db.settings, minAdvanceMin: 0 } });
  const fit = (s) => {
    const professionalId = pickProfessional(s.professionalIds, date, db.appointments);
    if (tryAct('fitFromWaitlist', { waitId: w.id, professionalId, date, start: s.time }, `${w.name} encaixada(o) ${fmtLong(date)} às ${s.time}.`)) onClose();
  };
  return (
    <Modal open onClose={onClose} title={`Encaixar ${w.name}`} subtitle={`${service.name} · preferência: ${w.preferredPeriod}`}>
      <Field label="Dia" className="mb-3"><Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      {slots.length ? (
        <div className="grid grid-cols-4 gap-2">
          {slots.map((s) => (
            <button key={s.time} type="button" onClick={() => fit(s)}
              className={cx('rounded-xl border py-2 text-sm font-medium tabular-nums hover:border-rose-400',
                w.preferredPeriod === 'Qualquer horário' || periodOf(s.time) === w.preferredPeriod ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-nude-300 bg-white')}>
              {s.time}<span className="block text-[10px] font-normal text-graphite-500">{s.professionalIds.map((id) => L.professional(id).name.split(' ')[0]).join(', ')}</span>
            </button>
          ))}
        </div>
      ) : <p className="text-sm text-graphite-500">Sem horários livres neste dia.</p>}
      <p className="mt-3 text-xs text-graphite-400">Em destaque: horários no período preferido. Ao encaixar, a pessoa sai da lista e, se não tiver cadastro, vira cliente.</p>
    </Modal>
  );
}
