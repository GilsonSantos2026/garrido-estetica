import { useState } from 'react';
import { LogIn, UserPlus, Sparkles, MailCheck } from 'lucide-react';
import { useStore } from '../../store/StoreContext.jsx';
import { Button, Field, Input, Segmented } from '../../components/ui.jsx';

/** Cadastro rápido / login do portal. Funciona no modo protótipo e no Supabase (ver src/data/auth.js). */
export default function AuthPanel({ onAuth, compact }) {
  const { authApi, notify, backendKind } = useStore();
  const [mode, setMode] = useState('signup');
  const [busy, setBusy] = useState(false);
  const [waitingEmail, setWaitingEmail] = useState(false);
  const [f, setF] = useState({ name: '', whatsapp: '', email: '', birthDate: '', password: '', password2: '' });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const run = async (fn, args) => {
    setBusy(true);
    const out = await fn(args);
    setBusy(false);
    if (out?.needsConfirmation) {
      setWaitingEmail(true);
      setMode('login');
    } else if (out?.session) {
      onAuth?.(out.session);
    }
  };

  const signup = (e) => {
    e.preventDefault();
    if (f.password !== f.password2) return notify('As senhas não conferem.', 'error');
    return run(authApi.signUp, f);
  };
  const login = (e) => {
    e.preventDefault();
    return run(authApi.signIn, { email: f.email, password: f.password });
  };

  return (
    <div className={compact ? '' : 'card mx-auto max-w-md p-5'}>
      <Segmented
        className="mb-4 w-full [&>button]:flex-1 [&>button]:justify-center"
        value={mode} onChange={setMode}
        options={[{ value: 'signup', label: 'Criar conta', icon: UserPlus }, { value: 'login', label: 'Já tenho conta', icon: LogIn }]}
      />
      {waitingEmail && (
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />Enviamos um link de confirmação para {f.email}. Depois de confirmar, entre aqui.
        </div>
      )}
      {mode === 'signup' ? (
        <form onSubmit={signup} className="space-y-3">
          <Field label="Nome completo"><Input value={f.name} onChange={set('name')} autoComplete="name" required /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="WhatsApp (com DDD)"><Input value={f.whatsapp} onChange={set('whatsapp')} inputMode="tel" autoComplete="tel" placeholder="(14) 99999-9999" required /></Field>
            <Field label="Data de nascimento"><Input type="date" value={f.birthDate} onChange={set('birthDate')} required /></Field>
          </div>
          <Field label="E-mail"><Input type="email" value={f.email} onChange={set('email')} autoComplete="email" required /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Senha (mín. 6)"><Input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" minLength={6} required /></Field>
            <Field label="Repita a senha"><Input type="password" value={f.password2} onChange={set('password2')} autoComplete="new-password" required /></Field>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Criando…' : 'Criar conta e continuar'}</Button>
        </form>
      ) : (
        <form onSubmit={login} className="space-y-3">
          <Field label="E-mail"><Input type="email" value={f.email} onChange={set('email')} autoComplete="email" required /></Field>
          <Field label="Senha"><Input type="password" value={f.password} onChange={set('password')} autoComplete="current-password" required /></Field>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</Button>
        </form>
      )}
      {backendKind === 'local' && (
        <div className="mt-4 border-t border-mist-100 pt-4 text-center">
          <Button variant="soft" size="sm" icon={Sparkles} onClick={() => run(authApi.signInDemo)}>Entrar como cliente de demonstração</Button>
          <p className="mt-2 text-xs text-graphite-400">Modo de testes: entra como Marina Souza, sem senha.</p>
        </div>
      )}
    </div>
  );
}
