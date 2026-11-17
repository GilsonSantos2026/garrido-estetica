// Autenticação. Mesma interface para os dois modos:
//   getSession(db)            → { userId, email, role, clientId } | null
//   signIn({email,password}, ctx) / signUp(form, ctx) → { session, needsConfirmation? }
//   signInDemo(ctx)           → só no modo local
//   signOut()
// role: 'client' (portal) | 'admin' | 'professional' (equipe). ctx = { db, act }.
import { AppError } from '../store/actions.js';

// ===== Modo local (protótipo): senha com PBKDF2, guardada só como hash + sal =====
const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function hashPassword(password, saltHex) {
  const salt = saltHex || toHex(crypto.getRandomValues(new Uint8Array(16)));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256);
  return { passwordHash: toHex(bits), salt };
}

async function verifyPassword(user, password) {
  if (!user?.passwordHash || !user?.salt) return false;
  const { passwordHash } = await hashPassword(password, user.salt);
  return passwordHash === user.passwordHash;
}

const SESSION_KEY = 'garrido-portal-session';
const store = {
  get() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
  },
  set(v) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(v)); } catch { /* modo privado */ }
  },
  clear() {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* idem */ }
  },
};

export function createLocalAuth() {
  const toSession = (u) => (u ? { userId: u.id, email: u.email, role: u.role, clientId: u.clientId } : null);
  return {
    kind: 'local',
    async getSession(db) {
      const s = store.get();
      return toSession(s && db.users.find((u) => u.id === s.userId));
    },
    async signIn({ email, password }, { db }) {
      const u = db.users.find((x) => x.email === email.trim().toLowerCase());
      if (!(await verifyPassword(u, password))) throw new AppError('E-mail ou senha incorretos.');
      store.set({ userId: u.id });
      return { session: toSession(u) };
    },
    async signUp(form, { act }) {
      if (form.password.length < 6) throw new AppError('A senha precisa ter pelo menos 6 caracteres.');
      const { passwordHash, salt } = await hashPassword(form.password);
      const u = act.registerPortalUser({ ...form, passwordHash, salt });
      store.set({ userId: u.id });
      return { session: toSession(u) };
    },
    async signInDemo(_args, { db }) {
      const u = db.users.find((x) => x.demo);
      if (!u) throw new AppError('Conta de demonstração indisponível.');
      store.set({ userId: u.id });
      return { session: toSession(u) };
    },
    async signOut() {
      store.clear();
    },
  };
}

// ===== Modo Supabase: Supabase Auth cuida de senha, sessão e recuperação de acesso =====
export function createSupabaseAuth(client) {
  const toSession = (user, db) => {
    if (!user) return null;
    const role = user.app_metadata?.role || 'client';
    const me = db?.clients.find((c) => c.userId === user.id);
    return { userId: user.id, email: user.email, role, clientId: me?.id || null };
  };
  const msg = (e) => {
    if (/invalid login/i.test(e.message)) return 'E-mail ou senha incorretos.';
    if (/already registered/i.test(e.message)) return 'Já existe uma conta com este e-mail. Use "Já tenho conta".';
    if (/email not confirmed/i.test(e.message)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
    if (/password/i.test(e.message)) return 'A senha precisa ter pelo menos 6 caracteres.';
    return e.message;
  };
  return {
    kind: 'supabase',
    async getSession(db) {
      const { data } = await client.auth.getUser();
      return toSession(data.user, db);
    },
    async signIn({ email, password }) {
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new AppError(msg(error));
      return { session: toSession(data.user) };
    },
    async signUp({ name, whatsapp, email, birthDate, password }) {
      const phone = (whatsapp || '').replace(/\D/g, '');
      if (!name?.trim()) throw new AppError('Informe seu nome.');
      if (phone.length < 10) throw new AppError('Informe o WhatsApp com DDD.');
      if (!birthDate) throw new AppError('Informe a data de nascimento.');
      // O gatilho handle_new_user (schema.sql) cria ou vincula o cadastro em "clients".
      const { data, error } = await client.auth.signUp({
        email: email.trim(), password,
        options: { data: { name: name.trim(), whatsapp: phone, birth_date: birthDate } },
      });
      if (error) throw new AppError(msg(error));
      return { session: data.session ? toSession(data.user) : null, needsConfirmation: !data.session };
    },
    async signInDemo() {
      throw new AppError('No banco real não há conta de demonstração.');
    },
    async signOut() {
      await client.auth.signOut();
    },
  };
}
