import { ChevronLeft, ChevronRight } from 'lucide-react';
import { daysOfMonth, fmtMonth, weekday } from '../domain/time.js';
import { cx } from './ui.jsx';

const shift = (yyyyMm, n) => {
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Calendário mensal: só os dias em `available` podem ser clicados. */
export function MonthCalendar({ month, onMonthChange, selected, onSelect, available, today, minMonth, maxMonth, loading }) {
  const days = daysOfMonth(month);
  const lead = (weekday(days[0]) + 6) % 7; // começa na segunda
  const set = new Set(available);
  return (
    <div className="select-none">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => onMonthChange(shift(month, -1))} disabled={minMonth && month <= minMonth} className="rounded-full p-2 text-graphite-500 hover:bg-nude-100 disabled:opacity-30" aria-label="Mês anterior"><ChevronLeft className="h-5 w-5" /></button>
        <span className="font-serif text-xl font-bold">{fmtMonth(month)}</span>
        <button type="button" onClick={() => onMonthChange(shift(month, 1))} disabled={maxMonth && month >= maxMonth} className="rounded-full p-2 text-graphite-500 hover:bg-nude-100 disabled:opacity-30" aria-label="Próximo mês"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase text-graphite-400">
        {['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className={cx('grid grid-cols-7 gap-1', loading && 'opacity-50')}>
        {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
        {days.map((d) => {
          const ok = set.has(d);
          const isSel = d === selected;
          return (
            <button
              key={d} type="button" disabled={!ok} onClick={() => onSelect(d)}
              className={cx('relative aspect-square rounded-xl text-sm transition',
                isSel ? 'bg-rose-500 font-semibold text-white shadow' : ok ? 'bg-rose-50 font-medium text-rose-800 hover:bg-rose-100' : 'text-graphite-300',
                d === today && !isSel && 'underline decoration-2 underline-offset-4')}
              aria-label={ok ? `Dia ${Number(d.slice(8))}, com horários` : `Dia ${Number(d.slice(8))}, sem horários`}
            >
              {Number(d.slice(8))}
              {ok && !isSel && <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-rose-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { shift as shiftMonth };
