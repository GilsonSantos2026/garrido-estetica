import { useState } from 'react';
import { ShieldCheck, FilePlus2, Globe, Building2 } from 'lucide-react';
import { useStore, useLookup } from '../../../store/StoreContext.jsx';
import { Badge, Button, Card, EmptyState, Field, Modal, Select, SignaturePad } from '../../../components/ui.jsx';

export default function ConsentTab({ clientId }) {
  const { db, tryAct } = useStore();
  const L = useLookup();
  const terms = db.consentTerms.filter((t) => t.clientId === clientId).sort((a, b) => b.acceptedAt.localeCompare(a.acceptedAt));
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState('');
  const [signature, setSignature] = useState(null);
  const [view, setView] = useState(null);
  const invasive = db.services.filter((s) => s.requiresConsent);
  const pending = invasive.filter((s) => !terms.some((t) => t.serviceId === s.id) && db.appointments.some((a) => a.clientId === clientId && a.serviceId === s.id && a.status !== 'cancelado'));

  const save = () => {
    if (!signature) return;
    if (tryAct('addConsent', { clientId, serviceId: serviceId || null, signature, acceptedVia: 'clinica' }, 'Termo registrado.')) {
      setOpen(false);
      setSignature(null);
    }
  };
  const fmtStamp = (s) => new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div>
      {pending.length > 0 && (
        <div className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">Termo pendente para: {pending.map((s) => s.name).join(', ')}.</div>
      )}
      <div className="mb-4 flex justify-end"><Button size="sm" icon={FilePlus2} onClick={() => { setServiceId(pending[0]?.id || invasive[0]?.id || ''); setOpen(true); }}>Registrar aceite</Button></div>
      {terms.length ? (
        <Card className="divide-y divide-nude-100">
          {terms.map((t) => (
            <button key={t.id} type="button" onClick={() => setView(t)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-nude-50">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <div><div className="font-medium">{t.serviceId ? L.service(t.serviceId).name : 'Termo geral'}</div><div className="text-xs text-graphite-500">Aceito em {fmtStamp(t.acceptedAt)}</div></div>
              </div>
              <Badge tone={t.acceptedVia === 'portal' ? 'rose' : 'nude'}>{t.acceptedVia === 'portal' ? <><Globe className="h-3 w-3" />portal</> : <><Building2 className="h-3 w-3" />na clínica</>}</Badge>
            </button>
          ))}
        </Card>
      ) : <Card><EmptyState icon={ShieldCheck} title="Nenhum termo registrado">Registre o aceite antes de procedimentos invasivos.</EmptyState></Card>}

      <Modal open={open} onClose={() => setOpen(false)} title="Termo de consentimento" subtitle={L.client(clientId).name}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} disabled={!signature}>Registrar aceite</Button></>}>
        <div className="space-y-4">
          <Field label="Procedimento">
            <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)} options={[{ value: '', label: 'Termo geral (todos os procedimentos)' }, ...db.services.map((s) => ({ value: s.id, label: s.name }))]} />
          </Field>
          <p className="rounded-xl bg-nude-50 p-3 text-sm leading-relaxed text-graphite-700">{db.settings.consentText}</p>
          <Field label="Assinatura do cliente"><SignaturePad onChange={setSignature} /></Field>
        </div>
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title={view?.serviceId ? L.service(view.serviceId).name : 'Termo geral'} subtitle={view && `Aceito em ${fmtStamp(view.acceptedAt)} · ${view.acceptedVia === 'portal' ? 'pelo portal (aceite eletrônico)' : 'na clínica'}`}>
        {view && (
          <>
            <p className="text-sm leading-relaxed text-graphite-700">{view.termText}</p>
            {view.signature ? <img src={view.signature} alt="Assinatura" className="mt-4 h-28 rounded-xl border border-nude-200 bg-nude-50" /> : <p className="mt-4 text-xs text-graphite-400">Aceite registrado sem assinatura desenhada.</p>}
          </>
        )}
      </Modal>
    </div>
  );
}
