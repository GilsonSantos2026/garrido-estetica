import { useState } from 'react';
import { Search, UserPlus, AlertTriangle, Package, ClipboardX, Globe } from 'lucide-react';
import { useStore } from '../../../store/StoreContext.jsx';
import { useAdmin } from '../AdminApp.jsx';
import { age, fmtBR } from '../../../domain/time.js';
import { packageBalance } from '../../../domain/finance.js';
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal } from '../../../components/ui.jsx';

export default function Clients() {
  const { db, tryAct } = useStore();
  const nav = useAdmin();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [nc, setNc] = useState({ name: '', whatsapp: '', email: '', birthDate: '' });
  const term = q.trim().toLowerCase();
  const list = db.clients
    .filter((c) => !term || c.name.toLowerCase().includes(term) || c.whatsapp.includes(term) || (c.email || '').includes(term))
    .sort((a, b) => a.name.localeCompare(b.name));

  const create = () => {
    const c = tryAct('createClient', nc, 'Cliente cadastrado.');
    if (c) {
      setAdding(false);
      setNc({ name: '', whatsapp: '', email: '', birthDate: '' });
      nav.openClient(c.id);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-bold">Clientes</h1><p className="text-sm text-graphite-500">{db.clients.length} cadastrados · prontuário e evolução</p></div>
        <Button icon={UserPlus} onClick={() => setAdding(true)}>Novo cliente</Button>
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-graphite-400" />
        <input className="input pl-9" placeholder="Buscar por nome, telefone ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length === 0 ? <Card><EmptyState icon={Search} title="Nenhum cliente encontrado" /></Card> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const an = db.anamneses.find((x) => x.clientId === c.id);
            const appts = db.appointments.filter((a) => a.clientId === c.id && a.status === 'concluido').sort((a, b) => b.date.localeCompare(a.date));
            const pkg = db.clientPackages.filter((p) => p.clientId === c.id && packageBalance(p) > 0);
            const portal = !!c.userId || db.users.some((u) => u.clientId === c.id);
            const risk = an && (an.allergies || an.health?.conditions?.length);
            return (
              <button key={c.id} type="button" onClick={() => nav.openClient(c.id)} className="card p-4 text-left transition hover:border-brand-300 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} size={42} />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="text-xs text-graphite-500">{c.whatsapp || 'sem telefone'}{age(c.birthDate) !== null && ` · ${age(c.birthDate)} anos`}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge>{appts.length} visitas{appts[0] && ` · última ${fmtBR(appts[0].date)}`}</Badge>
                  {!an && <Badge tone="amber"><ClipboardX className="h-3 w-3" />anamnese pendente</Badge>}
                  {risk && <Badge tone="red"><AlertTriangle className="h-3 w-3" />atenção</Badge>}
                  {pkg.length > 0 && <Badge tone="rose"><Package className="h-3 w-3" />pacote ativo</Badge>}
                  {portal && <Badge tone="green"><Globe className="h-3 w-3" />portal</Badge>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Novo cliente"
        footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button><Button onClick={create}>Salvar</Button></>}>
        <div className="space-y-3">
          <Field label="Nome"><Input value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="WhatsApp"><Input inputMode="tel" value={nc.whatsapp} onChange={(e) => setNc({ ...nc, whatsapp: e.target.value })} /></Field>
            <Field label="Nascimento"><Input type="date" value={nc.birthDate} onChange={(e) => setNc({ ...nc, birthDate: e.target.value })} /></Field>
          </div>
          <Field label="E-mail"><Input type="email" value={nc.email} onChange={(e) => setNc({ ...nc, email: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
