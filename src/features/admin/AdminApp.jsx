import { createContext, useContext, useMemo, useState } from 'react';
import { CalendarDays, Users, Wallet, LayoutGrid } from 'lucide-react';
import { useStore } from '../../store/StoreContext.jsx';
import { todayISO } from '../../domain/time.js';
import { cx } from '../../components/ui.jsx';
import Agenda from './agenda/Agenda.jsx';
import AppointmentDetails from './agenda/AppointmentDetails.jsx';
import AppointmentForm from './agenda/AppointmentForm.jsx';
import CompleteDialog from './agenda/CompleteDialog.jsx';
import Clients from './clients/Clients.jsx';
import ClientProfile from './clients/ClientProfile.jsx';
import Waitlist from './Waitlist.jsx';
import Packages from './Packages.jsx';
import Finance from './Finance.jsx';
import SettingsPage from './Settings.jsx';
import Dados from './Dados.jsx';
import MorePage from './MorePage.jsx';

// Modo simples: só o essencial no menu. O resto fica em "Mais" (pacotes, espera, dados, ajustes).
const PAGES = [
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'financeiro', label: 'Caixa', icon: Wallet },
  { id: 'mais', label: 'Mais', icon: LayoutGrid },
];
const UNDER_MORE = ['mais', 'espera', 'pacotes', 'dados', 'config'];
const isActive = (tab, page) => tab === page || (tab === 'mais' && UNDER_MORE.includes(page));

const AdminCtx = createContext(null);
/** Navegação e diálogos globais do painel: openClient, openAppointment, newAppointment, complete. */
export const useAdmin = () => useContext(AdminCtx);

export default function AdminApp() {
  const { db } = useStore();
  const [page, setPage] = useState('agenda');
  const [clientId, setClientId] = useState(null);
  const [detailsId, setDetailsId] = useState(null);
  const [form, setForm] = useState(null); // { prefill } ou { reschedule }
  const [completeId, setCompleteId] = useState(null);
  const [agendaDate, setAgendaDate] = useState(todayISO());

  const nav = useMemo(() => ({
    go: (p) => { setPage(p); setClientId(null); window.scrollTo(0, 0); },
    openClient: (id) => { setDetailsId(null); setPage('clientes'); setClientId(id); window.scrollTo(0, 0); },
    openAppointment: (id) => setDetailsId(id),
    newAppointment: (prefill = {}) => { setDetailsId(null); setForm({ prefill }); },
    reschedule: (appt) => { setDetailsId(null); setForm({ reschedule: appt }); },
    complete: (id) => { setDetailsId(null); setCompleteId(id); },
    showDay: (d) => { setAgendaDate(d); setPage('agenda'); setClientId(null); },
    agendaDate, setAgendaDate,
  }), [agendaDate]);

  const pending = db.waitlist.length;

  return (
    <AdminCtx.Provider value={nav}>
      <div className="mx-auto flex max-w-7xl">
        {/* Menu lateral (computador) */}
        <aside className="sticky top-[86px] hidden h-[calc(100vh-86px)] w-56 shrink-0 flex-col gap-1 border-r border-mist-200 px-3 py-5 lg:flex">
          {PAGES.map((p) => (
            <button key={p.id} type="button" onClick={() => nav.go(p.id)}
              className={cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition',
                isActive(p.id, page) ? 'bg-brand-100 text-brand-800' : 'text-graphite-600 hover:bg-mist-100')}>
              <p.icon className="h-5 w-5" strokeWidth={1.7} />{p.label}
              {p.id === 'mais' && pending > 0 && <span className="ml-auto rounded-full bg-brand-500 px-1.5 text-[11px] text-white" title="Pessoas na lista de espera">{pending}</span>}
            </button>
          ))}
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-10">
          {page === 'agenda' && <Agenda />}
          {page === 'clientes' && (clientId ? <ClientProfile id={clientId} onBack={() => setClientId(null)} /> : <Clients />)}
          {page === 'espera' && <Waitlist />}
          {page === 'pacotes' && <Packages />}
          {page === 'financeiro' && <Finance />}
          {page === 'dados' && <Dados />}
          {page === 'config' && <SettingsPage />}
          {page === 'mais' && <MorePage />}
        </main>
      </div>

      {/* Menu inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-mist-200 bg-white/95 backdrop-blur lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {PAGES.map((p) => (
          <button key={p.id} type="button" onClick={() => nav.go(p.id)}
            className={cx('relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11.5px] font-medium', isActive(p.id, page) ? 'text-brand-500' : 'text-graphite-400')}>
            <p.icon className="h-6 w-6" strokeWidth={isActive(p.id, page) ? 2 : 1.6} />{p.label}
            {p.id === 'mais' && pending > 0 && <span className="absolute right-[calc(50%-18px)] top-1 h-2 w-2 rounded-full bg-brand-500" />}
          </button>
        ))}
      </nav>

      {detailsId && <AppointmentDetails id={detailsId} onClose={() => setDetailsId(null)} />}
      {form && <AppointmentForm {...form} onClose={() => setForm(null)} />}
      {completeId && <CompleteDialog id={completeId} onClose={() => setCompleteId(null)} />}
    </AdminCtx.Provider>
  );
}
