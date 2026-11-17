// Testes do cálculo de horários livres. Rodar com: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getFreeSlots, getSlotsForService, findConflict } from './availability.js';

// 2026-11-17 é uma terça-feira
const DATE = '2026-11-17';
const settings = {
  slotStepMin: 15, bufferMin: 10, minAdvanceMin: 60, bookingWindowDays: 60,
  businessHours: { 2: { closed: false, open: '09:00', close: '19:00', breakStart: '12:00', breakEnd: '13:00' }, 0: { closed: true } },
};
const appt = (id, pid, start, end, status = 'agendado') => ({ id, professionalId: pid, date: DATE, start, end, status });

test('exemplo da documentação', () => {
  const slots = getFreeSlots({ date: DATE, durationMin: 60, professionalId: 'p1', settings, appointments: [appt('a', 'p1', '10:00', '10:50')] });
  assert.equal(slots[0], '11:00');
  assert.ok(!slots.includes('09:00'), 'invade o atendimento das 10:00 com o buffer');
  assert.ok(!slots.includes('11:15'), 'invade o almoço');
  assert.ok(slots.includes('13:00'));
  assert.equal(slots.at(-1), '18:00');
});

test('cancelado e faltou liberam o horário', () => {
  const slots = getFreeSlots({ date: DATE, durationMin: 60, professionalId: 'p1', settings, appointments: [appt('a', 'p1', '09:00', '10:00', 'cancelado')] });
  assert.equal(slots[0], '09:00');
});

test('dia fechado não tem horários', () => {
  assert.deepEqual(getFreeSlots({ date: '2026-11-15', durationMin: 30, professionalId: 'p1', settings, appointments: [] }), []);
});

test('bloqueio do profissional', () => {
  const slots = getFreeSlots({ date: DATE, durationMin: 30, professionalId: 'p1', settings, appointments: [], timeBlocks: [{ professionalId: 'p1', date: DATE, start: '09:00', end: '11:00' }] });
  assert.equal(slots[0], '11:00');
});

test('hoje respeita a antecedência mínima', () => {
  const slots = getFreeSlots({ date: DATE, durationMin: 30, professionalId: 'p1', settings, appointments: [], today: DATE, nowMin: 14 * 60 + 5 });
  assert.equal(slots[0], '15:15'); // 14:05 + 60 min, arredondado para a grade de 15
});

test('sem preferência une os profissionais', () => {
  const slots = getSlotsForService({ date: DATE, service: { durationMin: 60 }, professionalIds: ['p1', 'p2'], settings, appointments: [appt('a', 'p1', '09:00', '10:00')] });
  assert.deepEqual(slots[0], { time: '09:00', professionalIds: ['p2'] });
});

test('reagendamento ignora o próprio horário', () => {
  const appointments = [appt('a', 'p1', '09:00', '10:00')];
  const slots = getFreeSlots({ date: DATE, durationMin: 60, professionalId: 'p1', settings, appointments, ignoreAppointmentId: 'a' });
  assert.equal(slots[0], '09:00');
  assert.equal(findConflict({ date: DATE, start: '09:30', end: '10:30', professionalId: 'p1', appointments })?.id, 'a');
});
