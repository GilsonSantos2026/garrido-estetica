import { useState } from 'react';
import { Briefcase, UserRound, Sparkles, RotateCcw, FlaskConical, Database, LogOut, AlertTriangle } from 'lucide-react';
import { useStore } from './store/StoreContext.jsx';
import { Button, Segmented, Toasts } from './components/ui.jsx';
import AdminApp from './features/admin/AdminApp.jsx';
import PortalApp from './features/portal/PortalApp.jsx';
import StaffLogin from './features/admin/StaffLogin.jsx';

const VIEW_KEY = 'garrido-view';
const readView = () => {
  try {
    return localStorage.getItem(VIEW_KEY) || 'admin';
  } catch {
    return 'admin';
  }
};
export const isStaff = (session) => ['admin', 'professional'].includes(session?.role);

export default function App() {
  const { db, toasts, act, backendKind, session, authApi, loadError } = useStore();
  const [view, setView] = useState(readView);

  const changeView = (v) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch { /* sem armazenamento: só nesta aba */ }
    window.scrollTo(0, 0);
  };

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-md p-6 text-center">
          <AlertTriangle className="mx-auto mb-2 h-7 w-7 text-red-500" />
          <h1 className="text-2xl font-bold">Não foi possível carregar os dados</h1>
          <p className="mt-2 text-sm text-graphite-600">{loadError}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Tentar de novo</Button>
        </div>
      </div>
    );
  }
  if (!db) {
    return <div className="flex min-h-screen items-center justify-center text-graphite-400"><Sparkles className="mr-2 h-5 w-5 animate-pulse" />Carregando…</div>;
  }

  // No banco real, o painel exige login de equipe. No protótipo, fica aberto para testes.
  const needsStaffLogin = backendKind === 'supabase' && view === 'admin' && !isStaff(session);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-mist-200 bg-mist-50/95 backdrop-blur" style={{ top: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5">
          <div className="min-w-0 leading-tight">
            <div className="truncate font-serif text-xl font-bold text-brand-500"><span aria-hidden="true">✿ </span>{db.settings.clinicName}</div>
            <div className="hidden text-[11px] text-graphite-400 sm:block">
              {view === 'admin' ? 'Painel da clínica' : 'Agendamento online'} · {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')}
            </div>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <span className="text-xs text-graphite-400">Alternar visão:</span>
            <Segmented
              value={view} onChange={changeView} size="sm" className="ml-auto sm:ml-0"
              options={[{ value: 'admin', label: 'Profissional', icon: Briefcase }, { value: 'client', label: 'Cliente', icon: UserRound }]}
            />
          </div>
        </div>
        {backendKind === 'local' ? (
          <div className="flex items-center justify-center gap-2 bg-brand-50 px-4 py-1 text-[11px] text-brand-700">
            <FlaskConical className="h-3.5 w-3.5 shrink-0" /> <span>Sistema de testes<span className="hidden sm:inline"> · dados fictícios salvos neste navegador</span></span>
            <button type="button" className="inline-flex items-center gap-1 underline" onClick={() => window.confirm('Apagar tudo e voltar aos dados de exemplo?') && act.reset()}>
              <RotateCcw className="h-3 w-3" />restaurar
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 bg-emerald-50 px-4 py-1 text-[11px] text-emerald-800">
            <Database className="h-3.5 w-3.5" /> Conectado ao banco de dados
            {isStaff(session) && view === 'admin' && (
              <button type="button" className="inline-flex items-center gap-1 underline" onClick={authApi.signOut}><LogOut className="h-3 w-3" />sair ({session.email})</button>
            )}
          </div>
        )}
      </header>

      {view === 'client' ? <PortalApp /> : needsStaffLogin ? <StaffLogin /> : <AdminApp />}
      <Toasts toasts={toasts} />
    </div>
  );
}
