import { CalendarX2, CalendarClock, Package, Clock, CalendarPlus, Info } from 'lucide-react';
import { useStore, useLookup } from '../../store/StoreContext.jsx';
import { canClientChange } from '../../store/actions.js';
import { brl, fmtBR, fmtLong, todayISO } from '../../domain/time.js';
import { packageBalance } from '../../domain/finance.js';
import { Avatar, Button, Card, EmptyState, SectionTitle, StatusBadge, WhatsAppLink } from '../../components/ui.jsx';

export default function MyAppointments({ user, onReschedule, onNew }) {
  const { db, act, notify } = useStore();
  const L = useLookup();
  const today = todayISO();
  const mine = db.appointments.filter((a) => a.clientId === user.clientId);
  const upcoming = mine.filter((a) => a.date >= today && !['cancelado', 'faltou', 'concluido'].includes(a.status)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const past = mine.filter((a) => !upcoming.includes(a)).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  const packages = db.clientPackages.filter((p) => p.clientId === user.clientId);

  const cancel = (a) => {
    if (!window.confirm(`Cancelar ${L.service(a.serviceId).name} em ${fmtBR(a.date)} às ${a.start}?`)) return;
    try {
      act.cancelByClient({ id: a.id, clientId: user.clientId });
      notify('Agendamento cancelado.');
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      {packages.length > 0 && (
        <>
          <SectionTitle>Meus pacotes</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {packages.map((p) => {
              const bal = packageBalance(p);
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium"><Package className="h-4 w-4 text-rose-500" />{L.service(p.serviceId).name}</div>
                    <span className="font-serif text-2xl font-bold text-rose-700">{bal}<span className="text-sm text-graphite-400">/{p.totalSessions}</span></span>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {Array.from({ length: p.totalSessions }, (_, i) => <span key={i} className={`h-2 flex-1 rounded-full ${i < p.usedSessions ? 'bg-graphite-300' : 'bg-rose-400'}`} />)}
                  </div>
                  <div className="mt-2 text-xs text-graphite-500">{bal ? `${bal} sessões disponíveis` : 'Pacote concluído'}{p.expiresAt && ` · válido até ${fmtBR(p.expiresAt)}`}</div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <SectionTitle action={<Button size="sm" variant="soft" icon={CalendarPlus} onClick={onNew}>Novo</Button>}>Próximos horários</SectionTitle>
      {upcoming.length ? (
        <div className="space-y-3">
          {upcoming.map((a) => {
            const s = L.service(a.serviceId);
            const p = L.professional(a.professionalId);
            const can = canClientChange(db, a);
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-serif text-2xl font-bold leading-tight">{fmtLong(a.date)}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-sm text-graphite-500"><Clock className="h-4 w-4" />{a.start} – {a.end}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <Avatar name={p.name} color={p.color} size={28} />
                  <span><b className="font-medium">{s.name}</b> com {p.name} · {brl(a.price)}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {can ? (
                    <>
                      <Button size="sm" variant="outline" icon={CalendarClock} onClick={() => onReschedule(a)}>Remarcar</Button>
                      <Button size="sm" variant="danger" icon={CalendarX2} onClick={() => cancel(a)}>Cancelar</Button>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 text-xs text-graphite-500"><Info className="h-3.5 w-3.5" />Faltam menos de {db.settings.minCancelHours} h: alterações só pela clínica.</span>
                      <WhatsAppLink phone={db.settings.whatsapp} message={`Olá! Preciso falar sobre meu horário de ${s.name} em ${fmtBR(a.date)} às ${a.start}.`}>Falar com a clínica</WhatsAppLink>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card><EmptyState icon={CalendarPlus} title="Nenhum horário marcado">Que tal agendar seu próximo cuidado?</EmptyState></Card>
      )}

      {past.length > 0 && (
        <>
          <SectionTitle>Histórico</SectionTitle>
          <Card className="divide-y divide-nude-100">
            {past.slice(0, 15).map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div><div className="font-medium">{L.service(a.serviceId).name}</div><div className="text-xs text-graphite-500">{fmtBR(a.date)} · {a.start} · {L.professional(a.professionalId).name}</div></div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
