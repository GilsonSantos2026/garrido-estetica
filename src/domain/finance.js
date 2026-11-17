// Indicadores financeiros. Funções puras sobre as coleções do banco.

const paidIn = (t, from, to) => t.status === 'pago' && t.paidAt >= from && t.paidAt <= to;

export function monthRange(yyyyMm) {
  const [y, m] = yyyyMm.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return [`${yyyyMm}-01`, `${yyyyMm}-${String(last).padStart(2, '0')}`];
}

export function cashSummary(transactions, from, to) {
  const inRange = transactions.filter((t) => paidIn(t, from, to));
  const income = inRange.filter((t) => t.type === 'entrada').reduce((s, t) => s + t.amount, 0);
  const expense = inRange.filter((t) => t.type === 'saida').reduce((s, t) => s + t.amount, 0);
  return { income, expense, balance: income - expense, count: inRange.length };
}

/** Ticket médio = receita de atendimentos concluídos / quantidade (inclui o valor proporcional de pacote). */
export function ticketMedio(db, from, to) {
  const done = db.appointments.filter((a) => a.status === 'concluido' && a.date >= from && a.date <= to);
  if (!done.length) return 0;
  return done.reduce((s, a) => s + recognizedValue(db, a), 0) / done.length;
}

/** Valor reconhecido de um atendimento: o pago avulso, ou a parte proporcional do pacote. */
export function recognizedValue(db, appt) {
  if (appt.clientPackageId) {
    const p = db.clientPackages.find((x) => x.id === appt.clientPackageId);
    return p ? p.pricePaid / p.totalSessions : 0;
  }
  const t = db.transactions.find((x) => x.appointmentId === appt.id);
  return t ? t.amount : appt.price || 0;
}

/** Procedimentos ordenados pela receita reconhecida no período. */
export function topServices(db, from, to) {
  const by = new Map();
  for (const a of db.appointments) {
    if (a.status !== 'concluido' || a.date < from || a.date > to) continue;
    const cur = by.get(a.serviceId) || { serviceId: a.serviceId, count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += recognizedValue(db, a);
    by.set(a.serviceId, cur);
  }
  return [...by.values()].sort((a, b) => b.revenue - a.revenue);
}

/** Entradas pagas por dia do mês, para o gráfico. */
export function dailyIncome(transactions, days) {
  return days.map((d) => ({
    date: d,
    value: transactions.filter((t) => t.type === 'entrada' && t.status === 'pago' && t.paidAt === d).reduce((s, t) => s + t.amount, 0),
  }));
}

export function payables(transactions) {
  return transactions.filter((t) => t.type === 'saida' && t.status === 'pendente').sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
}

export const packageBalance = (p) => p.totalSessions - p.usedSessions;
