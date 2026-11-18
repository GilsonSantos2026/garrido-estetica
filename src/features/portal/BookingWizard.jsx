import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, ChevronLeft, Check, ShieldCheck, Users, CalendarCheck2, Sun, Sunset, Moon } from 'lucide-react';
import { useStore, useLookup } from '../../store/StoreContext.jsx';
import { getAvailableDays, getSlotsForService, pickProfessional } from '../../domain/availability.js';
import { brl, fmtDuration, fmtLong, addDays, todayISO } from '../../domain/time.js';
import { hasConsent } from '../../store/actions.js';
import { availabilityContext, professionalsFor, periodOf } from '../shared.js';
import { MonthCalendar } from '../../components/MonthCalendar.jsx';
import { Avatar, Badge, Button, Card, Field, Textarea, cx } from '../../components/ui.jsx';
import AuthPanel from './AuthPanel.jsx';

const STEPS = ['Procedimento', 'Profissional', 'Data e horário', 'Confirmar'];
const PERIOD_ICON = { Manhã: Sun, Tarde: Sunset, Noite: Moon };

export default function BookingWizard({ user, onAuth, reschedule, onDone, onCancel }) {
  const { db, act, notify } = useStore();
  const L = useLookup();
  const today = todayISO();
  const [step, setStep] = useState(reschedule ? 2 : 0);
  const [serviceId, setServiceId] = useState(reschedule?.serviceId || null);
  const [prof, setProf] = useState(reschedule?.professionalId || null);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);
  const topRef = useRef(null);
  const firstRender = useRef(true);
  // No celular, cada etapa nova começa no topo do assistente
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  const service = serviceId ? L.service(serviceId) : null;
  const capable = serviceId ? professionalsFor(db, serviceId) : [];
  const profIds = prof && prof !== 'any' ? [prof] : capable.map((p) => p.id);
  const ctx = availabilityContext(db);
  const ignore = reschedule?.id ?? null;

  const availableDays = useMemo(() => {
    if (!service || step < 2) return [];
    return getAvailableDays({ month, service, professionalIds: profIds, ...ctx, ignoreAppointmentId: ignore });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, month, prof, step, db.appointments, db.timeBlocks, db.settings]);

  const slots = useMemo(() => {
    if (!service || !date) return [];
    return getSlotsForService({ date, service, professionalIds: profIds, ...ctx, ignoreAppointmentId: ignore });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, date, prof, db.appointments]);

  const needsConsent = service?.requiresConsent && !reschedule && !(user && hasConsent(db, user.clientId, service.id));

  const chooseService = (id) => {
    setServiceId(id);
    setDate(null);
    setSlot(null);
    const caps = professionalsFor(db, id);
    if (caps.length === 1) {
      setProf(caps[0].id);
      setStep(2);
    } else {
      setProf(null);
      setStep(1);
    }
  };

  const back = () => {
    if (step === 2 && (reschedule || capable.length === 1)) return reschedule ? onCancel() : setStep(0);
    if (step === 0) return onCancel?.();
    setStep(step - 1);
  };

  const confirm = () => {
    if (needsConsent && !consent) return notify('Para este procedimento é preciso aceitar o termo de consentimento.', 'error');
    const professionalId = prof === 'any' ? pickProfessional(slot.professionalIds, date, db.appointments) : prof;
    try {
      let appt;
      if (reschedule) {
        appt = act.rescheduleAppointment({ id: reschedule.id, date, start: slot.time, professionalId });
        notify('Horário remarcado!');
      } else {
        appt = act.createAppointment({ clientId: user.clientId, serviceId, professionalId, date, start: slot.time, source: 'online', notes });
        if (needsConsent) act.addConsent({ clientId: user.clientId, serviceId, appointmentId: appt.id, acceptedVia: 'portal' });
        notify('Agendamento realizado! 💗');
      }
      onDone(appt);
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const visibleSteps = capable.length === 1 || reschedule ? STEPS.filter((s) => s !== 'Profissional') : STEPS;
  const current = visibleSteps.indexOf(STEPS[step]);
  const grouped = slots.reduce((g, s) => ({ ...g, [periodOf(s.time)]: [...(g[periodOf(s.time)] || []), s] }), {});

  return (
    <div ref={topRef} className="mx-auto max-w-3xl scroll-mt-28">
      {/* Progresso */}
      <div className="mb-5 flex items-center gap-2">
        <button type="button" onClick={back} className="rounded-full p-2 text-graphite-500 hover:bg-mist-100" aria-label="Voltar"><ChevronLeft className="h-5 w-5" /></button>
        <div className="flex flex-1 gap-1.5">
          {visibleSteps.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={cx('h-1.5 rounded-full', i <= current ? 'bg-brand-400' : 'bg-mist-200')} />
              <div className={cx('mt-1 hidden text-[11px] sm:block', i === current ? 'font-medium text-brand-700' : 'text-graphite-400')}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      {reschedule && (
        <Card className="mb-4 bg-amber-50/60 p-3 text-sm text-amber-900">
          Remarcando <b>{L.service(reschedule.serviceId).name}</b> de {fmtLong(reschedule.date)} às {reschedule.start}.
        </Card>
      )}

      {step === 0 && (
        <>
          <h2 className="mb-1 text-3xl font-bold">Qual procedimento você deseja?</h2>
          <p className="mb-4 text-sm text-graphite-500">Valores e duração aproximada de cada sessão.</p>
          {[...new Set(db.services.filter((s) => s.active).map((s) => s.category || 'Outros'))].map((cat) => (
            <div key={cat} className="mb-5">
              <div className="label mb-2">{cat}</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {db.services.filter((s) => s.active && (s.category || 'Outros') === cat && professionalsFor(db, s.id).length).map((s) => (
                  <button key={s.id} type="button" onClick={() => chooseService(s.id)} className="card group p-4 text-left transition hover:border-brand-300 hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-medium text-graphite-900">{s.name}</div>
                      <div className="shrink-0 font-serif text-xl font-bold text-brand-700">{brl(s.price)}</div>
                    </div>
                    <p className="mt-1 text-sm text-graphite-500">{s.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-graphite-500">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{fmtDuration(s.durationMin)}</span>
                      {s.requiresConsent && <Badge tone="amber"><ShieldCheck className="h-3 w-3" />requer termo</Badge>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {step === 1 && (
        <>
          <h2 className="mb-1 text-3xl font-bold">Com quem?</h2>
          <p className="mb-4 text-sm text-graphite-500">{service.name} · {fmtDuration(service.durationMin)}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => { setProf('any'); setStep(2); }} className="card flex items-center gap-3 p-4 text-left hover:border-brand-300">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-600"><Users className="h-5 w-5" /></span>
              <div><div className="font-medium">Sem preferência</div><div className="text-sm text-graphite-500">Mostra mais horários disponíveis</div></div>
            </button>
            {capable.map((p) => (
              <button key={p.id} type="button" onClick={() => { setProf(p.id); setStep(2); }} className="card flex items-center gap-3 p-4 text-left hover:border-brand-300">
                <Avatar name={p.name} color={p.color} size={44} />
                <div><div className="font-medium">{p.name}</div><div className="text-sm text-graphite-500">{p.title}</div></div>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="mb-1 text-3xl font-bold">Escolha o dia e horário</h2>
          <p className="mb-4 text-sm text-graphite-500">
            {service.name} · {fmtDuration(service.durationMin)} · {prof === 'any' ? 'qualquer profissional' : L.professional(prof).name}
          </p>
          <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <Card className="p-4">
              <MonthCalendar
                month={month} onMonthChange={(m) => { setMonth(m); setDate(null); setSlot(null); }}
                selected={date} onSelect={(d) => { setDate(d); setSlot(null); }}
                available={availableDays} today={today}
                minMonth={today.slice(0, 7)} maxMonth={addDays(today, db.settings.bookingWindowDays).slice(0, 7)}
              />
              {!availableDays.length && <p className="mt-3 text-center text-sm text-graphite-500">Nenhum horário livre neste mês. Veja o próximo.</p>}
            </Card>
            <Card className="p-4">
              {!date ? (
                <div className="flex h-full min-h-40 flex-col items-center justify-center text-center text-sm text-graphite-400">
                  <CalendarCheck2 className="mb-2 h-7 w-7 text-brand-300" />Toque num dia destacado para ver os horários livres.
                </div>
              ) : (
                <>
                  <div className="mb-3 font-medium">{fmtLong(date)}</div>
                  {['Manhã', 'Tarde', 'Noite'].filter((p) => grouped[p]).map((p) => {
                    const Icon = PERIOD_ICON[p];
                    return (
                      <div key={p} className="mb-3">
                        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-graphite-400"><Icon className="h-3.5 w-3.5" />{p}</div>
                        <div className="grid grid-cols-4 gap-2">
                          {grouped[p].map((s) => (
                            <button key={s.time} type="button" onClick={() => setSlot(s)}
                              className={cx('rounded-xl border py-2 text-sm font-medium tabular-nums transition',
                                slot?.time === s.time ? 'border-brand-500 bg-brand-500 text-white' : 'border-mist-300 bg-white text-graphite-700 hover:border-brand-300')}>
                              {s.time}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {!slots.length && <p className="text-sm text-graphite-500">Este dia lotou. Escolha outro.</p>}
                </>
              )}
            </Card>
          </div>
          <div className="sticky bottom-0 mt-4 flex justify-end bg-gradient-to-t from-mist-50 via-mist-50 to-transparent py-3">
            <Button size="lg" disabled={!slot} onClick={() => setStep(3)}>Continuar</Button>
          </div>
        </>
      )}

      {step === 3 && slot && (
        <>
          <h2 className="mb-4 text-3xl font-bold">{reschedule ? 'Confirme o novo horário' : 'Confirme seu agendamento'}</h2>
          <Card className="mb-4 divide-y divide-mist-100">
            {[
              ['Procedimento', `${service.name} · ${fmtDuration(service.durationMin)}`],
              ['Profissional', prof === 'any' ? `${L.professional(pickProfessional(slot.professionalIds, date, db.appointments)).name} (sem preferência)` : L.professional(prof).name],
              ['Quando', `${fmtLong(date)} às ${slot.time}`],
              ['Valor', reschedule ? brl(reschedule.price) : brl(service.price)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm"><span className="text-graphite-500">{k}</span><span className="text-right font-medium">{v}</span></div>
            ))}
          </Card>

          {!user ? (
            <>
              <p className="mb-3 text-sm text-graphite-600">Falta pouco! Crie sua conta (leva 1 minuto) ou entre para confirmar.</p>
              <AuthPanel onAuth={onAuth} compact />
            </>
          ) : (
            <>
              {!reschedule && (
                <Field label="Observações (opcional)" className="mb-4">
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Algo que a profissional deva saber?" />
                </Field>
              )}
              {needsConsent && (
                <Card className="mb-4 border-amber-200 bg-amber-50/50 p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium text-amber-900"><ShieldCheck className="h-4 w-4" />Termo de consentimento</div>
                  <p className="max-h-36 overflow-y-auto text-sm leading-relaxed text-graphite-600">{db.settings.consentText}</p>
                  <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-500" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    Li e aceito o termo para {service.name}.
                  </label>
                </Card>
              )}
              <Button size="lg" className="w-full" icon={Check} onClick={confirm}>{reschedule ? 'Confirmar novo horário' : 'Confirmar agendamento'}</Button>
              <p className="mt-2 text-center text-xs text-graphite-400">
                Cancelamento ou remarcação pelo portal até {db.settings.minCancelHours} h antes.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
