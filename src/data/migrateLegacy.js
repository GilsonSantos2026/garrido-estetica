// Converte os dados do app v1 (www/index.html antigo, chave "bella-estetica-v1") para o modelo v2.
// Roda uma única vez, quando o app novo abre num aparelho que já tinha o antigo.
import { emptyDb } from './seed.js';
import { endTime } from '../domain/availability.js';
import { todayISO } from '../domain/time.js';

export const LEGACY_KEY = 'bella-estetica-v1';

export function migrateLegacy(old) {
  const db = emptyDb();
  const now = new Date().toISOString();
  const today = todayISO();

  db.services = (old.services || []).map((s) => ({
    id: s.id, name: s.nome, category: '', description: '', price: Number(s.preco) || 0,
    durationMin: Number(s.dur) || 60, requiresConsent: /peeling|microagulh/i.test(s.nome || ''), active: true,
  }));
  db.professionals = [{ id: 'p1', name: 'Profissional', title: 'Esteticista', color: '#bd7765', serviceIds: db.services.map((s) => s.id), active: true }];
  const svc = (id) => db.services.find((s) => s.id === id) || { durationMin: 60, price: 0, name: 'Procedimento' };

  for (const c of old.clients || []) {
    const an = c.an || {};
    db.clients.push({ id: c.id, name: c.nome, whatsapp: c.tel || '', email: '', birthDate: an.nasc || '', notes: c.notes || c.notas || '', createdAt: today });
    if (c.an || c.alergias) {
      db.anamneses.push({
        id: `an-${c.id}`, clientId: c.id, updatedAt: an.date || today,
        mainComplaint: an.queixa || '', goal: an.obj || '',
        health: { conditions: an.ch || [], surgeries: '', pregnant: '', notes: an.prof ? `Profissão: ${an.prof}` : '' },
        allergies: c.alergias || '', medications: an.med || '',
        habits: { smoke: an.fuma || '', alcohol: an.alc || '', water: an.agua || '', activity: an.ativ || '', sleep: '', sunscreen: an.sol || '', homeCare: an.casa || '', previousProcedures: an.prev || '' },
        facialEval: { skinType: an.pele || '', phototype: an.foto || '', complaints: an.qx || [], notes: '' },
        bodyEval: { weight: '', height: '', waist: '', hip: '', abdomen: '', complaints: [], notes: '' },
      });
    }
    if (an.sig) {
      db.consentTerms.push({ id: `ct-${c.id}`, clientId: c.id, serviceId: null, appointmentId: null, termText: 'Termo de consentimento assinado no app anterior.', signature: an.sig, acceptedAt: `${an.date || today}T12:00:00`, acceptedVia: 'clinica' });
    }
    for (const r of c.reg || []) {
      db.sessionNotes.push({ id: r.id, clientId: c.id, appointmentId: null, serviceId: r.s, date: r.d, protocol: '', text: r.txt || '', reactions: r.obs || '' });
    }
  }

  for (const p of old.pacotes || []) {
    db.clientPackages.push({ id: p.id, clientId: p.c, packagePlanId: null, serviceId: p.s, totalSessions: p.total, usedSessions: p.usadas, pricePaid: Number(p.preco) || 0, paymentMethod: null, soldAt: p.d, expiresAt: null });
    db.transactions.push({ id: `t-${p.id}`, type: 'entrada', category: 'pacote', description: `Pacote ${p.total}× ${svc(p.s).name}`, amount: Number(p.preco) || 0, method: null, status: 'pago', dueDate: p.d, paidAt: p.d, appointmentId: null, clientPackageId: p.id, createdAt: now });
  }

  const statusMap = { agendado: 'agendado', confirmado: 'confirmado', concluido: 'concluido', cancelado: 'cancelado', faltou: 'faltou' };
  for (const a of old.appts || []) {
    const s = svc(a.s);
    const appt = {
      id: a.id, clientId: a.c, professionalId: 'p1', serviceId: a.s, date: a.d, start: a.h, end: endTime(a.h, s.durationMin),
      status: statusMap[a.st] || 'agendado', source: 'interno', price: s.price, clientPackageId: a.pacote || null,
      paymentMethod: a.pacote ? 'pacote' : null, notes: '', createdAt: now, cancelledAt: null,
    };
    db.appointments.push(appt);
    if (appt.status === 'concluido' && !a.pacote) {
      db.transactions.push({ id: `t-${a.id}`, type: 'entrada', category: 'atendimento', description: s.name, amount: s.price, method: null, status: 'pago', dueDate: a.d, paidAt: a.d, appointmentId: a.id, clientPackageId: null, professionalId: 'p1', createdAt: now });
    }
  }

  for (const w of old.wait || []) {
    db.waitlist.push({ id: w.id, clientId: null, name: w.nome, whatsapp: w.tel || '', serviceId: w.s, preferredPeriod: 'Qualquer horário', notes: w.obs || '', createdAt: now });
  }
  for (const x of old.desp || []) {
    db.transactions.push({ id: x.id, type: 'saida', category: 'Outros', description: x.desc, amount: Number(x.v) || 0, method: null, status: 'pago', dueDate: x.d, paidAt: x.d, appointmentId: null, clientPackageId: null, createdAt: now });
  }
  return db;
}
