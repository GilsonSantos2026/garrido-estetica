import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useStore } from '../../store/StoreContext.jsx';
import { Button, Field, Input } from '../../components/ui.jsx';

/** Login da equipe (modo Supabase). A permissão vem do campo role em app_metadata do usuário. */
export default function StaffLogin() {
  const { authApi, session, notify } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const out = await authApi.signIn({ email, password });
    setBusy(false);
    if (out?.session && !['admin', 'professional'].includes(out.session.role)) {
      notify('Esta conta não tem acesso ao painel da clínica.', 'error');
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div className="text-center">
          <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-600"><Lock className="h-5 w-5" /></span>
          <h1 className="text-2xl font-bold">Acesso da equipe</h1>
          <p className="text-sm text-graphite-500">Agenda, prontuários e financeiro.</p>
        </div>
        {session && <p className="rounded-xl bg-amber-50 p-2 text-center text-xs text-amber-900">Você está logado como cliente ({session.email}). Saia pelo portal para entrar como equipe.</p>}
        <Field label="E-mail"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></Field>
        <Field label="Senha"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></Field>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</Button>
      </form>
    </div>
  );
}
