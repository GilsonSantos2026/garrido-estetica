// Utilitários de data/hora. Datas são 'AAAA-MM-DD' e horas 'HH:MM' no horário local da clínica.

export const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const toHHMM = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export const isoDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const parseDate = (iso) => new Date(`${iso}T12:00:00`);

export const todayISO = () => isoDate(new Date());

export const addDays = (iso, n) => {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
};

export const weekday = (iso) => parseDate(iso).getDay();

/** Segunda-feira da semana que contém a data. */
export const startOfWeek = (iso) => {
  const wd = weekday(iso);
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
};

export const daysOfMonth = (yyyyMm) => {
  const [y, m] = yyyyMm.split('-').map(Number);
  const n = new Date(y, m, 0).getDate();
  return Array.from({ length: n }, (_, i) => `${yyyyMm}-${String(i + 1).padStart(2, '0')}`);
};

export const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/** Minutos entre agora e o início de um horário (negativo se já passou). */
export const minutesUntil = (date, start) => {
  const target = new Date(`${date}T${start}:00`);
  return Math.round((target.getTime() - Date.now()) / 60000);
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = (iso, opts) => parseDate(iso).toLocaleDateString('pt-BR', opts);
export const fmtLong = (iso) => cap(fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' }));
export const fmtShort = (iso) => fmt(iso, { day: '2-digit', month: '2-digit' });
export const fmtDayMonth = (iso) => fmt(iso, { day: 'numeric', month: 'short' });
export const fmtWeekdayShort = (iso) => fmt(iso, { weekday: 'short' }).replace('.', '');
export const fmtMonth = (yyyyMm) => cap(fmt(`${yyyyMm}-01`, { month: 'long', year: 'numeric' }));
export const fmtBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

export const brl = (n) =>
  (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtDuration = (min) => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
};

export const age = (birthISO) => {
  if (!birthISO) return null;
  const b = parseDate(birthISO);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
};
