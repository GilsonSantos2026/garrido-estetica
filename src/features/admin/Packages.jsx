import { useState } from 'react';
import { Package, Plus, ShoppingBag, Pencil } from 'lucide-react';
import { useStore, useLookup } from '../../store/StoreContext.jsx';
import { useAdmin } from './AdminApp.jsx';
import { PAYMENT_METHODS } from '../../domain/constants.js';
import { brl, fmtBR, todayISO } from '../../domain/time.js';
import { packageBalance } from '../../domain/finance.js';
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Tabs } from '../../components/ui.jsx';
import { ClientPicker } from './agenda/AppointmentForm.jsx';

export default function Packages() {
  const { db } = useStore();
  const L = useLookup();
  const nav = useAdmin();
  const [tab, setTab] = useState('vendidos');
  const [selling, setSelling] = useState(false);
  const [plan, setPlan] = useState(null);
  const [filter, setFilter] = useState('ativos');
  const today = todayISO();
  const list = db.clientPackages
    .filter((p) => filter === 'todos' || (packageBalance(p) > 0 && (!p.expiresAt || p.expiresAt >= today)))
    .sort((a, b) => b.soldAt.localeCompare(a.soldAt));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-bold">Pacotes</h1><p className="text-sm text-graphite-500">Sessões são baixadas ao concluir o atendimento com “Abater de pacote”.</p></div>
        <Button icon={ShoppingBag} onClick={() => setSelling(true)}>Vender pacote</Button>
      </div>
      <Tabs value={tab} onChange={setTab} options={[{ value: 'vendidos', label: 'Vendidos', count: db.clientPackages.length }, { value: 'catalogo', label: 'Catálogo', count: db.packagePlans.length }]} />
      <div className="pt-4">
        {tab === 'vendidos' && (
          <>
            <select className="mb-3 rounded-lg border border-nude-300 bg-white px-2 py-1.5 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtro">
              <option value="ativos">Com saldo</option><option value="todos">Todos</option>
            </select>
            {list.length === 0 ? <Card><EmptyState icon={Package} title="Nenhum pacote" /></Card> : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {list.map((p) => {
                  const c = L.client(p.clientId);
                  const bal = packageBalance(p);
                  const used = db.appointments.filter((a) => a.clientPackageId === p.id).sort((a, b) => b.date.localeCompare(a.date));
                  return (
                    <Card key={p.id} className="p-4">
                      <button type="button" onClick={() => nav.openClient(p.clientId)} className="flex items-center gap-2 text-left">
                        <Avatar name={c.name} size={32} /><div><div className="font-medium">{c.name}</div><div className="text-xs text-graphite-500">{L.service(p.serviceId).name}</div></div>
                      </button>
                      <div className="mt-3 flex items-end justify-between">
                        <span className="font-serif text-3xl font-bold text-rose-700">{bal}<span className="text-base text-graphite-400"> de {p.totalSessions}</span></span>
                        {bal === 0 ? <Badge tone="dark">concluído</Badge> : p.expiresAt && p.expiresAt < today ? <Badge tone="red">vencido</Badge> : <Badge tone="green">ativo</Badge>}
                      </div>
                      <div className="mt-2 flex gap-1">{Array.from({ length: p.totalSessions }, (_, i) => <span key={i} className={`h-2 flex-1 rounded-full ${i < p.usedSessions ? 'bg-graphite-300' : 'bg-rose-400'}`} />)}</div>
                      <div className="mt-2 text-xs text-graphite-500">{brl(p.pricePaid)} · {PAYMENT_METHODS[p.paymentMethod] || '—'} · vendido {fmtBR(p.soldAt)}{p.expiresAt && ` · vence ${fmtBR(p.expiresAt)}`}</div>
                      {used.length > 0 && <div className="mt-2 text-xs text-graphite-400">Sessões: {used.map((a) => fmtBR(a.date).slice(0, 5)).join(', ')}</div>}
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
        {tab === 'catalogo' && (
          <>
            <div className="mb-3 flex justify-end"><Button size="sm" variant="soft" icon={Plus} onClick={() => setPlan({ serviceId: db.services[0]?.id, name: '', sessions: 10, price: '', validityDays: 90 })}>Novo pacote</Button></div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {db.packagePlans.map((pp) => {
                const s = L.service(pp.serviceId);
                const full = s.price * pp.sessions;
                return (
                  <Card key={pp.id} className="p-4">
                    <div className="flex items-start justify-between gap-2"><div className="font-medium">{pp.name}</div><button type="button" onClick={() => setPlan(pp)} className="rounded-full p-1 text-graphite-400 hover:bg-nude-100" aria-label="Editar"><Pencil className="h-4 w-4" /></button></div>
                    <div className="mt-2 font-serif text-3xl font-bold">{brl(pp.price)}</div>
                    <div className="text-xs text-graphite-500">{pp.sessions}× {s.name} · {brl(pp.price / pp.sessions)} por sessão{full > pp.price && ` · ${Math.round((1 - pp.price / full) * 100)}% de desconto`}</div>
                    {pp.validityDays && <div className="mt-1 text-xs text-graphite-400">Validade: {pp.validityDays} dias</div>}
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
      {selling && <SellDialog onClose={() => setSelling(false)} />}
      {plan && <PlanDialog plan={plan} onClose={() => setPlan(null)} />}
    </div>
  );
}

function SellDialog({ onClose }) {
  const { db, tryAct } = useStore();
  const [clientId, setClientId] = useState('');
  const [planId, setPlanId] = useState(db.packagePlans[0]?.id || '');
  const [method, setMethod] = useState('pix');
  const plan = db.packagePlans.find((p) => p.id === planId);
  const [price, setPrice] = useState(plan?.price ?? '');
  const sell = () => {
    if (tryAct('sellPackage', { clientId, planId, method, price }, `Pacote vendido · ${brl(price)} lançado no caixa.`)) onClose();
  };
  return (
    <Modal open onClose={onClose} title="Vender pacote" footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={sell} disabled={!clientId}>Vender e lançar no caixa</Button></>}>
      <div className="space-y-3">
        <ClientPicker value={clientId} onChange={setClientId} />
        <Field label="Pacote"><Select value={planId} onChange={(e) => { setPlanId(e.target.value); setPrice(db.packagePlans.find((p) => p.id === e.target.value)?.price ?? ''); }} options={db.packagePlans.map((p) => ({ value: p.id, label: `${p.name} · ${brl(p.price)}` }))} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Valor cobrado (R$)"><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
          <Field label="Pagamento"><Select value={method} onChange={(e) => setMethod(e.target.value)} options={Object.entries(PAYMENT_METHODS).filter(([k]) => k !== 'pacote').map(([value, label]) => ({ value, label }))} /></Field>
        </div>
      </div>
    </Modal>
  );
}

function PlanDialog({ plan, onClose }) {
  const { db, tryAct } = useStore();
  const [f, setF] = useState(plan);
  const save = () => {
    if (tryAct('savePackagePlan', f, 'Pacote salvo.')) onClose();
  };
  return (
    <Modal open onClose={onClose} title={plan.id ? 'Editar pacote' : 'Novo pacote'} footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
      <div className="space-y-3">
        <Field label="Procedimento"><Select value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value })} options={db.services.map((s) => ({ value: s.id, label: s.name }))} /></Field>
        <Field label="Nome"><Input placeholder="Ex.: Drenagem – 10 sessões" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Sessões"><Input type="number" min="1" value={f.sessions} onChange={(e) => setF({ ...f, sessions: e.target.value })} /></Field>
          <Field label="Preço (R$)"><Input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
          <Field label="Validade (dias)"><Input type="number" value={f.validityDays || ''} onChange={(e) => setF({ ...f, validityDays: e.target.value })} /></Field>
        </div>
      </div>
    </Modal>
  );
}
