import { useState } from 'react';
import { Hourglass, Package, BarChart3, Settings, Send, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/StoreContext.jsx';
import { useAdmin } from './AdminApp.jsx';
import { packageBalance } from '../../domain/finance.js';
import { Card } from '../../components/ui.jsx';
import ShareAgenda from './ShareAgenda.jsx';

/** "Mais": tudo que não é do dia a dia, num lugar só. */
export default function MorePage() {
  const { db } = useStore();
  const nav = useAdmin();
  const [sharing, setSharing] = useState(false);
  const activePkgs = db.clientPackages.filter((p) => packageBalance(p) > 0).length;
  const items = [
    { id: 'share', icon: Send, title: 'Enviar minha agenda', text: 'Link para a cliente escolher o horário pelo WhatsApp', onClick: () => setSharing(true), highlight: true },
    { id: 'espera', icon: Hourglass, title: 'Lista de espera', text: db.waitlist.length ? `${db.waitlist.length} pessoa(s) aguardando encaixe` : 'Interessadas em encaixe quando abrir vaga' },
    { id: 'pacotes', icon: Package, title: 'Pacotes', text: activePkgs ? `${activePkgs} pacote(s) com sessões disponíveis` : 'Vender pacotes de sessões e acompanhar o saldo' },
    { id: 'dados', icon: BarChart3, title: 'Relatórios', text: 'Ticket médio, faltas e procedimentos que mais rendem' },
    { id: 'config', icon: Settings, title: 'Ajustes', text: 'Horários, procedimentos, preços, equipe e termo' },
  ];
  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Mais</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <Card key={it.id} className={it.highlight ? 'border-brand-200 bg-brand-50' : ''}>
            <button type="button" onClick={it.onClick || (() => nav.go(it.id))} className="flex w-full items-center gap-4 p-4 text-left">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${it.highlight ? 'bg-[#15803d] text-white' : 'bg-brand-100 text-brand-600'}`}><it.icon className="h-5 w-5" strokeWidth={1.8} /></span>
              <span className="min-w-0 flex-1"><span className="block font-semibold text-graphite-900">{it.title}</span><span className="block text-sm text-graphite-500">{it.text}</span></span>
              <ChevronRight className="h-5 w-5 shrink-0 text-graphite-300" />
            </button>
          </Card>
        ))}
      </div>
      {sharing && <ShareAgenda onClose={() => setSharing(false)} />}
    </div>
  );
}
