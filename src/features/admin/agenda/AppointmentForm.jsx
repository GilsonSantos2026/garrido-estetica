import { useMemo, useState } from 'react';
import { UserPlus, Search, X } from 'lucide-react';
import { useStore, useLookup } from '../../../store/StoreContext.jsx';
import { useAdmin } from '../AdminApp.jsx';
import { getFreeSlots } from '../../../domain/availability.js';
import { brl, fmtDuration, todayISO } from '../../../domain/time.js';
import { availabilityContext, professionalsFor } from '../../shared.js';
import { Avatar, Button, Field, Input, Modal, Select, cx } from '../../../components/ui.jsx';

/** Novo agendamento interno (lançado pela clínica) ou remarcação. */
export default function AppointmentForm({ prefill = {}, reschedule, onClose }) {
  const { db, act, notify } = useStore();
  const L = useLookup();
  const nav = useAdmin();
  const base = reschedule || prefill;
  const [clientId, setClientId] = useState(base.clientId || '');
  const [serviceId, setServiceId] = useState(base.serviceId || '');
  const [professionalId, setProfessionalId] = useState(base.professionalId || '');
  const [date, setDate] = useState(base.date && base.date >= todayISO() ? base.date : todayISO());
  const [start, setStart] = useState(reschedule?.start || '');
  const [manual, setManual] = useState(false);
  const [notes, setNotes] = useState(prefill.notes || '');

  const service = serviceId ? L.service(serviceId) : null;
  const capable = serviceId ? professionalsFor(db, serviceId) : db.professionals.filter((p) => p.active);
  const pid = capable.some((p) => p.id === professionalId) ? professionalId : capable[0]?.id || '';
  const ctx = availabilityContext(db);

  const slots = useMemo(() => {
    if (!service || !pid) return [];
    return getFreeSlots({ date, durationMin: service.durationMin, professionalId: pid, ...ctx, settings: { ...db.settings, minAdvanceMin: 0 }, ignoreAppointmentId: reschedule?.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, pid, date, db.appointments]);

  const save = () => {
    try {
      if (reschedule) {
        act.rescheduleAppointment({ id: reschedule.id, date, start, professionalId: pid, allowOverlap: manual });
        notify('Agendamento remarcado.');
      } else {
        act.createAppointment({ clientId, serviceId, professionalId: pid, date, start, source: 'interno', notes, allowOverlap: manual });
        notify('Agendamento criado.');
      }
      nav.setAgendaDate(date);
      onClose();
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  return (
    <Modal open onClose={onClose} wide title={reschedule ? 'Remarcar' : 'Novo agendamento'}
      subtitle={reschedule ? `${L.client(reschedule.clientId).name} · ${L.service(reschedule.serviceId).name}` : 'Lançado pela clínica'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={!clientId || !serviceId || !start}>Salvar</Button></>}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          {!reschedule && <ClientPicker value={clientId} onChange={setClientId} />}
          {!reschedule && (
            <Field label="Procedimento">
              <Select value={serviceId} onChange={(e) => { setServiceId(e.target.value); setStart(''); }} placeholder="Escolha…"
                options={db.services.filter((s) => s.active).map((s) => ({ value: s.id, label: `${s.name} · ${fmtDuration(s.durationMin)} · ${brl(s.price)}` }))} />
            </Field>
          )}
          <Field label="Profissional">
            <div className="flex flex-wrap gap-2">
              {capable.map((p) => (
                <button key={p.id} type="button" onClick={() => { setProfessionalId(p.id); setStart(''); }}
                  className={cx('chip', pid === p.id && 'chip-on')}><Avatar name={p.name} color={p.color} size={20} />{p.name}</button>
              ))}
            </div>
          </Field>
          <Field label="Data"><Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setStart(''); }} /></Field>
          {!reschedule && <Field label="Observações"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>}
        </div>

        <div>
          <div className="label mb-2 flex items-center justify-between">
            Horários livres
            <label className="inline-flex items-center gap-1.5 normal-case tracking-normal text-graphite-500">
              <input type="checkbox" className="accent-brand-500" checked={manual} onChange={(e) => setManual(e.target.checked)} />encaixe manual
            </label>
          </div>
          {manual ? (
            <Field hint="Permite sobrepor outro atendimento (encaixe). Use com cuidado.">
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
          ) : !service ? (
            <p className="rounded-xl bg-mist-50 p-4 text-sm text-graphite-500">Escolha o procedimento para ver os horários.</p>
          ) : slots.length ? (
            <div className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto pr-1">
              {slots.map((t) => (
                <button key={t} type="button" onClick={() => setStart(t)}
                  className={cx('rounded-xl border py-2 text-sm font-medium tabular-nums', start === t ? 'border-brand-500 bg-brand-500 text-white' : 'border-mist-300 bg-white hover:border-brand-300')}>{t}</button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-mist-50 p-4 text-sm text-graphite-500">Sem horários livres neste dia para {L.professional(pid).name}. Tente outra data, outro profissional ou o encaixe manual.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

/** Busca de cliente com cadastro rápido. */
export function ClientPicker({ value, onChange }) {
  const { db, tryAct } = useStore();
  const L = useLookup();
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [nc, setNc] = useState({ name: '', whatsapp: '' });

  if (value) {
    const c = L.client(value);
    return (
      <Field label="Cliente">
        <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-3 py-2">
          <span className="flex items-center gap-2"><Avatar name={c.name} size={26} /><span><b className="font-medium">{c.name}</b><span className="block text-xs text-graphite-500">{c.whatsapp}</span></span></span>
          <button type="button" onClick={() => onChange('')} className="rounded-full p-1 hover:bg-white" aria-label="Trocar cliente"><X className="h-4 w-4" /></button>
        </div>
      </Field>
    );
  }
  if (creating) {
    const create = () => {
      const c = tryAct('createClient', nc, 'Cliente cadastrado.');
      if (c) onChange(c.id);
    };
    return (
      <Field label="Novo cliente">
        <div className="space-y-2 rounded-xl border border-mist-200 p-3">
          <Input placeholder="Nome" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} />
          <Input placeholder="WhatsApp com DDD" inputMode="tel" value={nc.whatsapp} onChange={(e) => setNc({ ...nc, whatsapp: e.target.value })} />
          <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Voltar</Button><Button size="sm" onClick={create}>Cadastrar</Button></div>
        </div>
      </Field>
    );
  }
  const term = q.trim().toLowerCase();
  const matches = db.clients.filter((c) => !term || c.name.toLowerCase().includes(term) || c.whatsapp.includes(term)).slice(0, 6);
  return (
    <Field label="Cliente">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-graphite-400" />
        <input className="input pl-9" placeholder="Buscar por nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
        {matches.map((c) => (
          <button key={c.id} type="button" onClick={() => onChange(c.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-mist-100">
            <Avatar name={c.name} size={24} />{c.name}<span className="ml-auto text-xs text-graphite-400">{c.whatsapp}</span>
          </button>
        ))}
        <button type="button" onClick={() => { setCreating(true); setNc({ name: q, whatsapp: '' }); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-brand-700 hover:bg-brand-50">
          <UserPlus className="h-4 w-4" />Cadastrar novo cliente
        </button>
      </div>
    </Field>
  );
}
