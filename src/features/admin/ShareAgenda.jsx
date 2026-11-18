import { useState } from 'react';
import { Copy, Send, Info } from 'lucide-react';
import { useStore, useLookup } from '../../store/StoreContext.jsx';
import { Button, Field, Modal, Select, waLink } from '../../components/ui.jsx';
import { bookingLink, msgAgendaLink } from '../shared.js';

/**
 * "Enviar minha agenda": monta o link de agendamento e abre o WhatsApp com a mensagem pronta.
 * Com cliente → abre a conversa dela. Sem cliente → o WhatsApp pergunta para quem enviar.
 */
export default function ShareAgenda({ client = null, onClose }) {
  const { db, notify, backendKind } = useStore();
  const L = useLookup();
  const profs = db.professionals.filter((p) => p.active);
  const [professionalId, setProfessionalId] = useState(profs.length === 1 ? profs[0].id : (profs[0]?.id || ''));
  const [serviceId, setServiceId] = useState('');
  const prof = professionalId ? L.professional(professionalId) : null;
  const services = db.services.filter((s) => s.active && (!professionalId || (prof?.serviceIds || []).includes(s.id)));
  const link = bookingLink({ professionalId: profs.length > 1 ? professionalId : null, serviceId: serviceId || null });
  const message = msgAgendaLink({ clinic: db.settings.clinicName, professional: prof, service: serviceId ? L.service(serviceId) : null, client, link });
  const waHref = client?.whatsapp ? waLink(client.whatsapp, message) : `https://wa.me/?text=${encodeURIComponent(message)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      notify('Link copiado. Cole onde quiser (WhatsApp, Instagram, status…).');
    } catch {
      notify('Não foi possível copiar automaticamente. Selecione o link e copie.', 'error');
    }
  };

  return (
    <Modal open onClose={onClose} title="Enviar minha agenda" subtitle={client ? `Para ${client.name}` : 'A cliente escolhe o horário pelo link, sem cadastro'}
      footer={<><Button variant="outline" icon={Copy} onClick={copy}>Copiar link</Button><a href={waHref} target="_blank" rel="noopener noreferrer" onClick={onClose} className="inline-flex items-center gap-2 rounded-xl bg-[#15803d] px-4 py-2.5 text-[15px] font-medium text-white hover:bg-[#126b33]"><Send className="h-[18px] w-[18px]" />Enviar pelo WhatsApp</a></>}>
      <div className="space-y-3">
        {profs.length > 1 && (
          <Field label="Agenda de">
            <Select value={professionalId} onChange={(e) => { setProfessionalId(e.target.value); setServiceId(''); }} options={profs.map((p) => ({ value: p.id, label: p.name }))} />
          </Field>
        )}
        <Field label="Procedimento (opcional)" hint="Escolha um para a cliente já cair direto no calendário dele.">
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)} options={[{ value: '', label: 'A cliente escolhe' }, ...services.map((s) => ({ value: s.id, label: s.name }))]} />
        </Field>
        <div>
          <div className="label">Mensagem</div>
          <p className="rounded-xl border border-mist-200 bg-mist-50 p-3 text-sm text-graphite-700">{message}</p>
        </div>
        {backendKind === 'local' && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />Modo de teste: o horário que a cliente marcar fica salvo só no aparelho dela. Com o banco de dados ligado no site, ele aparece na sua agenda na hora.
          </p>
        )}
      </div>
    </Modal>
  );
}
