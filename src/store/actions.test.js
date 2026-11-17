// Testes das regras de negócio. Rodar com: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyOps } from '../data/repository.js';
import { buildSeed } from '../data/seed.js';
import { addDays, todayISO } from '../domain/time.js';
import * as A from './actions.js';

const run = (db, fn, args) => {
  const { ops, result } = fn(db, args);
  return { db: applyOps(db, ops), result };
};
const fresh = () => buildSeed(todayISO(), 12 * 60);
const futureOf = (db, clientId, minDays) =>
  db.appointments.find((a) => a.clientId === clientId && a.date >= addDays(todayISO(), minDays) && ['agendado', 'confirmado'].includes(a.status));

test('concluir com Pix lança no caixa', () => {
  let db = fresh();
  const a = db.appointments.find((x) => ['agendado', 'confirmado'].includes(x.status));
  ({ db } = run(db, A.completeAppointment, { id: a.id, method: 'pix', amount: 150 }));
  const t = db.transactions.find((x) => x.appointmentId === a.id);
  assert.equal(t.amount, 150);
  assert.equal(t.method, 'pix');
  assert.equal(db.appointments.find((x) => x.id === a.id).status, 'concluido');
});

test('abater de pacote baixa sessão e não lança no caixa', () => {
  let db = fresh();
  const pkg = db.clientPackages.find((p) => p.totalSessions > p.usedSessions);
  ({ db } = run(db, A.createAppointment, { clientId: pkg.clientId, serviceId: pkg.serviceId, professionalId: db.professionals.find((p) => p.serviceIds.includes(pkg.serviceId)).id, date: addDays(todayISO(), 1), start: '07:00', allowOverlap: true }));
  const appt = db.appointments.at(-1);
  ({ db } = run(db, A.completeAppointment, { id: appt.id, method: 'pacote' }));
  assert.equal(db.clientPackages.find((p) => p.id === pkg.id).usedSessions, pkg.usedSessions + 1);
  assert.equal(db.transactions.some((t) => t.appointmentId === appt.id), false);
});

test('reabrir um concluído desfaz caixa e pacote', () => {
  let db = fresh();
  const a = db.appointments.find((x) => x.status === 'concluido' && x.clientPackageId);
  const usedBefore = db.clientPackages.find((p) => p.id === a.clientPackageId).usedSessions;
  ({ db } = run(db, A.setAppointmentStatus, { id: a.id, status: 'agendado' }));
  assert.equal(db.clientPackages.find((p) => p.id === a.clientPackageId).usedSessions, usedBefore - 1);
  const b = db.appointments.find((x) => x.status === 'concluido' && !x.clientPackageId);
  ({ db } = run(db, A.setAppointmentStatus, { id: b.id, status: 'agendado' }));
  assert.equal(db.transactions.some((t) => t.appointmentId === b.id), false);
});

test('cliente só cancela com 24 h de antecedência', () => {
  let db = fresh();
  ({ db } = run(db, A.createAppointment, { clientId: 'c1', serviceId: 's3', professionalId: 'p1', date: todayISO(), start: '23:00', allowOverlap: true }));
  const soon = db.appointments.at(-1);
  assert.throws(() => A.cancelByClient(db, { id: soon.id, clientId: 'c1' }), A.AppError);
  const later = futureOf(db, 'c1', 3);
  assert.ok(later, 'seed deve ter horário futuro da Marina');
  ({ db } = run(db, A.cancelByClient, { id: later.id, clientId: 'c1' }));
  assert.equal(db.appointments.find((a) => a.id === later.id).status, 'cancelado');
});

test('cliente não cancela agendamento de outra pessoa', () => {
  const db = fresh();
  const other = futureOf(db, 'c3', 2) || db.appointments.find((a) => a.clientId !== 'c1');
  assert.throws(() => A.cancelByClient(db, { id: other.id, clientId: 'c1' }), A.AppError);
});

test('não agenda em horário ocupado', () => {
  const db = fresh();
  const busy = db.appointments.find((a) => a.date > todayISO() && a.status === 'confirmado');
  assert.throws(() => A.createAppointment(db, { clientId: 'c5', serviceId: busy.serviceId, professionalId: busy.professionalId, date: busy.date, start: busy.start }), A.AppError);
});

test('cadastro no portal vincula cliente já existente pelo WhatsApp', () => {
  let db = fresh();
  const before = db.clients.length;
  ({ db } = run(db, A.registerPortalUser, { name: 'Camila R.', whatsapp: '(14) 99222-3344', email: 'camila.nova@exemplo.com', birthDate: '1988-07-02', passwordHash: 'x', salt: 'y' }));
  assert.equal(db.clients.length, before);
  assert.equal(db.users.at(-1).clientId, 'c2');
});

test('venda de pacote entra no caixa', () => {
  let db = fresh();
  ({ db } = run(db, A.sellPackage, { clientId: 'c5', planId: 'pp1', method: 'credito' }));
  const pkg = db.clientPackages.at(-1);
  assert.equal(db.transactions.find((t) => t.clientPackageId === pkg.id).amount, 1000);
});
