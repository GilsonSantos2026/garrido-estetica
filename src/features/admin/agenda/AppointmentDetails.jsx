import { Check, PlayCircle, CircleCheckBig, UserX, XCircle, CalendarClock, ClipboardList, AlertTriangle, ShieldAlert, Package, Globe, Building2, RotateCcw } from 'lucide-react';
import { useStore, useLookup } from '../../../store/StoreContext.jsx';
import { useAdmin } from '../AdminApp.jsx';
import { hasConsent, usablePackages } from '../../../store/actions.js';
import { PAYMENT_METHODS, STATUS_FLOW } from '../../../domain/constants.js';
import { brl, fmtLong, fmtDuration, toMin } from '../../../domain/time.js';
import { packageBalance } from '../../../domain/finance.js';
import { Avatar, Button, Modal, StatusBadge, WhatsAppLink, cx } from '../../../components/ui.jsx';
import { msgConfirm, msgReminder } from '../../shared.js';

export default function AppointmentDetails({ id, onClose }) {
  const { db, tryAct } = useStore();
  const L = useLookup();
  const nav = useAdmin();
  const a = db.appointments.find((x) => x.id === id);
  if (!a) return null;
  const c = L.client(a.clientId);
  const s = L.service(a.serviceId);
  const p = L.professional(a.professionalId);
  const an = db.anamneses.find((x) => x.clientId === a.clientId);
  const alerts = [an?.allergies && `Alergia: ${an.allergies}`, ...(an?.health?.conditions || [])].filter(Boolean);
  const missingConsent = s.requiresConsent && !hasConsent(db, a.clientId, a.serviceId);
  const pkgs = usablePackages(db, a);
  const final = ['concluido', 'faltou', 'cancelado'].includes(a.status);
  const stepIdx = STATUS_FLOW.indexOf(a.status);
  const setStatus = (status, msg) => tryAct('setAppointmentStatus', { id, status }, msg);
  const clinic = db.settings.clinicName;

  return (
    <Modal open onClose={onClose} title={c.name} subtitle={`${s.name} · ${fmtDuration(toMin(a.end) - toMin(a.start))}`}
      footer={
        <>
          <Button variant="ghost" size="sm" icon={ClipboardList} onClick={() => nav.openClient(a.clientId)}>Ficha do cliente</Button>
          {!final && <Button variant="outline" size="sm" icon={CalendarClock} onClick={() => nav.reschedule(a)}>Remarcar</Button>}
        </>
      }>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Quando"><span className="">{fmtLong(a.date)}</span><br />{a.start} – {a.end}</Info>
          <Info label="Profissional"><span className="inline-flex items-center gap-1.5"><Avatar name={p.name} color={p.color} size={22} />{p.name}</span></Info>
          <Info label="Valor">{brl(a.price)}{a.paymentMethod && <span className="text-graphite-500"> · {PAYMENT_METHODS[a.paymentMethod]}</span>}</Info>
          <Info label="Origem">
            <span className="inline-flex items-center gap-1">{a.source === 'online' ? <><Globe className="h-4 w-4 text-brand-500" />Portal do cliente</> : <><Building2 className="h-4 w-4" />Clínica</>}</span>
          </Info>
        </div>

        {a.notes && <p className="rounded-xl bg-mist-50 p-3 text-sm text-graphite-600">“{a.notes}”</p>}

        {(alerts.length > 0 || missingConsent || (pkgs.length > 0 && !final)) && (
          <div className="space-y-2">
            {alerts.length > 0 && <Alert icon={AlertTriangle} tone="red">{alerts.join(' · ')}</Alert>}
            {missingConsent && <Alert icon={ShieldAlert} tone="amber">Procedimento invasivo sem termo de consentimento registrado. <button type="button" className="underline" onClick={() => nav.openClient(a.clientId)}>Registrar na ficha</button></Alert>}
            {pkgs.length > 0 && !final && <Alert icon={Package} tone="rose">Tem pacote: {packageBalance(pkgs[0])} sessões restantes de {s.name}.</Alert>}
          </div>
        )}

        {/* Fluxo de status */}
        <div>
          <div className="label mb-2 flex items-center justify-between">Status <StatusBadge status={a.status} /></div>
          <div className="mb-3 flex gap-1">
            {STATUS_FLOW.map((st, i) => <div key={st} className={cx('h-1.5 flex-1 rounded-full', i <= stepIdx ? 'bg-brand-400' : 'bg-mist-200')} />)}
          </div>
          {!final ? (
            <div className="flex flex-wrap gap-2">
              {a.status === 'agendado' && <Button size="sm" variant="soft" icon={Check} onClick={() => setStatus('confirmado', 'Horário confirmado.')}>Confirmar</Button>}
              {a.status !== 'em_atendimento' && <Button size="sm" variant="soft" icon={PlayCircle} onClick={() => setStatus('em_atendimento', 'Atendimento iniciado.')}>Iniciar atendimento</Button>}
              <Button size="sm" variant="dark" icon={CircleCheckBig} onClick={() => nav.complete(a.id)}>Concluir e receber</Button>
              <Button size="sm" variant="danger" icon={UserX} onClick={() => setStatus('faltou', 'Marcado como falta.')}>Faltou</Button>
              <Button size="sm" variant="danger" icon={XCircle} onClick={() => window.confirm('Cancelar este agendamento?') && setStatus('cancelado', 'Agendamento cancelado.')}>Cancelar</Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" icon={RotateCcw}
              onClick={() => window.confirm(a.status === 'concluido' ? 'Reabrir? O lançamento no caixa (ou a sessão do pacote) será desfeito.' : 'Reabrir este agendamento?') && setStatus('agendado', 'Agendamento reaberto.')}>
              Reabrir
            </Button>
          )}
        </div>

        {!final && c.whatsapp && (
          <div>
            <div className="label mb-2">WhatsApp em 1 clique</div>
            <div className="flex flex-wrap gap-2">
              <WhatsAppLink phone={c.whatsapp} message={msgConfirm(clinic, c, s, a)}>Pedir confirmação</WhatsAppLink>
              <WhatsAppLink phone={c.whatsapp} message={msgReminder(clinic, c, s, a)}>Enviar lembrete</WhatsAppLink>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

const Info = ({ label, children }) => (
  <div className="rounded-xl bg-mist-50 p-3"><div className="label">{label}</div><div className="text-graphite-800">{children}</div></div>
);

function Alert({ icon: Icon, tone, children }) {
  const tones = { red: 'bg-red-50 text-red-800', amber: 'bg-amber-50 text-amber-900', rose: 'bg-brand-50 text-brand-800' };
  return <div className={cx('flex items-start gap-2 rounded-xl px-3 py-2 text-sm', tones[tone])}><Icon className="mt-0.5 h-4 w-4 shrink-0" />{children}</div>;
}
