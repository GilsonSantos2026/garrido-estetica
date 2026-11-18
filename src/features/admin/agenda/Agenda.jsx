import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, CalendarRange, List, Globe, Building2 } from 'lucide-react';
import { useStore, useLookup } from '../../../store/StoreContext.jsx';
import { useAdmin } from '../AdminApp.jsx';
import { ACTIVE_STATUS, SOURCE, STATUS } from '../../../domain/constants.js';
import { addDays, brl, fmtDayMonth, fmtLong, fmtWeekdayShort, nowMinutes, startOfWeek, toMin, todayISO, weekday } from '../../../domain/time.js';
import { workingIntervals } from '../../../domain/availability.js';
import { Avatar, Button, Card, EmptyState, Segmented, StatusBadge, WhatsAppLink, cx } from '../../../components/ui.jsx';
import { msgConfirm, msgReminder, firstName } from '../../shared.js';

const PX = 1.15; // pixels por minuto na visão de dia

export default function Agenda() {
  const { db } = useStore();
  const nav = useAdmin();
  const date = nav.agendaDate;
  const setDate = nav.setAgendaDate;
  const [mode, setMode] = useState(() => (window.innerWidth < 640 ? 'lista' : 'dia'));
  const [profFilter, setProfFilter] = useState('todos');
  const today = todayISO();
  const profs = db.professionals.filter((p) => p.active && (profFilter === 'todos' || p.id === profFilter));
  const step = mode === 'semana' ? 7 : 1;

  const dayAppts = db.appointments.filter((a) => a.date === date && profs.some((p) => p.id === a.professionalId));
  const active = dayAppts.filter((a) => ACTIVE_STATUS.includes(a.status));
  const forecast = active.reduce((s, a) => s + (a.price || 0), 0);
  const online = active.filter((a) => a.source === 'online').length;

  const title = mode === 'semana'
    ? `${fmtDayMonth(startOfWeek(date))} – ${fmtDayMonth(addDays(startOfWeek(date), 6))}`
    : fmtLong(date);

  return (
    <div>
      {/* Navegação do dia, como na prévia: ‹ data › com resumo logo abaixo */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" className="rounded-full bg-brand-100 p-1.5 text-brand-600 hover:bg-brand-200" onClick={() => setDate(addDays(date, -step))} aria-label="Anterior"><ChevronLeft className="h-5 w-5" /></button>
        <div className="min-w-0 text-center">
          <h1 className="font-sans text-[17px] font-bold leading-tight sm:font-serif sm:text-2xl">{title}</h1>
          <p className="text-sm text-graphite-500">
            {mode !== 'semana' ? `${active.length} atendimentos · previsão ${brl(forecast)}${online ? ` · ${online} online` : ''}` : 'Visão da semana'}
          </p>
        </div>
        <button type="button" className="rounded-full bg-brand-100 p-1.5 text-brand-600 hover:bg-brand-200" onClick={() => setDate(addDays(date, step))} aria-label="Próximo"><ChevronRight className="h-5 w-5" /></button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button icon={Plus} onClick={() => nav.newAppointment({ date })}>Novo agendamento</Button>
        {date !== today && <Button size="sm" variant="outline" onClick={() => setDate(today)}>Hoje</Button>}
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="hidden rounded-lg border border-mist-300 bg-white px-2 py-1.5 text-sm sm:block" aria-label="Ir para data" />
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          <select value={profFilter} onChange={(e) => setProfFilter(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-mist-300 bg-white px-2 py-1.5 text-sm sm:flex-none" aria-label="Profissional">
            <option value="todos">Todos</option>
            {db.professionals.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Segmented size="sm" value={mode} onChange={setMode} options={[
            { value: 'dia', label: 'Dia', icon: CalendarDays }, { value: 'semana', label: 'Semana', icon: CalendarRange }, { value: 'lista', label: 'Lista', icon: List },
          ]} />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-graphite-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded border-l-4 border-brand-400 bg-brand-100" /><Globe className="h-3.5 w-3.5" />Agendado pelo cliente (online)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded border-l-4 border-graphite-500 bg-mist-100" /><Building2 className="h-3.5 w-3.5" />Lançado pela clínica</span>
      </div>

      {mode === 'dia' && <DayView date={date} profs={profs} />}
      {mode === 'semana' && <WeekView date={date} profs={profs} />}
      {mode === 'lista' && <ListView date={date} profs={profs} />}
    </div>
  );
}

function blockClass(a) {
  const base = SOURCE[a.source]?.block || SOURCE.interno.block;
  return cx('border-l-4', base, ['cancelado', 'faltou'].includes(a.status) && 'opacity-45 line-through');
}

/* ---------- Dia: linha do tempo por profissional ---------- */
function DayView({ date, profs }) {
  const { db } = useStore();
  const L = useLookup();
  const nav = useAdmin();
  const h = db.settings.businessHours[weekday(date)];
  const [now, setNow] = useState(nowMinutes());
  useEffect(() => {
    const t = setInterval(() => setNow(nowMinutes()), 60000);
    return () => clearInterval(t);
  }, []);

  if (!h || h.closed) {
    return <Card><EmptyState icon={CalendarDays} title="Clínica fechada neste dia">Altere o horário de funcionamento em Ajustes.</EmptyState></Card>;
  }
  const open = Math.floor(toMin(h.open) / 60) * 60;
  const close = Math.ceil(toMin(h.close) / 60) * 60;
  const hours = [];
  for (let m = open; m < close; m += 60) hours.push(m);
  const height = (close - open) * PX;

  return (
    <Card className="overflow-hidden">
      <div className="scrollbar-thin overflow-x-auto">
        <div style={{ minWidth: 56 + profs.length * 170 }}>
          <div className="flex border-b border-mist-200 bg-mist-50/60">
            <div className="w-14 shrink-0" />
            {profs.map((p) => (
              <div key={p.id} className="flex flex-1 items-center gap-2 border-l border-mist-200 px-3 py-2 text-sm font-medium">
                <Avatar name={p.name} color={p.color} size={26} />{p.name}
              </div>
            ))}
          </div>
          <div className="relative flex" style={{ height }}>
            <div className="w-14 shrink-0">
              {hours.map((m) => (
                <div key={m} className="relative text-right text-[11px] text-graphite-400" style={{ height: 60 * PX }}>
                  <span className="absolute -top-2 right-2">{String(m / 60).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>
            {profs.map((p) => {
              const work = workingIntervals({ date, settings: db.settings, professionalId: p.id, timeBlocks: db.timeBlocks });
              const gaps = [];
              let cur = open;
              for (const [s, e] of work) {
                if (s > cur) gaps.push([cur, s]);
                cur = e;
              }
              if (cur < close) gaps.push([cur, close]);
              const list = db.appointments.filter((a) => a.date === date && a.professionalId === p.id).sort((a, b) => a.start.localeCompare(b.start));
              return (
                <div key={p.id} className="relative flex-1 border-l border-mist-200">
                  {hours.map((m) => <div key={m} className="border-b border-mist-100" style={{ height: 60 * PX }} />)}
                  {gaps.map(([s, e]) => (
                    <div key={s} className="absolute inset-x-0 bg-[repeating-linear-gradient(135deg,#edf0f4_0,#edf0f4_6px,#f4f6f8_6px,#f4f6f8_12px)]" style={{ top: (s - open) * PX, height: (e - s) * PX }} title="Fora do expediente / bloqueio" />
                  ))}
                  {list.map((a) => {
                    const top = (toMin(a.start) - open) * PX;
                    const hgt = Math.max(26, (toMin(a.end) - toMin(a.start)) * PX - 2);
                    const c = L.client(a.clientId);
                    return (
                      <button key={a.id} type="button" onClick={() => nav.openAppointment(a.id)}
                        className={cx('absolute inset-x-1 overflow-hidden rounded-lg px-2 py-1 text-left text-xs shadow-sm transition hover:shadow-md', blockClass(a))}
                        style={{ top, height: hgt }}>
                        <div className="flex items-center justify-between gap-1">
                          <b className="truncate text-[12.5px]">{a.start} {c.name}</b>
                          {a.source === 'online' && <Globe className="h-3 w-3 shrink-0" />}
                        </div>
                        <div className="truncate opacity-80">{L.service(a.serviceId).name}</div>
                        {hgt > 46 && <div className="mt-0.5"><span className="rounded bg-white/70 px-1.5 py-px text-[10.5px] font-medium">{STATUS[a.status].label}</span></div>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {date === todayISO() && now >= open && now <= close && (
              <div className="pointer-events-none absolute left-14 right-0 z-10 border-t-2 border-brand-500" style={{ top: (now - open) * PX }}>
                <span className="absolute -left-1.5 -top-[5px] h-2 w-2 rounded-full bg-brand-500" />
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Semana: 7 colunas ---------- */
function WeekView({ date, profs }) {
  const { db } = useStore();
  const L = useLookup();
  const nav = useAdmin();
  const start = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const ids = new Set(profs.map((p) => p.id));
  return (
    <div className="scrollbar-thin overflow-x-auto pb-2">
      <div className="grid min-w-[880px] grid-cols-7 gap-2">
        {days.map((d) => {
          const list = db.appointments.filter((a) => a.date === d && ids.has(a.professionalId)).sort((a, b) => a.start.localeCompare(b.start));
          const closed = db.settings.businessHours[weekday(d)]?.closed;
          return (
            <div key={d} className={cx('card min-h-[200px] p-2', d === todayISO() && 'ring-2 ring-brand-300')}>
              <button type="button" onClick={() => { nav.setAgendaDate(d); }} className="mb-2 w-full rounded-lg px-1 py-1 text-left hover:bg-mist-100">
                <div className="text-[11px] uppercase text-graphite-400">{fmtWeekdayShort(d)}</div>
                <div className="font-serif text-xl font-bold leading-none">{d.slice(8)}</div>
                <div className="text-[11px] text-graphite-400">{closed ? 'fechado' : `${list.filter((a) => ACTIVE_STATUS.includes(a.status)).length} atend.`}</div>
              </button>
              <div className="space-y-1">
                {list.map((a) => (
                  <button key={a.id} type="button" onClick={() => nav.openAppointment(a.id)} className={cx('block w-full rounded-md px-1.5 py-1 text-left text-[11.5px] leading-tight', blockClass(a))}>
                    <b>{a.start}</b> {firstName(L.client(a.clientId).name)}
                    <div className="truncate opacity-75">{L.service(a.serviceId).name}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Lista: cartões com ações rápidas (como na prévia Bella Gestão) ---------- */
function ListView({ date, profs }) {
  const { db, tryAct } = useStore();
  const L = useLookup();
  const nav = useAdmin();
  const [hideClosed, setHideClosed] = useState(false);
  const ids = new Set(profs.map((p) => p.id));
  const end = addDays(date, 13);
  const groups = useMemo(() => {
    const list = db.appointments
      .filter((a) => a.date >= date && a.date <= end && ids.has(a.professionalId) && (!hideClosed || !['cancelado', 'faltou', 'concluido'].includes(a.status)))
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    return list.reduce((g, a) => ({ ...g, [a.date]: [...(g[a.date] || []), a] }), {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.appointments, date, profs, hideClosed]);
  const setStatus = (id, status, msg) => tryAct('setAppointmentStatus', { id, status }, msg);

  return (
    <div>
      <label className="mb-3 inline-flex items-center gap-2 text-sm text-graphite-600">
        <input type="checkbox" className="accent-brand-500" checked={hideClosed} onChange={(e) => setHideClosed(e.target.checked)} />Mostrar só os pendentes
      </label>
      {Object.keys(groups).length === 0 && <Card><EmptyState icon={List} title="Nenhum agendamento nos próximos 14 dias" /></Card>}
      {Object.entries(groups).map(([d, list]) => (
        <div key={d} className="mb-5">
          <div className="mb-2 flex items-baseline gap-2">
            <h3 className="text-lg">{d === todayISO() ? 'Hoje' : fmtLong(d)}</h3>
            <span className="text-xs text-graphite-400">{list.length} agendamentos</span>
          </div>
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
            {list.map((a) => {
              const c = L.client(a.clientId);
              const s = L.service(a.serviceId);
              const p = L.professional(a.professionalId);
              const open = !['concluido', 'faltou', 'cancelado'].includes(a.status);
              return (
                <Card key={a.id} className={cx('border-l-4 p-3.5', a.source === 'online' ? 'border-l-brand-400' : 'border-l-graphite-300', !open && 'opacity-75')}>
                  <button type="button" onClick={() => nav.openAppointment(a.id)} className="flex w-full items-start gap-3 text-left">
                    <span className="w-12 shrink-0 pt-0.5 font-serif text-[17px] font-bold tabular-nums">{a.start}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-graphite-900">{c.name}</span>
                      <span className="block truncate text-sm text-graphite-500">{s.name} · {brl(a.price)}{profs.length > 1 && ` · ${p.name.split(' ')[0]}`}</span>
                    </span>
                    <StatusBadge status={a.status} />
                  </button>
                  {open && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <WhatsAppLink phone={c.whatsapp} message={a.status === 'agendado' ? msgConfirm(db.settings.clinicName, c, s, a) : msgReminder(db.settings.clinicName, c, s, a)}>WhatsApp</WhatsAppLink>
                      <Button size="sm" onClick={() => nav.complete(a.id)}>Concluir</Button>
                      {a.status === 'agendado' && <Button size="sm" variant="soft" onClick={() => setStatus(a.id, 'confirmado', 'Horário confirmado.')}>Confirmar</Button>}
                      {a.status === 'confirmado' && <Button size="sm" variant="soft" onClick={() => setStatus(a.id, 'em_atendimento', 'Atendimento iniciado.')}>Iniciar</Button>}
                      <Button size="sm" variant="danger" onClick={() => setStatus(a.id, 'faltou', 'Marcado como falta.')}>Faltou</Button>
                      <Button size="sm" variant="danger" onClick={() => window.confirm('Cancelar este agendamento?') && setStatus(a.id, 'cancelado', 'Agendamento cancelado.')}>Cancelar</Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
