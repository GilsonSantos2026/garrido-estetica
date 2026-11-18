import { useState } from 'react';
import { TrendingUp, CalendarCheck, Receipt, Scale, Plus, ArrowDownLeft, ArrowUpRight, CheckCheck, Trash2, AlertCircle } from 'lucide-react';
import { useStore, useLookup } from '../../store/StoreContext.jsx';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../../domain/constants.js';
import { brl, daysOfMonth, fmtBR, fmtMonth, todayISO } from '../../domain/time.js';
import { cashSummary, dailyIncome, monthRange, payables, ticketMedio, topServices } from '../../domain/finance.js';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Segmented, Select, Stat, Tabs, cx } from '../../components/ui.jsx';
import { DailyBars, RankBars } from '../../components/charts.jsx';
import { shiftMonth } from '../../components/MonthCalendar.jsx';

export default function Finance() {
  const { db, tryAct } = useStore();
  const L = useLookup();
  const today = todayISO();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [tab, setTab] = useState('caixa');
  const [flow, setFlow] = useState('todos');
  const [adding, setAdding] = useState(false);
  const [from, to] = monthRange(month);

  const day = cashSummary(db.transactions, today, today);
  const mon = cashSummary(db.transactions, from, to);
  const ticket = ticketMedio(db, from, to);
  const doneCount = db.appointments.filter((a) => a.status === 'concluido' && a.date >= from && a.date <= to).length;
  const top = topServices(db, from, to);
  const daily = dailyIncome(db.transactions, daysOfMonth(month));
  const toPay = payables(db.transactions);
  const overdue = toPay.filter((t) => t.dueDate < today);
  const byMethod = Object.entries(PAYMENT_METHODS).filter(([k]) => k !== 'pacote').map(([k, label]) => ({
    label, value: db.transactions.filter((t) => t.type === 'entrada' && t.status === 'pago' && t.method === k && t.paidAt >= from && t.paidAt <= to).reduce((s, t) => s + t.amount, 0),
  }));
  const movements = db.transactions
    .filter((t) => t.status === 'pago' && t.paidAt >= from && t.paidAt <= to && (flow === 'todos' || t.type === flow))
    .sort((a, b) => (b.paidAt + b.createdAt).localeCompare(a.paidAt + a.createdAt));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-bold">Caixa</h1><p className="text-sm text-graphite-500">{fmtMonth(month)}</p></div>
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="rounded-lg border border-mist-300 bg-white px-2 py-1.5 text-sm" aria-label="Mês" />
          <Button icon={Plus} onClick={() => setAdding(true)}><span className="sm:hidden">Despesa</span><span className="hidden sm:inline">Lançar despesa</span></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Receitas" value={brl(mon.income)} hint={`atendimentos e pacotes · hoje ${brl(day.income)}`} icon={TrendingUp} tone="green" valueClass="text-emerald-700" />
        <Stat label="Despesas" value={brl(mon.expense)} hint={`${toPay.length} contas a pagar`} icon={Receipt} tone="red" valueClass="text-red-600" />
        <Stat label="Resultado do mês" value={brl(mon.balance)} hint={`${doneCount} atendimentos concluídos`} icon={Scale} tone={mon.balance >= 0 ? 'dark' : 'red'} />
        <Stat label="Ticket médio" value={brl(ticket)} hint="por atendimento (inclui pacotes)" icon={CalendarCheck} tone="amber" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-4"><DailyBars data={daily} label="Entradas por dia (R$)" /></Card>
        <Card className="p-4">
          <div className="mb-3 text-xs text-graphite-500">Procedimentos mais lucrativos · receita reconhecida</div>
          {top.length ? <RankBars items={top.slice(0, 6).map((t) => ({ label: L.service(t.serviceId).name, value: t.revenue, detail: `${t.count}×` }))} /> : <p className="text-sm text-graphite-500">Nenhum atendimento concluído no mês.</p>}
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <div className="mb-2 text-xs text-graphite-500">Recebido por forma de pagamento</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {byMethod.map((m) => <div key={m.label} className="rounded-xl bg-mist-50 p-3"><div className="text-xs text-graphite-500">{m.label}</div><div className="font-semibold tabular-nums">{brl(m.value)}</div></div>)}
        </div>
      </Card>

      <div className="mt-6">
        <Tabs value={tab} onChange={setTab} options={[{ value: 'caixa', label: 'Fluxo de caixa' }, { value: 'pagar', label: 'Contas a pagar', count: toPay.length }]} />
        <div className="pt-4">
          {tab === 'caixa' && (
            <>
              <Segmented size="sm" className="mb-3" value={flow} onChange={setFlow} options={[{ value: 'todos', label: 'Tudo' }, { value: 'entrada', label: 'Entradas' }, { value: 'saida', label: 'Saídas' }]} />
              {movements.length ? (
                <Card className="divide-y divide-mist-100">
                  {movements.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span className={cx('rounded-full p-1.5', t.type === 'entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')}>
                        {t.type === 'entrada' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{t.description}{t.appointmentId && ` · ${L.client(db.appointments.find((a) => a.id === t.appointmentId)?.clientId).name}`}</div>
                        <div className="text-xs text-graphite-500">{fmtBR(t.paidAt)} · {t.type === 'entrada' ? INCOME_CATEGORIES[t.category] || t.category : t.category}{t.method && ` · ${PAYMENT_METHODS[t.method]}`}</div>
                      </div>
                      <span className={cx('font-semibold tabular-nums', t.type === 'entrada' ? 'text-emerald-700' : 'text-red-600')}>{t.type === 'entrada' ? '+' : '−'}{brl(t.amount)}</span>
                      {t.type === 'saida' && <button type="button" onClick={() => window.confirm('Excluir este lançamento?') && tryAct('removeRow', { table: 'transactions', id: t.id }, 'Lançamento excluído.')} className="rounded-full p-1 text-graphite-300 hover:bg-mist-100 hover:text-graphite-600" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  ))}
                </Card>
              ) : <Card><EmptyState icon={Receipt} title="Sem movimentações neste mês" /></Card>}
            </>
          )}
          {tab === 'pagar' && (
            <>
              {overdue.length > 0 && <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800"><AlertCircle className="h-4 w-4" />{overdue.length} conta(s) vencida(s): {brl(overdue.reduce((s, t) => s + t.amount, 0))}</div>}
              {toPay.length ? (
                <Card className="divide-y divide-mist-100">
                  {toPay.map((t) => (
                    <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                      <div className="min-w-0 flex-1"><div className="font-medium">{t.description}</div><div className="text-xs text-graphite-500">{t.category} · vence {fmtBR(t.dueDate)}</div></div>
                      {t.dueDate < today ? <Badge tone="red">vencida</Badge> : t.dueDate === today ? <Badge tone="amber">vence hoje</Badge> : null}
                      <span className="font-semibold tabular-nums">{brl(t.amount)}</span>
                      <Button size="sm" variant="soft" icon={CheckCheck} onClick={() => tryAct('markPaid', { id: t.id }, 'Conta marcada como paga.')}>Paguei</Button>
                    </div>
                  ))}
                </Card>
              ) : <Card><EmptyState icon={CheckCheck} title="Nenhuma conta pendente" /></Card>}
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-between text-xs text-graphite-400">
        <button type="button" className="underline" onClick={() => setMonth(shiftMonth(month, -1))}>← mês anterior</button>
        <button type="button" className="underline" onClick={() => setMonth(shiftMonth(month, 1))}>próximo mês →</button>
      </div>

      {adding && <ExpenseDialog onClose={() => setAdding(false)} />}
    </div>
  );
}

function ExpenseDialog({ onClose }) {
  const { tryAct } = useStore();
  const [f, setF] = useState({ description: '', category: EXPENSE_CATEGORIES[0], amount: '', dueDate: todayISO(), paid: true, method: 'pix' });
  const save = () => {
    if (tryAct('addExpense', f, f.paid ? 'Despesa lançada no caixa.' : 'Conta a pagar registrada.')) onClose();
  };
  return (
    <Modal open onClose={onClose} title="Nova despesa" footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
      <div className="space-y-3">
        <Segmented value={f.paid ? 'paga' : 'pagar'} onChange={(v) => setF({ ...f, paid: v === 'paga' })} options={[{ value: 'paga', label: 'Já paga' }, { value: 'pagar', label: 'A pagar' }]} />
        <Field label="Descrição"><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Ex.: Ácido mandélico, aluguel de dezembro" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Categoria"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={EXPENSE_CATEGORIES} /></Field>
          <Field label="Valor (R$)"><Input type="number" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label={f.paid ? 'Data do pagamento' : 'Vencimento'}><Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
          {f.paid && <Field label="Pago com"><Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} options={Object.entries(PAYMENT_METHODS).filter(([k]) => k !== 'pacote').map(([value, label]) => ({ value, label }))} /></Field>}
        </div>
      </div>
    </Modal>
  );
}
