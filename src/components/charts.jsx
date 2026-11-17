import { useState } from 'react';
import { brl, fmtShort } from '../domain/time.js';
import { cx } from './ui.jsx';

// Cor de dados validada (scripts do skill dataviz: chroma e contraste OK sobre fundo claro).
const BAR = '#b5576f';

/** Barras verticais de uma série (receita por dia). Hover mostra o valor; "Tabela" mostra os números. */
export function DailyBars({ data, label = 'Entradas por dia' }) {
  const [hover, setHover] = useState(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const H = 140;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-graphite-500">
        <span>{label}</span>
        <button type="button" className="underline" onClick={() => setTable((t) => !t)}>{table ? 'Ver gráfico' : 'Ver tabela'}</button>
      </div>
      {table ? (
        <div className="max-h-56 overflow-y-auto text-sm">
          {data.filter((d) => d.value).map((d) => (
            <div key={d.date} className="flex justify-between border-b border-nude-100 py-1"><span>{fmtShort(d.date)}</span><span className="tabular-nums">{brl(d.value)}</span></div>
          ))}
          <div className="flex justify-between py-1 font-medium"><span>Total</span><span className="tabular-nums">{brl(total)}</span></div>
        </div>
      ) : (
        <div className="relative" onMouseLeave={() => setHover(null)}>
          <div className="flex items-end gap-[2px]" style={{ height: H }} role="img" aria-label={`${label}: total ${brl(total)}`}>
            {data.map((d, i) => (
              <div
                key={d.date} className="flex h-full flex-1 cursor-default items-end"
                onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}
              >
                <div
                  className={cx('w-full rounded-t-[4px] transition-opacity', hover !== null && hover !== i && 'opacity-50')}
                  style={{ height: d.value ? Math.max(3, (d.value / max) * H) : 0, background: BAR }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between border-t border-nude-200 pt-1 text-[11px] text-graphite-400">
            <span>{fmtShort(data[0].date)}</span><span>{fmtShort(data[Math.floor(data.length / 2)].date)}</span><span>{fmtShort(data.at(-1).date)}</span>
          </div>
          {hover !== null && (
            <div
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-graphite-900 px-2.5 py-1.5 text-xs text-white shadow"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
            >
              {fmtShort(data[hover].date)} · <b className="tabular-nums">{brl(data[hover].value)}</b>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Barras horizontais rotuladas (ranking de procedimentos). */
export function RankBars({ items }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i.label} title={`${i.label}: ${brl(i.value)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate text-graphite-700">{i.label}</span>
            <span className="shrink-0 tabular-nums text-graphite-500">{i.detail} · <b className="text-graphite-800">{brl(i.value)}</b></span>
          </div>
          <div className="h-2 rounded-full bg-nude-100">
            <div className="h-2 rounded-full" style={{ width: `${(i.value / max) * 100}%`, background: BAR }} />
          </div>
        </div>
      ))}
    </div>
  );
}
