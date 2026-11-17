// Escolhe onde os dados ficam:
// - Sem configuração → modo protótipo (localStorage, dados fictícios, login simulado).
// - Com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (arquivo .env.local) → banco real no Supabase.
// A chave "anon" é pública por natureza; a proteção real são as regras RLS do banco.
import { createLocalStorageRepository } from './repository.js';
import { createLocalAuth, createSupabaseAuth } from './auth.js';

export async function createBackend() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (url && key) {
    // Carregado só quando necessário: o modo protótipo não baixa a biblioteca.
    const [{ createClient }, { createSupabaseRepository }] = await Promise.all([
      import('@supabase/supabase-js'),
      import('./supabaseRepository.js'),
    ]);
    const client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
    return { kind: 'supabase', repository: createSupabaseRepository(client), auth: createSupabaseAuth(client) };
  }
  return { kind: 'local', repository: createLocalStorageRepository(), auth: createLocalAuth() };
}
