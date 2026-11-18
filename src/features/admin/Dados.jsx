import { useState } from 'react';
import { Users, CalendarCheck, Receipt, UserX, Settings, RotateCcw } from 'lucide-react';
import { useStore, useLookup } from '../../store/StoreContext.jsx';
import { useAdmin } from './AdminApp.jsx';
import { brl, fmtMonth, todayISO } from '../../domain/time.js';
import { monthRange, ticketMedio, topServices } from '../../domain/finance.js';
import { Button, Card, SectionTitle, Stat } from '../../components/ui.jsx';
import { RankBars } from '../../components/charts.jsx';
import { Services } from './Settings.jsx';

/** "Dados e procedimentos": entenda o que mais rende (tela 7 da prévia). */
export default function Dados() {
  const { db, act, backendKind } = useStore();
  const L = useLookup();
  const nav = useAdmin();
  const today = todayISO();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [from, to] = monthRange(month);
  const last = to < today ? to : today;

  const inMonth = db.appointments.filter((a) => a.date >= from && a.date <= last && a.clientId);
  const done = inMonth.filter((a) => a.status === 'concluido');
  const missed = inMonth.filter((a) => ['faltou', 'cancelado'].includes(a.status));
  const missRate = inMonth.length ? Math.round((missed.length / inMonth.length) * 100) : 0;
  const newClients = db.clients.filter((c) => (c.createdAt || '').slice(0, 7) === month).length;
  const top = topServices(db, from, to);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl">Relatórios</h1><p className="text-sm text-graphite-500">Entenda o que mais rende · {fmtMonth(month)}</p></div>
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="rounded-lg border border-mist-300 bg-white px-2 py-1.5 text-sm" aria-label="Mês" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Clientes" value={db.clients.length} hint={`${newClients} ${newClients === 1 ? "novo" : "novos"} no mês`} icon={Users} />
        <Stat label="Atendimentos" value={done.length} hint="concluídos no mês" icon={CalendarCheck} tone="green" />
        <Stat label="Ticket médio" value={brl(ticketMedio(db, from, to))} hint="inclui sessões de pacote" icon={Receipt} tone="amber" />
        <Stat label="Faltas + cancelamentos" value={`${missRate}%`} hint={`${missed.length} de ${inMonth.length} agendamentos`} icon={UserX} tone={missRate > 15 ? 'red' : 'dark'} />
      </div>

      <SectionTitle>Procedimentos mais rentáveis</SectionTitle>
      <Card className="p-4">
        {top.length
          ? <RankBars items={top.map((t) => ({ label: L.service(t.serviceId).name, value: t.revenue, detail: `${t.count}×` }))} />
          : <p className="text-sm text-graphite-500">Conclua atendimentos para ver estatísticas.</p>}
      </Card>

      <SectionTitle>Procedimentos</SectionTitle>
      <Services />

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="font-semibold">Configurações da clínica</div>
          <div className="text-sm text-graphite-500">Horário de funcionamento, regras da agenda, equipe e termo de consentimento.</div>
        </div>
        <Button variant="outline" icon={Settings} onClick={() => nav.go('config')}>Abrir ajustes</Button>
      </Card>

      {backendKind === 'local' && (
        <p className="mt-4 text-sm text-graphite-500">
          Os dados ficam salvos neste navegador.{' '}
          <button type="button" className="inline-flex items-center gap-1 text-red-600 underline" onClick={() => window.confirm('Apagar tudo e voltar aos dados de exemplo?') && act.reset()}>
            <RotateCcw className="h-3.5 w-3.5" />Restaurar dados de exemplo
          </button>
        </p>
      )}
    </div>
  );
}
