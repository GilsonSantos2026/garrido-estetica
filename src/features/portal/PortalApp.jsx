import { useState } from 'react';
import { MapPin, MessageCircle, PartyPopper, CalendarPlus } from 'lucide-react';
import { useStore, useLookup } from '../../store/StoreContext.jsx';
import { brl, fmtLong } from '../../domain/time.js';
import { Button, Card, WhatsAppLink, waLink } from '../../components/ui.jsx';
import BookingWizard from './BookingWizard.jsx';
import { firstName } from '../shared.js';

/** Portal da cliente: só o agendamento pelo link (sem conta, sem senha). */
export default function PortalApp({ preset = {} }) {
  const { db } = useStore();
  const L = useLookup();
  const [done, setDone] = useState(null);
  const [key, setKey] = useState(0);
  const fixedProf = preset.professionalId ? db.professionals.find((p) => p.id === preset.professionalId) : null;
  const contactPhone = fixedProf?.whatsapp || db.settings.whatsapp;

  const restart = () => {
    setDone(null);
    setKey((k) => k + 1);
    window.scrollTo(0, 0);
  };

  return (
    <div className="pb-16">
      <section className="bg-gradient-to-b from-brand-100/70 to-mist-50 px-4 pb-6 pt-7">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm uppercase tracking-[.2em] text-brand-600">Agende online</p>
          <h1 className="mt-1 text-4xl font-bold leading-tight sm:text-5xl">
            {fixedProf ? `Agenda de ${firstName(fixedProf.name)}` : 'Escolha seu horário'}
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-graphite-500">
            {db.settings.address && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{db.settings.address}</span>}
            {contactPhone && (
              <a className="inline-flex items-center gap-1 underline" href={waLink(contactPhone, 'Olá! Gostaria de tirar uma dúvida.')} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />Dúvidas? Fale no WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      <main className="px-4 pt-4">
        {!done ? (
          <BookingWizard key={key} preset={preset} onDone={setDone} />
        ) : (
          <Card className="mx-auto max-w-md p-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600"><PartyPopper className="h-7 w-7" /></div>
            <h2 className="text-3xl font-bold">Horário reservado!</h2>
            <p className="mt-2 text-graphite-600">
              {L.service(done.serviceId).name} com {L.professional(done.professionalId).name}<br />
              <b>{fmtLong(done.date)}</b> às <b>{done.start}</b> · {brl(done.price)}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <WhatsAppLink
                size="lg" className="w-full"
                phone={db.professionals.find((p) => p.id === done.professionalId)?.whatsapp || contactPhone}
                message={`Olá! Sou ${done.clientName}. Acabei de agendar ${L.service(done.serviceId).name} para ${fmtLong(done.date)} às ${done.start}. 💙`}
              >
                Avisar a profissional no WhatsApp
              </WhatsAppLink>
              <Button variant="ghost" icon={CalendarPlus} onClick={restart}>Agendar outro horário</Button>
            </div>
            <p className="mt-4 text-xs text-graphite-400">Precisa remarcar ou cancelar? É só chamar no WhatsApp.</p>
          </Card>
        )}
      </main>
    </div>
  );
}
