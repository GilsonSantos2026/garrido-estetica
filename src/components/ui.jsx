import { useEffect, useRef, useState } from 'react';
import { X, CheckCircle2, AlertCircle, MessageCircle } from 'lucide-react';
import { STATUS, SOURCE } from '../domain/constants.js';

export const cx = (...c) => c.filter(Boolean).join(' ');

const VARIANTS = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm',
  dark: 'bg-graphite-800 text-white hover:bg-graphite-900',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  ghost: 'text-graphite-600 hover:bg-mist-100',
  outline: 'border border-mist-300 bg-white text-graphite-700 hover:border-brand-300',
  danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
  whatsapp: 'bg-[#15803d] text-white hover:bg-[#126b33]',
};
const SIZES = { sm: 'px-3 py-1.5 text-sm gap-1.5', md: 'px-4 py-2.5 text-[15px] gap-2', lg: 'px-5 py-3 text-base gap-2' };

export function Button({ variant = 'primary', size = 'md', icon: Icon, className, children, ...props }) {
  return (
    <button
      type="button"
      className={cx('inline-flex items-center justify-center rounded-xl font-medium transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-40', VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {Icon && <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'} strokeWidth={1.8} />}
      {children}
    </button>
  );
}

export const waLink = (phone, message) => `https://wa.me/55${String(phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

export function WhatsAppLink({ phone, message, children = 'WhatsApp', size = 'sm', onClick, className }) {
  if (!phone) return null;
  return (
    <a
      href={waLink(phone, message)} target="_blank" rel="noopener noreferrer" onClick={onClick}
      className={cx('inline-flex items-center justify-center rounded-xl font-medium transition', VARIANTS.whatsapp, SIZES[size], className)}
    >
      <MessageCircle className="h-4 w-4" strokeWidth={1.8} /> {children}
    </a>
  );
}

export function Card({ className, children, ...props }) {
  return <div className={cx('card', className)} {...props}>{children}</div>;
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-graphite-400">{hint}</span>}
    </label>
  );
}

export const Input = (props) => <input className="input" {...props} />;
export const Textarea = (props) => <textarea className="input min-h-[84px] resize-y" {...props} />;
export function Select({ options, placeholder, ...props }) {
  return (
    <select className="input pr-8" {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
}

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.agendado;
  return <span className={cx('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', s.cls)}>{s.label}</span>;
}

export function SourceDot({ source, withLabel }) {
  const s = SOURCE[source] || SOURCE.interno;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-graphite-500" title={s.label}>
      <span className={cx('h-2 w-2 rounded-full', s.dot)} />{withLabel && s.label}
    </span>
  );
}

export function Badge({ tone = 'nude', children, className }) {
  const tones = {
    nude: 'bg-mist-100 text-graphite-600', rose: 'bg-brand-100 text-brand-700', green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-800', red: 'bg-red-50 text-red-700', dark: 'bg-graphite-800 text-white',
  };
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone], className)}>{children}</span>;
}

export function Avatar({ name, color = '#1e3a6e', size = 36 }) {
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white" style={{ background: color, width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </span>
  );
}

/** Abas segmentadas. options: [{value, label, icon}] */
export function Segmented({ value, onChange, options, className, size = 'md' }) {
  return (
    <div className={cx('inline-flex rounded-xl bg-mist-100 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cx('inline-flex items-center gap-1.5 rounded-lg font-medium transition', size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === o.value ? 'bg-white text-graphite-900 shadow-sm' : 'text-graphite-500 hover:text-graphite-800')}
        >
          {o.icon && <o.icon className="h-4 w-4" strokeWidth={1.8} />}{o.label}
        </button>
      ))}
    </div>
  );
}

/** Abas sublinhadas com rolagem horizontal no celular. */
export function Tabs({ value, onChange, options }) {
  return (
    <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-1 border-b border-mist-200">
        {options.map((o) => (
          <button
            key={o.value} type="button" onClick={() => onChange(o.value)}
            className={cx('-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition',
              value === o.value ? 'border-brand-500 text-brand-700' : 'border-transparent text-graphite-500 hover:text-graphite-800')}
          >
            {o.icon && <o.icon className="h-4 w-4" strokeWidth={1.8} />}{o.label}
            {o.count !== undefined && <span className="rounded-full bg-mist-100 px-1.5 text-[11px] text-graphite-500">{o.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Chips({ options, value = [], onChange }) {
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => toggle(o)} className={cx('chip', value.includes(o) && 'chip-on')}>{o}</button>
      ))}
    </div>
  );
}

/** Modal: folha que sobe de baixo no celular, centralizado no computador. */
export function Modal({ open, onClose, title, subtitle, children, footer, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-graphite-900/40 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={cx('flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-start justify-between gap-3 border-b border-mist-100 px-5 pb-3 pt-5">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold leading-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-graphite-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-graphite-400 hover:bg-mist-100" aria-label="Fechar"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-mist-100 px-5 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {Icon && <div className="mb-3 rounded-full bg-brand-50 p-3 text-brand-400"><Icon className="h-6 w-6" strokeWidth={1.6} /></div>}
      <p className="font-medium text-graphite-700">{title}</p>
      {children && <div className="mt-1 text-sm text-graphite-500">{children}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between gap-3 first:mt-0">
      <h3 className="text-xl font-bold">{children}</h3>
      {action}
    </div>
  );
}

export function Toasts({ toasts }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4" style={{ marginTop: 'env(safe-area-inset-top)' }}>
      {toasts.map((t) => (
        <div key={t.id} role="status" className={cx('pointer-events-auto flex max-w-md items-start gap-2 rounded-2xl px-4 py-3 text-sm shadow-lg',
          t.kind === 'error' ? 'bg-red-600 text-white' : 'bg-graphite-800 text-white')}>
          {t.kind === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

/** Assinatura com o dedo ou mouse. onChange recebe dataURL (PNG) ou null. */
export function SignaturePad({ onChange }) {
  const ref = useRef(null);
  const [empty, setEmpty] = useState(true);
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    const cv = ref.current;
    const r = cv.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    cv.width = r.width * ratio;
    cv.height = r.height * ratio;
    const ctx = cv.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1d2430';
    let drawing = false;
    const pos = (e) => {
      const b = cv.getBoundingClientRect();
      return [e.clientX - b.left, e.clientY - b.top];
    };
    cv.onpointerdown = (e) => {
      drawing = true;
      cv.setPointerCapture(e.pointerId);
      ctx.beginPath();
      ctx.moveTo(...pos(e));
    };
    cv.onpointermove = (e) => {
      if (!drawing) return;
      ctx.lineTo(...pos(e));
      ctx.stroke();
    };
    cv.onpointerup = () => {
      if (!drawing) return;
      drawing = false;
      setEmpty(false);
      cb.current?.(cv.toDataURL('image/png'));
    };
  }, []);
  const clear = () => {
    const cv = ref.current;
    cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
    setEmpty(true);
    cb.current?.(null);
  };
  return (
    <div>
      <canvas ref={ref} className="h-36 w-full touch-none rounded-xl border border-dashed border-graphite-300 bg-mist-50" />
      <div className="mt-1 flex justify-between text-xs text-graphite-400">
        <span>{empty ? 'Assine dentro do quadro' : 'Assinatura registrada'}</span>
        <button type="button" onClick={clear} className="underline">limpar</button>
      </div>
    </div>
  );
}

export function Stat({ label, value, hint, icon: Icon, tone = 'rose', valueClass }) {
  const tones = { rose: 'bg-brand-50 text-brand-500', green: 'bg-emerald-50 text-emerald-600', dark: 'bg-graphite-800 text-white', amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-500' };
  return (
    <Card className="min-w-0 p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-graphite-500">{label}</span>
        {Icon && <span className={cx('rounded-lg p-1.5', tones[tone])}><Icon className="h-4 w-4" strokeWidth={1.8} /></span>}
      </div>
      <div className={cx('mt-2 whitespace-nowrap font-serif text-[19px] font-bold leading-none min-[400px]:text-[22px] sm:text-[26px]', valueClass || 'text-graphite-900')}>{value}</div>
      {hint && <div className="mt-1.5 text-xs text-graphite-500">{hint}</div>}
    </Card>
  );
}
