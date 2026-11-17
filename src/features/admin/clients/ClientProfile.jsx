import { useState } from 'react';
import { ArrowLeft, CalendarPlus, Pencil, Trash2, AlertTriangle, LayoutGrid, ClipboardList, Images, NotebookPen, ShieldCheck, History, Package, Mail, Cake } from 'lucide-react';
import { useStore, useLookup } from '../../../store/StoreContext.jsx';
import { useAdmin } from '../AdminApp.jsx';
import { PAYMENT_METHODS } from '../../../domain/constants.js';
import { age, brl, fmtBR, todayISO } from '../../../domain/time.js';
import { packageBalance, recognizedValue } from '../../../domain/finance.js';
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, SectionTitle, StatusBadge, Tabs, Textarea, WhatsAppLink } from '../../../components/ui.jsx';
import AnamnesisForm from './AnamnesisForm.jsx';
import Gallery from './Gallery.jsx';
import ConsentTab from './ConsentTab.jsx';
import SessionNotes from './SessionNotes.jsx';

export default function ClientProfile({ id, onBack }) {
  const { db, act, tryAct, notify } = useStore();
  const L = useLookup();
  const nav = useAdmin();
  const [tab, setTab] = useState('resumo');
  const [editing, setEditing] = useState(false);
  const c = db.clients.find((x) => x.id === id);
  const [form, setForm] = useState(c);
  if (!c) return <EmptyState title="Cliente não encontrado" />;

  const an = db.anamneses.find((x) => x.clientId === id);
  const appts = db.appointments.filter((a) => a.clientId === id).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  const next = [...appts].reverse().find((a) => a.date >= todayISO() && ['agendado', 'confirmado'].includes(a.status));
  const done = appts.filter((a) => a.status === 'concluido');
  const spent = done.reduce((s, a) => s + recognizedValue(db, a), 0);
  const pkgs = db.clientPackages.filter((p) => p.clientId === id);
  const photos = db.evolutionPhotos.filter((p) => p.clientId === id);
  const terms = db.consentTerms.filter((t) => t.clientId === id);
  const notes = db.sessionNotes.filter((n) => n.clientId === id);
  const alerts = [an?.allergies && `Alergia: ${an.allergies}`, an?.medications && `Medicamentos: ${an.medications}`, ...(an?.health?.conditions || [])].filter(Boolean);

  const saveEdit = () => {
    if (tryAct('updateClient', { id, name: form.name, whatsapp: form.whatsapp, email: form.email, birthDate: form.birthDate, notes: form.notes }, 'Dados atualizados.')) setEditing(false);
  };
  const remove = () => {
    if (!window.confirm(`Excluir ${c.name} e todo o prontuário (agendamentos, fotos, termos)? O caixa é mantido. Não dá para desfazer.`)) return;
    act.removeClient({ id });
    notify('Cliente excluído.');
    onBack();
  };

  const tabs = [
    { value: 'resumo', label: 'Resumo', icon: LayoutGrid },
    { value: 'anamnese', label: 'Anamnese', icon: ClipboardList },
    { value: 'evolucao', label: 'Antes e depois', icon: Images, count: photos.length },
    { value: 'sessoes', label: 'Sessões', icon: NotebookPen, count: notes.length },
    { value: 'termos', label: 'Termos', icon: ShieldCheck, count: terms.length },
    { value: 'historico', label: 'Histórico', icon: History, count: appts.length },
    { value: 'pacotes', label: 'Pacotes', icon: Package, count: pkgs.length },
  ];

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm text-graphite-500 hover:text-graphite-800"><ArrowLeft className="h-4 w-4" />Clientes</button>

      <Card className="mb-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={c.name} size={60} />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold leading-tight">{c.name}</h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-graphite-500">
              {c.whatsapp && <span>{c.whatsapp}</span>}
              {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{c.email}</span>}
              {c.birthDate && <span className="inline-flex items-center gap-1"><Cake className="h-3.5 w-3.5" />{fmtBR(c.birthDate)} ({age(c.birthDate)} anos)</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <WhatsAppLink phone={c.whatsapp} message={`Olá, ${c.name.split(' ')[0]}! Tudo bem? 💗`} />
            <Button size="sm" icon={CalendarPlus} onClick={() => nav.newAppointment({ clientId: id })}>Agendar</Button>
            <Button size="sm" variant="outline" icon={Pencil} onClick={() => { setForm(c); setEditing(true); }}>Editar</Button>
          </div>
        </div>
        {alerts.length > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{alerts.join(' · ')}</div>
        )}
      </Card>

      <Tabs value={tab} onChange={setTab} options={tabs} />
      <div className="pt-5">
        {tab === 'resumo' && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4"><div className="label">Atendimentos</div><div className="font-serif text-3xl font-bold">{done.length}</div><div className="text-xs text-graphite-500">{appts.filter((a) => a.status === 'faltou').length} faltas</div></Card>
            <Card className="p-4"><div className="label">Total investido</div><div className="font-serif text-3xl font-bold">{brl(spent)}</div><div className="text-xs text-graphite-500">ticket {brl(done.length ? spent / done.length : 0)}</div></Card>
            <Card className="p-4"><div className="label">Próximo horário</div>
              {next ? <button type="button" className="text-left" onClick={() => nav.openAppointment(next.id)}><div className="font-serif text-2xl font-bold">{fmtBR(next.date)} · {next.start}</div><div className="text-xs text-graphite-500">{L.service(next.serviceId).name}</div></button> : <div className="text-sm text-graphite-500">Nada marcado</div>}
            </Card>
            <QuickRecord key={c.id + (an?.updatedAt || '')} client={c} anamnesis={an} />
            <Card className="p-4">
              <div className="label mb-1">Prontuário</div>
              <ul className="space-y-1 text-sm">
                <li>{an ? <Badge tone="green">Anamnese em {fmtBR(an.updatedAt)}</Badge> : <Badge tone="amber">Anamnese pendente</Badge>}</li>
                <li><Badge>{terms.length} termos assinados</Badge></li>
                <li><Badge>{photos.length} fotos de evolução</Badge></li>
              </ul>
            </Card>
          </div>
        )}
        {tab === 'anamnese' && <AnamnesisForm clientId={id} />}
        {tab === 'evolucao' && <Gallery clientId={id} />}
        {tab === 'sessoes' && <SessionNotes clientId={id} />}
        {tab === 'termos' && <ConsentTab clientId={id} />}
        {tab === 'historico' && (
          appts.length ? (
            <Card className="divide-y divide-nude-100">
              {appts.map((a) => (
                <button key={a.id} type="button" onClick={() => nav.openAppointment(a.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-nude-50">
                  <div>
                    <div className="font-medium">{L.service(a.serviceId).name}</div>
                    <div className="text-xs text-graphite-500">{fmtBR(a.date)} · {a.start} · {L.professional(a.professionalId).name}{a.paymentMethod && ` · ${PAYMENT_METHODS[a.paymentMethod]}`}</div>
                  </div>
                  <div className="flex items-center gap-2"><span className="tabular-nums text-graphite-600">{brl(a.price)}</span><StatusBadge status={a.status} /></div>
                </button>
              ))}
            </Card>
          ) : <Card><EmptyState icon={History} title="Sem atendimentos ainda" /></Card>
        )}
        {tab === 'pacotes' && (
          <>
            {pkgs.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {pkgs.map((p) => (
                  <Card key={p.id} className="p-4">
                    <div className="flex justify-between"><b className="font-medium">{L.service(p.serviceId).name}</b><span className="font-serif text-2xl font-bold text-rose-700">{packageBalance(p)}/{p.totalSessions}</span></div>
                    <div className="mt-2 h-2 rounded-full bg-nude-100"><div className="h-2 rounded-full bg-rose-400" style={{ width: `${(p.usedSessions / p.totalSessions) * 100}%` }} /></div>
                    <div className="mt-2 text-xs text-graphite-500">Vendido em {fmtBR(p.soldAt)} por {brl(p.pricePaid)}{p.expiresAt && ` · validade ${fmtBR(p.expiresAt)}`}</div>
                  </Card>
                ))}
              </div>
            ) : <Card><EmptyState icon={Package} title="Nenhum pacote">Venda pacotes no menu Pacotes.</EmptyState></Card>}
          </>
        )}
      </div>

      <div className="mt-8 flex justify-end"><Button variant="danger" size="sm" icon={Trash2} onClick={remove}>Excluir cliente</Button></div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Editar cliente"
        footer={<><Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button><Button onClick={saveEdit}>Salvar</Button></>}>
        {form && (
          <div className="space-y-3">
            <Field label="Nome"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="WhatsApp"><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></Field>
              <Field label="Nascimento"><Input type="date" value={form.birthDate || ''} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} /></Field>
            </div>
            <Field label="E-mail"><Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Observações"><Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** Ficha rápida (tela 3 da prévia): alergias/contraindicações e anotações, editáveis direto no resumo. */
function QuickRecord({ client, anamnesis }) {
  const { tryAct, notify } = useStore();
  const [allergies, setAllergies] = useState(anamnesis?.allergies || '');
  const [notes, setNotes] = useState(client.notes || '');
  const dirty = allergies !== (anamnesis?.allergies || '') || notes !== (client.notes || '');
  const save = () => {
    if (allergies !== (anamnesis?.allergies || '')) {
      const { id: _i, clientId: _c, updatedAt: _u, ...rest } = anamnesis || {};
      tryAct('saveAnamnesis', { clientId: client.id, data: { ...rest, allergies } });
    }
    if (notes !== (client.notes || '')) tryAct('updateClient', { id: client.id, notes });
    notify('Ficha salva.');
  };
  return (
    <Card className="space-y-3 p-4 md:col-span-2">
      <div className="font-serif text-lg font-bold">Ficha de atendimento</div>
      <Field label="Alergias / contraindicações"><Input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Nenhuma informada" /></Field>
      <Field label="Anotações e evolução"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <div className="flex justify-end"><Button size="sm" onClick={save} disabled={!dirty}>Salvar</Button></div>
    </Card>
  );
}
