import { todayISO, nowMinutes, fmtLong } from '../domain/time.js';

/** Parâmetros comuns do cálculo de horários livres a partir do banco. */
export const availabilityContext = (db) => ({
  settings: db.settings,
  appointments: db.appointments,
  timeBlocks: db.timeBlocks,
  today: todayISO(),
  nowMin: nowMinutes(),
});

export const professionalsFor = (db, serviceId) =>
  db.professionals.filter((p) => p.active && p.serviceIds.includes(serviceId));

export const firstName = (name) => (name || '').split(' ')[0];

export const msgConfirm = (clinic, client, service, a) =>
  `Olá, ${firstName(client.name)}! Aqui é da ${clinic}. Confirmando seu horário de ${service.name} em ${fmtLong(a.date)} às ${a.start}. Podemos confirmar? Responda SIM 💗`;

export const msgReminder = (clinic, client, service, a) =>
  `Oi, ${firstName(client.name)}! Passando para lembrar do seu ${service.name} ${a.date === todayISO() ? 'hoje' : `em ${fmtLong(a.date)}`} às ${a.start} na ${clinic}. Até logo! ✨`;

export const msgSlotOpen = (clinic, name, service, when) =>
  `Oi, ${firstName(name)}! Abriu um horário de ${service.name} na ${clinic}${when ? ` ${when}` : ''}. Quer que eu reserve para você? 💗`;

export const periodOf = (hhmm) => (hhmm < '12:00' ? 'Manhã' : hhmm < '18:00' ? 'Tarde' : 'Noite');
