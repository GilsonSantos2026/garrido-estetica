// Repositório Supabase: mesma interface do localStorage (load / commit), sobre o PostgreSQL.
// Ativado automaticamente quando VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY existem (ver src/data/backend.js).
//
// Segurança: quem decide o que cada pessoa vê é o banco (RLS em supabase/schema.sql).
// - Equipe (role admin/professional): lê e grava tudo.
// - Cliente do portal: lê catálogo, horários e os PRÓPRIOS dados; para calcular horários livres
//   recebe só os intervalos ocupados (função busy_slots), sem nome de ninguém.
import { emptyDb } from './seed.js';

// coleção do app → tabela do banco
const TABLES = {
  professionals: 'professionals', services: 'services', packagePlans: 'package_plans', timeBlocks: 'time_blocks',
  clients: 'clients', appointments: 'appointments', clientPackages: 'client_packages', waitlist: 'waitlist',
  anamneses: 'anamneses', sessionNotes: 'session_notes', evolutionPhotos: 'evolution_photos',
  consentTerms: 'consent_terms', transactions: 'transactions',
};
const TIME_FIELDS = ['start', 'end', 'open', 'close', 'breakStart', 'breakEnd'];
const PHOTO_BUCKET = 'evolucao';

const snake = (s) => s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
const camel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

/** Linha do banco → objeto do app ("09:00:00" vira "09:00"). */
function fromRow(row) {
  const o = {};
  for (const [k, v] of Object.entries(row)) {
    const key = camel(k);
    o[key] = TIME_FIELDS.includes(key) && typeof v === 'string' ? v.slice(0, 5) : v;
  }
  return o;
}
/** Objeto do app → linha do banco ('' vira null para datas/horas). */
function toRow(obj) {
  const o = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'dataUrl') continue; // foto vai para o Storage
    o[snake(k)] = v === '' ? null : v;
  }
  return o;
}

async function dataUrlToBlob(dataUrl) {
  return (await fetch(dataUrl)).blob();
}

export function createSupabaseRepository(client) {
  const loadSettings = async () => {
    const [{ data: s, error: e1 }, { data: hours, error: e2 }] = await Promise.all([
      client.from('clinic_settings').select('*').limit(1).maybeSingle(),
      client.from('business_hours').select('*'),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    const settings = { ...emptyDb().settings, ...(s ? fromRow(s) : {}) };
    if (hours?.length) {
      settings.businessHours = Object.fromEntries(hours.map((h) => {
        const r = fromRow(h);
        return [r.weekday, { closed: r.closed, open: r.open || '09:00', close: r.close || '18:00', breakStart: r.breakStart || '', breakEnd: r.breakEnd || '' }];
      }));
    }
    return settings;
  };

  const signPhotos = async (photos) => {
    const paths = photos.map((p) => p.storagePath).filter(Boolean);
    if (!paths.length) return photos;
    const { data } = await client.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 60 * 60);
    const urls = Object.fromEntries((data || []).map((d) => [d.path, d.signedUrl]));
    return photos.map((p) => ({ ...p, dataUrl: urls[p.storagePath] || '' }));
  };

  return {
    kind: 'supabase',
    async load() {
      const db = emptyDb();
      db.settings = await loadSettings();
      await Promise.all(Object.entries(TABLES).map(async ([key, table]) => {
        const { data, error } = await client.from(table).select('*');
        // Sem permissão (RLS) = lista vazia: o cliente do portal não lê tabelas da equipe.
        db[key] = error ? [] : data.map(fromRow);
      }));
      db.evolutionPhotos = await signPhotos(db.evolutionPhotos);
      const today = new Date().toISOString().slice(0, 10);
      if (!db.timeBlocks.length) {
        // Portal: bloqueios chegam sem o motivo (privado da equipe)
        const { data: blocks } = await client.rpc('public_time_blocks', { from_date: today });
        db.timeBlocks = (blocks || []).map(fromRow);
      }

      // Portal: agendamentos de outras pessoas chegam só como intervalos ocupados, anônimos.
      const { data: busy } = await client.rpc('busy_slots', { from_date: today });
      const known = new Set(db.appointments.map((a) => a.id));
      for (const b of busy || []) {
        const r = fromRow(b);
        if (!known.has(r.id)) db.appointments.push({ ...r, clientId: null, serviceId: null, source: 'interno', price: 0 });
      }
      // Sessão do portal: o próprio usuário logado vira o "users" do app
      const { data: { user } } = await client.auth.getUser();
      const me = user && db.clients.find((c) => c.userId === user.id);
      db.users = me ? [{ id: user.id, role: 'client', email: user.email, clientId: me.id, demo: false }] : [];
      return { db, notice: null };
    },

    async commit(ops) {
      // Operações em sequência. Ações compostas (concluir = status + caixa + pacote) devem virar
      // funções RPC transacionais quando o volume crescer; os gatilhos do banco já validam as regras.
      // Agendamento pelo link (visitante sem login): uma função segura do banco faz tudo de uma vez
      if (ops[0]?.op === 'rpc' && ops[0].covers) {
        const { error } = await client.rpc(ops[0].fn, ops[0].args);
        if (error) throw new Error(friendly(error));
        return;
      }
      for (const o of ops) {
        if (o.op === 'rpc') continue;
        if (o.op === 'settings') {
          const { businessHours, ...rest } = o.patch;
          if (Object.keys(rest).length) {
            const { error } = await client.from('clinic_settings').update(toRow(rest)).not('id', 'is', null);
            if (error) throw error;
          }
          if (businessHours) {
            const rows = Object.entries(businessHours).map(([weekday, h]) => toRow({ weekday: Number(weekday), ...h }));
            const { error } = await client.from('business_hours').upsert(rows);
            if (error) throw error;
          }
          continue;
        }
        if (o.table === 'users') continue; // contas são do Supabase Auth
        const table = TABLES[o.table];
        let res;
        if (o.op === 'insert') {
          const row = { ...o.row };
          if (o.table === 'evolutionPhotos' && row.dataUrl?.startsWith('data:')) {
            row.storagePath = `${row.clientId}/${row.id}.jpg`;
            const up = await client.storage.from(PHOTO_BUCKET).upload(row.storagePath, await dataUrlToBlob(row.dataUrl), { contentType: 'image/jpeg' });
            if (up.error) throw up.error;
          }
          res = await client.from(table).insert(toRow(row));
        }
        if (o.op === 'update') res = await client.from(table).update(toRow(o.patch)).eq('id', o.id);
        if (o.op === 'remove') res = await client.from(table).delete().eq('id', o.id);
        if (res?.error) throw new Error(friendly(res.error));
      }
    },

    async reset() {
      throw new Error('No banco real não há "restaurar dados de exemplo".');
    },
  };
}

function friendly(e) {
  if (e.code === '23P01') return 'Esse horário acabou de ser ocupado. Escolha outro.';
  if (e.code === '42501') return 'Sem permissão para esta ação.';
  if (e.message?.includes('antecedência')) return e.message;
  return `Erro ao salvar: ${e.message}`;
}
