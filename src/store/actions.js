// Regras de negócio. Cada ação é pura: recebe o banco atual e argumentos e devolve
// { ops, result }. Quem grava é o repositório (localStorage hoje, Supabase amanhã).
// Erros de validação lançam AppError com mensagem pronta para mostrar ao usuário.
import { findConflict, endTime } from '../domain/availability.js';
import { minutesUntil, todayISO } from '../domain/time.js';
import { packageBalance } from '../domain/finance.js';

export class AppError extends Error {}

export const uid = () =>
  (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

const nowStamp = () => new Date().toISOString();
const get = (db, table, id) => db[table].find((r) => r.id === id);
const need = (v, msg) => {
  if (!v) throw new AppError(msg);
  return v;
};
const ok = (ops, result) => ({ ops, result });

// ===== Agendamentos =====

export function createAppointment(db, { clientId, serviceId, professionalId, date, start, source = 'interno', notes = '', status = 'agendado', allowOverlap = false }) {
  need(clientId, 'Escolha o cliente.');
  const service = need(get(db, 'services', serviceId), 'Escolha o procedimento.');
  need(professionalId, 'Escolha o profissional.');
  need(date && start, 'Escolha data e horário.');
  const end = endTime(start, service.durationMin);
  const conflict = findConflict({ date, start, end, professionalId, appointments: db.appointments });
  if (conflict && !allowOverlap) {
    throw new AppError(`Esse horário conflita com outro atendimento (${conflict.start}–${conflict.end}).`);
  }
  const row = {
    id: uid(), clientId, professionalId, serviceId, date, start, end, status, source,
    price: service.price, clientPackageId: null, paymentMethod: null, notes, createdAt: nowStamp(), cancelledAt: null,
  };
  return ok([{ op: 'insert', table: 'appointments', row }], row);
}

export function rescheduleAppointment(db, { id, date, start, professionalId, allowOverlap = false }) {
  const a = need(get(db, 'appointments', id), 'Agendamento não encontrado.');
  const service = get(db, 'services', a.serviceId);
  const end = endTime(start, service.durationMin);
  const pid = professionalId || a.professionalId;
  const conflict = findConflict({ date, start, end, professionalId: pid, appointments: db.appointments, ignoreAppointmentId: id });
  if (conflict && !allowOverlap) throw new AppError(`Esse horário conflita com outro atendimento (${conflict.start}–${conflict.end}).`);
  const patch = { date, start, end, professionalId: pid, status: a.status === 'confirmado' ? 'agendado' : a.status };
  return ok([{ op: 'update', table: 'appointments', id, patch }], { ...a, ...patch });
}

export function updateAppointmentNotes(db, { id, notes }) {
  return ok([{ op: 'update', table: 'appointments', id, patch: { notes } }]);
}

/** Muda status (exceto concluir, que tem fluxo próprio com pagamento). */
export function setAppointmentStatus(db, { id, status }) {
  const a = need(get(db, 'appointments', id), 'Agendamento não encontrado.');
  if (status === 'concluido') throw new AppError('Use "Concluir" para registrar o pagamento.');
  const ops = [];
  if (a.status === 'concluido') ops.push(...reopenOps(db, a)); // desfaz caixa/pacote
  ops.push({ op: 'update', table: 'appointments', id, patch: { status, cancelledAt: status === 'cancelado' ? nowStamp() : null, ...(a.status === 'concluido' ? { paymentMethod: null, clientPackageId: null } : {}) } });
  return ok(ops);
}

function reopenOps(db, a) {
  const ops = [];
  const t = db.transactions.find((x) => x.appointmentId === a.id);
  if (t) ops.push({ op: 'remove', table: 'transactions', id: t.id });
  if (a.clientPackageId) {
    const p = get(db, 'clientPackages', a.clientPackageId);
    if (p) ops.push({ op: 'update', table: 'clientPackages', id: p.id, patch: { usedSessions: Math.max(0, p.usedSessions - 1) } });
  }
  return ops;
}

/** Pacotes do cliente com saldo para o serviço do atendimento. */
export function usablePackages(db, appt) {
  return db.clientPackages.filter((p) => p.clientId === appt.clientId && p.serviceId === appt.serviceId && packageBalance(p) > 0 && (!p.expiresAt || p.expiresAt >= appt.date));
}

/** Baixa automática: conclui o atendimento e lança no caixa (ou abate do pacote). */
export function completeAppointment(db, { id, method, amount, clientPackageId }) {
  const a = need(get(db, 'appointments', id), 'Agendamento não encontrado.');
  if (a.status === 'concluido') throw new AppError('Este atendimento já foi concluído.');
  need(method, 'Escolha a forma de pagamento.');
  const service = get(db, 'services', a.serviceId);
  const ops = [];
  if (method === 'pacote') {
    const p = need(usablePackages(db, a).find((x) => x.id === clientPackageId) || usablePackages(db, a)[0], 'Este cliente não tem pacote com saldo para este procedimento.');
    ops.push({ op: 'update', table: 'clientPackages', id: p.id, patch: { usedSessions: p.usedSessions + 1 } });
    ops.push({ op: 'update', table: 'appointments', id, patch: { status: 'concluido', paymentMethod: 'pacote', clientPackageId: p.id } });
  } else {
    const value = Number(amount);
    if (!(value >= 0)) throw new AppError('Informe um valor válido.');
    ops.push({ op: 'update', table: 'appointments', id, patch: { status: 'concluido', paymentMethod: method, price: value } });
    ops.push({ op: 'insert', table: 'transactions', row: {
      id: uid(), type: 'entrada', category: 'atendimento', description: service?.name || 'Atendimento', amount: value, method,
      status: 'pago', dueDate: todayISO(), paidAt: todayISO(), appointmentId: id, clientPackageId: null,
      professionalId: a.professionalId, createdAt: nowStamp(),
    } });
  }
  return ok(ops);
}

/** Cancelamento pelo próprio cliente, respeitando a antecedência mínima. */
export function cancelByClient(db, { id, clientId }) {
  const a = need(get(db, 'appointments', id), 'Agendamento não encontrado.');
  if (a.clientId !== clientId) throw new AppError('Agendamento de outro cliente.');
  assertCanChange(db, a);
  return ok([{ op: 'update', table: 'appointments', id, patch: { status: 'cancelado', cancelledAt: nowStamp() } }]);
}

export function canClientChange(db, a) {
  return ['agendado', 'confirmado'].includes(a.status) && minutesUntil(a.date, a.start) >= db.settings.minCancelHours * 60;
}
export function assertCanChange(db, a) {
  if (!canClientChange(db, a)) {
    throw new AppError(`Alterações pelo portal só com ${db.settings.minCancelHours} h de antecedência. Fale com a clínica pelo WhatsApp.`);
  }
}

// ===== Agendamento pelo link (sem conta, só nome e WhatsApp) =====

export const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

/**
 * A cliente abre o link da agenda, escolhe o horário e informa só nome e WhatsApp.
 * Se já existe ficha com esse WhatsApp, o agendamento entra nela; senão cria a ficha.
 * O primeiro op ("rpc") permite ao banco real fazer tudo numa função segura (public_book),
 * já que a visitante não tem login; no modo protótipo ele é ignorado e valem os demais ops.
 */
export function bookByLink(db, { name, whatsapp, serviceId, professionalId, date, start, notes = '', consent = false }) {
  const nome = (name || '').trim();
  const phone = onlyDigits(whatsapp);
  if (nome.length < 2) throw new AppError('Informe seu nome.');
  if (phone.length < 10 || phone.length > 11) throw new AppError('Informe o WhatsApp com DDD (ex.: 14 99999-9999).');
  const service = need(get(db, 'services', serviceId), 'Escolha o procedimento.');
  if (service.requiresConsent && !consent) throw new AppError('Para este procedimento é preciso aceitar o termo de consentimento.');

  const ops = [];
  let client = db.clients.find((c) => onlyDigits(c.whatsapp) === phone);
  if (!client) {
    client = { id: uid(), name: nome, whatsapp: phone, email: '', birthDate: '', notes: 'Agendou pelo link', createdAt: todayISO() };
    ops.push({ op: 'insert', table: 'clients', row: client });
  }
  const { ops: aOps, result: appt } = createAppointment(db, { clientId: client.id, serviceId, professionalId, date, start, source: 'online', notes });
  ops.push(...aOps);
  if (service.requiresConsent) {
    ops.push({ op: 'insert', table: 'consentTerms', row: { id: uid(), clientId: client.id, serviceId, appointmentId: appt.id, termText: db.settings.consentText, signature: null, acceptedAt: nowStamp(), acceptedVia: 'portal' } });
  }
  ops.unshift({ op: 'rpc', fn: 'public_book', covers: true, args: {
    p_appointment_id: appt.id, p_client_id: client.id, p_name: nome, p_whatsapp: phone, p_service_id: serviceId,
    p_professional_id: professionalId, p_date: date, p_start: start, p_notes: notes, p_consent: !!consent,
  } });
  return ok(ops, { appointment: appt, client });
}

// ===== Clientes, portal e prontuário =====

export function createClient(db, { name, whatsapp = '', email = '', birthDate = '', notes = '' }) {
  need(name?.trim(), 'Informe o nome.');
  const row = { id: uid(), name: name.trim(), whatsapp: whatsapp.replace(/\D/g, ''), email: email.trim().toLowerCase(), birthDate, notes, createdAt: todayISO() };
  return ok([{ op: 'insert', table: 'clients', row }], row);
}

export function updateClient(db, { id, ...patch }) {
  if ('whatsapp' in patch) patch.whatsapp = patch.whatsapp.replace(/\D/g, '');
  return ok([{ op: 'update', table: 'clients', id, patch }]);
}

/** Remove o cliente e tudo que é dele (no banco real: ON DELETE CASCADE). Mantém o caixa. */
export function removeClient(db, { id }) {
  const ops = [{ op: 'remove', table: 'clients', id }];
  for (const table of ['appointments', 'clientPackages', 'anamneses', 'sessionNotes', 'evolutionPhotos', 'consentTerms', 'users']) {
    for (const r of db[table].filter((x) => x.clientId === id)) ops.push({ op: 'remove', table, id: r.id });
  }
  return ok(ops);
}

/** Cadastro pelo portal. Se a clínica já tinha o cliente (mesmo WhatsApp ou e-mail), vincula. */
export function registerPortalUser(db, { name, whatsapp, email, birthDate, passwordHash, salt }) {
  need(name?.trim(), 'Informe seu nome.');
  const phone = (whatsapp || '').replace(/\D/g, '');
  if (phone.length < 10) throw new AppError('Informe o WhatsApp com DDD.');
  const mail = (email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(mail)) throw new AppError('Informe um e-mail válido.');
  need(birthDate, 'Informe a data de nascimento.');
  if (db.users.some((u) => u.email === mail)) throw new AppError('Já existe uma conta com este e-mail. Use "Entrar".');
  const ops = [];
  let client = db.clients.find((c) => c.whatsapp === phone || (c.email && c.email === mail));
  if (client) {
    ops.push({ op: 'update', table: 'clients', id: client.id, patch: { email: mail, birthDate: client.birthDate || birthDate } });
  } else {
    client = { id: uid(), name: name.trim(), whatsapp: phone, email: mail, birthDate, notes: 'Cadastro pelo portal', createdAt: todayISO() };
    ops.push({ op: 'insert', table: 'clients', row: client });
  }
  const user = { id: uid(), role: 'client', email: mail, clientId: client.id, passwordHash, salt, demo: false };
  ops.push({ op: 'insert', table: 'users', row: user });
  return ok(ops, user);
}

export function saveAnamnesis(db, { clientId, data }) {
  const existing = db.anamneses.find((a) => a.clientId === clientId);
  const row = { ...data, clientId, updatedAt: todayISO() };
  if (existing) return ok([{ op: 'update', table: 'anamneses', id: existing.id, patch: row }]);
  return ok([{ op: 'insert', table: 'anamneses', row: { id: uid(), ...row } }]);
}

export function addEvolutionPhoto(db, { clientId, appointmentId = null, takenAt, kind, area, dataUrl, notes = '' }) {
  need(dataUrl, 'Escolha uma foto.');
  return ok([{ op: 'insert', table: 'evolutionPhotos', row: { id: uid(), clientId, appointmentId, takenAt, kind, area, dataUrl, notes } }]);
}

export function removeRow(db, { table, id }) {
  return ok([{ op: 'remove', table, id }]);
}

export function addConsent(db, { clientId, serviceId = null, appointmentId = null, signature = null, acceptedVia = 'clinica' }) {
  return ok([{ op: 'insert', table: 'consentTerms', row: { id: uid(), clientId, serviceId, appointmentId, termText: db.settings.consentText, signature, acceptedAt: nowStamp(), acceptedVia } }]);
}

export const hasConsent = (db, clientId, serviceId) =>
  db.consentTerms.some((t) => t.clientId === clientId && (t.serviceId === serviceId || t.serviceId === null));

export function addSessionNote(db, { clientId, serviceId, date, protocol, text, reactions, appointmentId = null }) {
  need(text?.trim(), 'Descreva a sessão.');
  return ok([{ op: 'insert', table: 'sessionNotes', row: { id: uid(), clientId, serviceId, date, protocol, text, reactions, appointmentId } }]);
}

// ===== Lista de espera =====

export function addToWaitlist(db, { clientId = null, name, whatsapp = '', serviceId, preferredPeriod, notes = '' }) {
  need(name?.trim(), 'Informe o nome.');
  return ok([{ op: 'insert', table: 'waitlist', row: { id: uid(), clientId, name: name.trim(), whatsapp: whatsapp.replace(/\D/g, ''), serviceId, preferredPeriod, notes, createdAt: nowStamp() } }]);
}

/** Encaixa alguém da lista de espera: cria o cliente se preciso, agenda e tira da lista. */
export function fitFromWaitlist(db, { waitId, professionalId, date, start }) {
  const w = need(get(db, 'waitlist', waitId), 'Item da lista não encontrado.');
  const ops = [];
  let clientId = w.clientId || db.clients.find((c) => c.whatsapp && c.whatsapp === w.whatsapp)?.id;
  if (!clientId) {
    const { ops: cOps, result } = createClient(db, { name: w.name, whatsapp: w.whatsapp, notes: 'Veio da lista de espera' });
    ops.push(...cOps);
    clientId = result.id;
  }
  const { ops: aOps, result } = createAppointment(db, { clientId, serviceId: w.serviceId, professionalId, date, start, source: 'interno', notes: 'Encaixe (lista de espera)' });
  ops.push(...aOps, { op: 'remove', table: 'waitlist', id: waitId });
  return ok(ops, result);
}

// ===== Pacotes =====

export function savePackagePlan(db, { id, serviceId, name, sessions, price, validityDays }) {
  need(serviceId, 'Escolha o procedimento.');
  const row = { serviceId, name: name?.trim() || `${sessions} sessões`, sessions: Number(sessions) || 1, price: Number(price) || 0, validityDays: Number(validityDays) || null, active: true };
  if (id) return ok([{ op: 'update', table: 'packagePlans', id, patch: row }]);
  return ok([{ op: 'insert', table: 'packagePlans', row: { id: uid(), ...row } }]);
}

export function sellPackage(db, { clientId, planId, method, price }) {
  need(clientId, 'Escolha o cliente.');
  const plan = need(get(db, 'packagePlans', planId), 'Escolha o pacote.');
  need(method && method !== 'pacote', 'Escolha a forma de pagamento.');
  const today = todayISO();
  const value = price === undefined || price === '' ? plan.price : Number(price);
  const exp = plan.validityDays ? new Date(Date.now() + plan.validityDays * 864e5) : null;
  const pkg = {
    id: uid(), clientId, packagePlanId: plan.id, serviceId: plan.serviceId, totalSessions: plan.sessions, usedSessions: 0,
    pricePaid: value, paymentMethod: method, soldAt: today, expiresAt: exp ? exp.toISOString().slice(0, 10) : null,
  };
  const client = get(db, 'clients', clientId);
  return ok([
    { op: 'insert', table: 'clientPackages', row: pkg },
    { op: 'insert', table: 'transactions', row: { id: uid(), type: 'entrada', category: 'pacote', description: `Pacote ${plan.name} · ${client?.name || ''}`, amount: value, method, status: 'pago', dueDate: today, paidAt: today, appointmentId: null, clientPackageId: pkg.id, createdAt: nowStamp() } },
  ], pkg);
}

// ===== Financeiro =====

export function addExpense(db, { description, category, amount, dueDate, paid, method = 'pix' }) {
  const value = Number(amount);
  if (!(value > 0)) throw new AppError('Informe o valor.');
  need(dueDate, 'Informe a data.');
  return ok([{ op: 'insert', table: 'transactions', row: {
    id: uid(), type: 'saida', category: category || 'Outros', description: description?.trim() || category || 'Despesa', amount: value,
    method: paid ? method : null, status: paid ? 'pago' : 'pendente', dueDate, paidAt: paid ? dueDate : null,
    appointmentId: null, clientPackageId: null, createdAt: nowStamp(),
  } }]);
}

export function markPaid(db, { id, method = 'pix' }) {
  return ok([{ op: 'update', table: 'transactions', id, patch: { status: 'pago', paidAt: todayISO(), method } }]);
}

// ===== Configurações =====

export function updateSettings(db, patch) {
  return ok([{ op: 'settings', patch }]);
}

export function saveService(db, { id, ...data }) {
  need(data.name?.trim(), 'Informe o nome do procedimento.');
  const row = { ...data, name: data.name.trim(), price: Number(data.price) || 0, durationMin: Number(data.durationMin) || 30 };
  if (id) return ok([{ op: 'update', table: 'services', id, patch: row }]);
  return ok([{ op: 'insert', table: 'services', row: { id: uid(), active: true, ...row } }]);
}

export function saveProfessional(db, { id, ...data }) {
  need(data.name?.trim(), 'Informe o nome.');
  if (id) return ok([{ op: 'update', table: 'professionals', id, patch: data }]);
  return ok([{ op: 'insert', table: 'professionals', row: { id: uid(), active: true, serviceIds: [], color: '#1e3a6e', ...data } }]);
}

export function addTimeBlock(db, { professionalId, date, start, end, reason }) {
  need(professionalId && date && start && end, 'Preencha profissional, data e horário.');
  if (end <= start) throw new AppError('O fim precisa ser depois do início.');
  return ok([{ op: 'insert', table: 'timeBlocks', row: { id: uid(), professionalId, date, start, end, reason } }]);
}
