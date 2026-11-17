// Cálculo de horários livres. Funções puras: recebem dados, devolvem resultado.
// Explicação completa em docs/02-logica-horarios-livres.md
import { ACTIVE_STATUS } from './constants.js';
import { toMin, toHHMM, weekday, addDays, daysOfMonth } from './time.js';

/** Subtrai uma lista de intervalos [s,e) de outra. */
function subtract(intervals, cuts) {
  let out = intervals;
  for (const [cs, ce] of cuts) {
    out = out.flatMap(([s, e]) => {
      if (ce <= s || cs >= e) return [[s, e]];
      const parts = [];
      if (cs > s) parts.push([s, cs]);
      if (ce < e) parts.push([ce, e]);
      return parts;
    });
  }
  return out;
}

/** Intervalos de trabalho de um profissional num dia (minutos desde 00:00). */
export function workingIntervals({ date, settings, professionalId, timeBlocks = [] }) {
  const h = settings.businessHours[weekday(date)];
  if (!h || h.closed) return [];
  let intervals = [[toMin(h.open), toMin(h.close)]];
  if (h.breakStart && h.breakEnd) intervals = subtract(intervals, [[toMin(h.breakStart), toMin(h.breakEnd)]]);
  const blocks = timeBlocks
    .filter((b) => b.professionalId === professionalId && b.date === date)
    .map((b) => [toMin(b.start), toMin(b.end)]);
  return subtract(intervals, blocks);
}

/**
 * Horários livres de UM profissional num dia.
 * @returns {string[]} lista de 'HH:MM'
 */
export function getFreeSlots({
  date, durationMin, professionalId, settings, appointments, timeBlocks = [],
  ignoreAppointmentId = null, today, nowMin,
}) {
  if (today && date < today) return [];
  if (today && date > addDays(today, settings.bookingWindowDays)) return [];
  const work = workingIntervals({ date, settings, professionalId, timeBlocks });
  if (!work.length) return [];

  const buffer = settings.bufferMin || 0;
  const step = settings.slotStepMin || 15;
  const busy = appointments
    .filter((a) => a.professionalId === professionalId && a.date === date && a.id !== ignoreAppointmentId && ACTIVE_STATUS.includes(a.status))
    .map((a) => [toMin(a.start), toMin(a.end) + buffer]);

  const earliest = date === today ? nowMin + (settings.minAdvanceMin || 0) : -1;
  const open = Math.min(...work.map((w) => w[0]));
  const close = Math.max(...work.map((w) => w[1]));
  const slots = [];

  for (let t = open; t + durationMin <= close; t += step) {
    const end = t + durationMin;
    if (t < earliest) continue;
    if (!work.some(([s, e]) => t >= s && end <= e)) continue;
    if (busy.some(([s, e]) => t < e && end + buffer > s)) continue;
    slots.push(toHHMM(t));
  }
  return slots;
}

/**
 * Horários livres considerando um ou vários profissionais ("sem preferência").
 * @returns {{time: string, professionalIds: string[]}[]}
 */
export function getSlotsForService({ date, service, professionalIds, ...rest }) {
  const map = new Map();
  for (const pid of professionalIds) {
    for (const time of getFreeSlots({ date, durationMin: service.durationMin, professionalId: pid, ...rest })) {
      if (!map.has(time)) map.set(time, []);
      map.get(time).push(pid);
    }
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([time, ids]) => ({ time, professionalIds: ids }));
}

/** Dias do mês com pelo menos um horário livre. */
export function getAvailableDays({ month, ...args }) {
  return daysOfMonth(month).filter((date) => getSlotsForService({ date, ...args }).length > 0);
}

/** Entre vários profissionais livres, escolhe quem tem menos atendimentos no dia. */
export function pickProfessional(professionalIds, date, appointments) {
  const load = (pid) => appointments.filter((a) => a.professionalId === pid && a.date === date && ACTIVE_STATUS.includes(a.status)).length;
  return [...professionalIds].sort((a, b) => load(a) - load(b))[0];
}

/** Verifica se um horário escolhido manualmente conflita com a agenda. */
export function findConflict({ date, start, end, professionalId, appointments, ignoreAppointmentId = null }) {
  const s = toMin(start);
  const e = toMin(end);
  return appointments.find(
    (a) => a.id !== ignoreAppointmentId && a.professionalId === professionalId && a.date === date &&
      ACTIVE_STATUS.includes(a.status) && s < toMin(a.end) && e > toMin(a.start),
  ) || null;
}

export const endTime = (start, durationMin) => toHHMM(toMin(start) + durationMin);
