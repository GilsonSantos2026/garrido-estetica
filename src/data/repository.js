// Camada de persistência.
//
// O app nunca fala direto com o localStorage: ele chama um "repositório" com esta interface.
// Para ir para o Supabase/Firebase, basta criar outro repositório com os mesmos métodos
// (ver ./supabaseRepository.js; a escolha entre os dois fica em ./backend.js).
//
// interface Repository {
//   load(): Promise<Db>                         carrega todas as tabelas
//   commit(ops: Op[], nextDb: Db): Promise<void> grava as alterações
//   reset(): Promise<Db>                         volta aos dados de exemplo (só no protótipo)
// }
// type Op =
//   | { op: 'insert', table, row }
//   | { op: 'update', table, id, patch }
//   | { op: 'remove', table, id }
//   | { op: 'settings', patch }
import { buildSeed, emptyDb, DB_VERSION } from './seed.js';
import { migrateLegacy, LEGACY_KEY } from './migrateLegacy.js';

const KEY = 'garrido-estetica-v2';

const read = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null');
  } catch {
    return null;
  }
};

export function createLocalStorageRepository() {
  return {
    kind: 'local',
    async load() {
      const saved = read(KEY);
      if (saved && saved.version === DB_VERSION) return { db: { ...emptyDb(), ...saved }, notice: null };
      // Primeira abertura da v2 num aparelho que já tinha o app antigo: importa os dados reais.
      const legacy = read(LEGACY_KEY);
      if (legacy && Array.isArray(legacy.clients)) {
        const db = migrateLegacy(legacy);
        persist(db);
        return { db, notice: `Importamos ${db.clients.length} clientes e ${db.appointments.length} agendamentos do app anterior.` };
      }
      const db = buildSeed();
      persist(db);
      return { db, notice: null };
    },
    async commit(_ops, nextDb) {
      persist(nextDb);
    },
    async reset() {
      const db = buildSeed();
      persist(db);
      return db;
    },
  };
}

function persist(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    // Cota do navegador (~5 MB) estourada, normalmente por excesso de fotos.
    throw new Error('Não foi possível salvar: o armazenamento do aparelho está cheio. Remova algumas fotos da galeria.', { cause: e });
  }
}

/** Aplica operações num banco em memória (imutável). Usado por qualquer repositório. */
export function applyOps(db, ops) {
  const next = { ...db };
  for (const o of ops) {
    if (o.op === 'settings') {
      next.settings = { ...next.settings, ...o.patch };
    } else if (o.op === 'insert') {
      next[o.table] = [...next[o.table], o.row];
    } else if (o.op === 'update') {
      next[o.table] = next[o.table].map((r) => (r.id === o.id ? { ...r, ...o.patch } : r));
    } else if (o.op === 'remove') {
      next[o.table] = next[o.table].filter((r) => r.id !== o.id);
    }
  }
  return next;
}
