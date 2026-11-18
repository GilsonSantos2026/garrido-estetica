import { useState } from 'react';
import { CalendarPlus, CalendarHeart, MapPin, LogOut, PartyPopper, MessageCircle } from 'lucide-react';
import { useStore, useLookup } from '../../store/StoreContext.jsx';
import { fmtLong } from '../../domain/time.js';
import { Button, Card, Segmented, waLink } from '../../components/ui.jsx';
import BookingWizard from './BookingWizard.jsx';
import MyAppointments from './MyAppointments.jsx';
import AuthPanel from './AuthPanel.jsx';
import { firstName } from '../shared.js';

export default function PortalApp() {
  const { db, session, authApi } = useStore();
  const L = useLookup();
  // Equipe logada no modo Supabase não tem cadastro de cliente: o portal fica como visitante.
  const user = session?.clientId ? session : null;
  const client = user ? L.client(user.clientId) : null;
  const [tab, setTab] = useState('agendar');
  const [done, setDone] = useState(null);
  const [reschedule, setReschedule] = useState(null);
  const [wizardKey, setWizardKey] = useState(0);

  const onAuth = () => {};
  const logout = async () => {
    await authApi.signOut();
    setTab('agendar');
  };
  const restart = () => {
    setDone(null);
    setReschedule(null);
    setWizardKey((k) => k + 1);
  };

  return (
    <div className="pb-16">
      {/* Boas-vindas */}
      <section className="bg-gradient-to-b from-brand-100/70 to-mist-50 px-4 pb-6 pt-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm uppercase tracking-[.2em] text-brand-600">Agende online</p>
          <h1 className="mt-1 text-4xl font-bold leading-tight sm:text-5xl">
            {client ? `Olá, ${firstName(client.name)}!` : 'Seu momento de cuidado começa aqui'}
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-graphite-500">
            {db.settings.address && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{db.settings.address}</span>}
            <a className="inline-flex items-center gap-1 underline" href={waLink(db.settings.whatsapp, 'Olá! Gostaria de tirar uma dúvida.')} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />Falar no WhatsApp</a>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Segmented
              value={tab} onChange={(t) => { setTab(t); restart(); }}
              options={[{ value: 'agendar', label: 'Agendar', icon: CalendarPlus }, { value: 'meus', label: 'Meus agendamentos', icon: CalendarHeart }]}
            />
            {user && <Button variant="ghost" size="sm" icon={LogOut} onClick={logout}>Sair</Button>}
          </div>
        </div>
      </section>

      <main className="px-4 pt-2">
        {tab === 'agendar' && !done && (
          <BookingWizard
            key={wizardKey} user={user} onAuth={onAuth} reschedule={reschedule}
            onDone={(a) => setDone(a)} onCancel={() => { if (reschedule) { setTab('meus'); } restart(); }}
          />
        )}

        {tab === 'agendar' && done && (
          <Card className="mx-auto max-w-md p-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600"><PartyPopper className="h-7 w-7" /></div>
            <h2 className="text-3xl font-bold">Tudo certo!</h2>
            <p className="mt-2 text-graphite-600">
              {L.service(done.serviceId).name} com {L.professional(done.professionalId).name}<br />
              <b className="">{fmtLong(done.date)}</b> às <b>{done.start}</b>
            </p>
            <p className="mt-2 text-sm text-graphite-400">Você receberá a confirmação pelo WhatsApp.</p>
            <div className="mt-5 flex flex-col gap-2">
              <Button onClick={() => { setTab('meus'); restart(); }}>Ver meus agendamentos</Button>
              <Button variant="ghost" onClick={restart}>Agendar outro procedimento</Button>
            </div>
          </Card>
        )}

        {tab === 'meus' && (user ? (
          <MyAppointments user={user} onReschedule={(a) => { setReschedule(a); setDone(null); setWizardKey((k) => k + 1); setTab('agendar'); }} onNew={() => setTab('agendar')} />
        ) : (
          <div className="mx-auto max-w-md">
            <p className="mb-3 text-center text-sm text-graphite-600">Entre para ver seus horários e pacotes.</p>
            <AuthPanel onAuth={onAuth} />
          </div>
        ))}
      </main>
    </div>
  );
}
