import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { applyOps } from '../data/repository.js';
import * as actions from './actions.js';

const StoreCtx = createContext(null);

/**
 * Mantém o banco em memória, grava cada alteração pelo repositório e guarda a sessão de login.
 * Componentes usam: const { db, act, tryAct, notify, session, authApi, backendKind } = useStore();
 */
export function StoreProvider({ backend, children }) {
  const { repository, auth } = backend;
  const [db, setDb] = useState(null);
  const [session, setSession] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const ref = useRef(null);
  const queue = useRef(Promise.resolve()); // grava uma alteração de cada vez, na ordem

  const notify = useCallback((message, kind = 'ok') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const reload = useCallback(async () => {
    const { db: loaded, notice } = await repository.load();
    ref.current = loaded;
    setDb(loaded);
    setSession(await auth.getSession(loaded));
    return notice;
  }, [repository, auth]);

  useEffect(() => {
    reload()
      .then((notice) => notice && notify(notice))
      .catch((e) => setLoadError(e.message || String(e)));
  }, [reload, notify]);

  const commit = useCallback((ops) => {
    if (!ops.length) return;
    const before = ref.current;
    const next = applyOps(before, ops);
    ref.current = next;
    setDb(next);
    // Atualização otimista: se o banco recusar, avisa e recarrega o estado real.
    queue.current = queue.current.then(() => repository.commit(ops, ref.current)).catch((e) => {
      notify(e.message, 'error');
      if (repository.kind === 'supabase') reload().catch(() => {});
      else { ref.current = before; setDb(before); }
    });
  }, [repository, notify, reload]);

  const act = useMemo(() => {
    const bound = {};
    for (const [name, fn] of Object.entries(actions)) {
      if (typeof fn !== 'function' || name[0] === name[0].toUpperCase()) continue;
      bound[name] = (args) => {
        const out = fn(ref.current, args);
        if (out && Array.isArray(out.ops)) {
          commit(out.ops);
          return out.result;
        }
        return out;
      };
    }
    bound.reset = async () => {
      const fresh = await repository.reset();
      ref.current = fresh;
      setDb(fresh);
      setSession(await auth.getSession(fresh));
      notify('Dados de demonstração restaurados.');
    };
    return bound;
  }, [commit, repository, auth, notify]);

  /** Executa uma ação mostrando o erro de validação como aviso. Devolve undefined se falhar. */
  const tryAct = useCallback((name, args, successMsg) => {
    try {
      const r = act[name](args);
      if (successMsg) notify(successMsg);
      return r ?? true;
    } catch (e) {
      if (e instanceof actions.AppError) notify(e.message, 'error');
      else throw e;
      return undefined;
    }
  }, [act, notify]);

  /** Login / cadastro / saída. Depois de entrar, recarrega o banco com as permissões do usuário. */
  const authApi = useMemo(() => {
    const wrap = (fn) => async (args) => {
      try {
        const out = await fn(args, { db: ref.current, act });
        if (out?.needsConfirmation) {
          notify('Conta criada! Confirme seu e-mail pelo link que enviamos e depois entre.');
          return out;
        }
        if (repository.kind === 'supabase') await reload();
        else setSession(await auth.getSession(ref.current));
        return out;
      } catch (e) {
        notify(e.message, 'error');
        return undefined;
      }
    };
    return {
      signIn: wrap(auth.signIn),
      signUp: wrap(auth.signUp),
      signInDemo: wrap(auth.signInDemo),
      signOut: async () => {
        await auth.signOut();
        setSession(null);
        if (repository.kind === 'supabase') await reload();
      },
    };
  }, [auth, act, notify, reload, repository]);

  const value = useMemo(() => ({
    db, act, tryAct, notify, toasts, session, authApi, loadError, backendKind: repository.kind || 'local',
  }), [db, act, tryAct, notify, toasts, session, authApi, loadError, repository]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export const useStore = () => useContext(StoreCtx);

/** Atalhos de leitura usados em várias telas. */
export function useLookup() {
  const { db } = useStore();
  return useMemo(() => {
    const idx = (arr) => Object.fromEntries(arr.map((r) => [r.id, r]));
    const clients = idx(db.clients);
    const services = idx(db.services);
    const professionals = idx(db.professionals);
    return {
      client: (id) => clients[id] || { name: '—', whatsapp: '' },
      service: (id) => services[id] || { name: '—', price: 0, durationMin: 30 },
      professional: (id) => professionals[id] || { name: '—', color: '#999' },
    };
  }, [db]);
}
