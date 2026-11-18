-- GARRIDO ESTÉTICA – esquema PostgreSQL para o Supabase
-- Como aplicar: Supabase → SQL Editor → cole este arquivo inteiro → Run. Depois rode seed.sql.
-- Campos em snake_case espelham o app (camelCase): client_id ↔ clientId.
--
-- Quem pode o quê (RLS):
--   equipe (app_metadata.role = 'admin' | 'professional')  → tudo
--   cliente logado no portal                                → catálogo + os PRÓPRIOS dados;
--                                                             agenda alheia só como "ocupado" (busy_slots)
--   visitante sem login                                     → catálogo e horários livres

create extension if not exists btree_gist;

-- ===================== Configuração =====================
create table clinic_settings (
  id uuid primary key default gen_random_uuid(),
  clinic_name text not null default 'Garrido Estética',
  whatsapp text,
  address text,
  timezone text not null default 'America/Sao_Paulo',
  slot_step_min int not null default 15,
  buffer_min int not null default 10,
  min_cancel_hours int not null default 24,
  min_advance_min int not null default 60,
  booking_window_days int not null default 60,
  consent_text text not null default ''
);

create table business_hours (
  weekday smallint primary key check (weekday between 0 and 6),
  closed boolean not null default false,
  open time, close time,
  break_start time, break_end time
);

-- ===================== Equipe e catálogo =====================
create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  price numeric(10,2) not null default 0,
  duration_min int not null check (duration_min > 0),
  requires_consent boolean not null default false,
  active boolean not null default true
);

create table professionals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  title text,
  color text not null default '#1e3a6e',
  whatsapp text,                              -- recebe o aviso de quem agendou pelo link
  service_ids uuid[] not null default '{}',   -- procedimentos que realiza
  active boolean not null default true
);

create table time_blocks (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references professionals(id) on delete cascade,
  date date not null,
  start time not null,
  "end" time not null check ("end" > start),
  reason text
);

create table package_plans (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id),
  name text not null,
  sessions int not null check (sessions > 0),
  price numeric(10,2) not null,
  validity_days int,
  active boolean not null default true
);

-- ===================== Clientes e prontuário =====================
create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,  -- conta do portal (opcional)
  name text not null,
  whatsapp text,
  email text,
  birth_date date,
  notes text,
  created_at timestamptz not null default now()
);
create index on clients (whatsapp);

create table anamneses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references clients(id) on delete cascade,
  main_complaint text, goal text,
  health jsonb not null default '{}',
  allergies text, medications text,
  habits jsonb not null default '{}',
  facial_eval jsonb not null default '{}',
  body_eval jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table client_packages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  package_plan_id uuid references package_plans(id),
  service_id uuid not null references services(id),
  total_sessions int not null,
  used_sessions int not null default 0 check (used_sessions between 0 and total_sessions),
  price_paid numeric(10,2) not null,
  payment_method text,
  sold_at date not null default current_date,
  expires_at date
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  professional_id uuid not null references professionals(id),
  service_id uuid not null references services(id),
  date date not null,
  start time not null,
  "end" time not null,
  status text not null default 'agendado'
    check (status in ('agendado','confirmado','em_atendimento','concluido','faltou','cancelado')),
  source text not null default 'interno' check (source in ('online','interno')),
  price numeric(10,2) not null default 0,
  client_package_id uuid references client_packages(id),
  payment_method text,
  notes text,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  -- dois atendimentos ativos nunca se sobrepõem para o mesmo profissional (erro 23P01)
  constraint sem_sobreposicao exclude using gist (
    professional_id with =,
    tsrange(date + start, date + "end") with &&
  ) where (status not in ('faltou','cancelado'))
);
create index on appointments (professional_id, date);
create index on appointments (client_id, date);

create table session_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  service_id uuid references services(id),
  date date not null,
  protocol text, text text, reactions text
);

create table evolution_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  taken_at date not null,
  kind text not null check (kind in ('antes','depois')),
  area text,
  storage_path text,     -- arquivo no bucket privado "evolucao"
  notes text
);

create table consent_terms (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  service_id uuid references services(id),
  appointment_id uuid references appointments(id) on delete set null,
  term_text text not null,
  signature text,
  accepted_at timestamptz not null default now(),
  accepted_via text not null check (accepted_via in ('portal','clinica'))
);

create table waitlist (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  whatsapp text,
  service_id uuid references services(id),
  preferred_period text,
  notes text,
  created_at timestamptz not null default now()
);

-- ===================== Financeiro =====================
create table transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('entrada','saida')),
  category text not null,
  description text,
  amount numeric(10,2) not null check (amount >= 0),
  method text,
  status text not null default 'pago' check (status in ('pago','pendente')),
  due_date date,
  paid_at date,
  appointment_id uuid unique references appointments(id) on delete set null,
  client_package_id uuid references client_packages(id) on delete set null,
  professional_id uuid references professionals(id),
  created_at timestamptz not null default now()
);
create index on transactions (paid_at);

-- ===================== Funções auxiliares =====================
create or replace function is_staff() returns boolean language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'professional')
$$;

create or replace function my_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from clients where user_id = auth.uid()
$$;

-- Horários ocupados para o portal calcular vagas, sem expor quem é o cliente.
create or replace function busy_slots(from_date date)
returns table (id uuid, professional_id uuid, date date, start time, "end" time, status text)
language sql stable security definer set search_path = public as $$
  select a.id, a.professional_id, a.date, a.start, a."end", a.status
  from appointments a
  where a.date >= from_date and a.status in ('agendado','confirmado','em_atendimento','concluido')
$$;

-- Bloqueios de agenda sem o motivo (o motivo é privado da equipe).
create or replace function public_time_blocks(from_date date)
returns table (id uuid, professional_id uuid, date date, start time, "end" time)
language sql stable security definer set search_path = public as $$
  select b.id, b.professional_id, b.date, b.start, b."end" from time_blocks b where b.date >= from_date
$$;

-- Cadastro no portal: cria (ou vincula pelo WhatsApp/e-mail) o registro em clients.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_phone text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'whatsapp', ''), '\D', '', 'g');
  v_id uuid;
begin
  if coalesce(new.raw_app_meta_data ->> 'role', '') in ('admin', 'professional') then
    return new;
  end if;
  select id into v_id from clients
   where user_id is null and ((v_phone <> '' and whatsapp = v_phone) or lower(email) = lower(new.email))
   limit 1;
  if v_id is not null then
    update clients set user_id = new.id, email = coalesce(email, new.email) where id = v_id;
  else
    insert into clients (user_id, name, whatsapp, email, birth_date, notes)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), v_phone, new.email,
            nullif(new.raw_user_meta_data ->> 'birth_date', '')::date, 'Cadastro pelo portal');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Verdadeiro só dentro da função public_book (agendamento pelo link, sem login).
create or replace function via_link() returns boolean language sql stable as $
  select coalesce(current_setting('app.agendamento_link', true), '') = 'on'
$;

-- Regras do portal aplicadas NO SERVIDOR (o app também valida, mas o banco é a palavra final).
create or replace function guard_client_appointment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s clinic_settings%rowtype;
  v_dur int; v_price numeric;
  v_now timestamp;
begin
  if is_staff() then return new; end if;
  select * into s from clinic_settings limit 1;
  v_now := now() at time zone s.timezone;

  if tg_op = 'INSERT' then
    if new.client_id is distinct from my_client_id() and not via_link() then raise exception 'Agendamento de outro cliente.'; end if;
    select duration_min, price into v_dur, v_price from services where id = new.service_id and active;
    if v_dur is null then raise exception 'Procedimento indisponível.'; end if;
    if new.date + new.start < v_now + make_interval(mins => s.min_advance_min) then
      raise exception 'Escolha um horário com pelo menos % min de antecedência.', s.min_advance_min;
    end if;
    if new.date > (v_now::date + s.booking_window_days) then raise exception 'Data fora da janela de agendamento.'; end if;
    new.source := 'online'; new.status := 'agendado'; new.price := v_price;
    new."end" := new.start + make_interval(mins => v_dur);
    new.client_package_id := null; new.payment_method := null;
    return new;
  end if;

  -- UPDATE pelo cliente: só cancelar ou remarcar, com antecedência mínima
  if old.client_id is distinct from my_client_id() then raise exception 'Agendamento de outro cliente.'; end if;
  if old.status not in ('agendado','confirmado') or old.date + old.start < v_now + make_interval(hours => s.min_cancel_hours) then
    raise exception 'Alterações pelo portal só com % h de antecedência.', s.min_cancel_hours;
  end if;
  if new.client_id <> old.client_id or new.service_id <> old.service_id or new.price <> old.price
     or new.source <> old.source or new.client_package_id is distinct from old.client_package_id then
    raise exception 'Alteração não permitida.';
  end if;
  if new.status = 'cancelado' then
    new.cancelled_at := now();
  elsif new.status in ('agendado','confirmado') then
    select duration_min into v_dur from services where id = old.service_id;
    if new.date + new.start < v_now + make_interval(mins => s.min_advance_min) then raise exception 'Horário muito próximo.'; end if;
    new."end" := new.start + make_interval(mins => v_dur);
    new.status := 'agendado';
  else
    raise exception 'Alteração não permitida.';
  end if;
  return new;
end $$;
create trigger guard_client_appointment before insert or update on appointments
  for each row execute function guard_client_appointment();

create or replace function guard_client_consent() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if is_staff() then return new; end if;
  if new.client_id is distinct from my_client_id() and not via_link() then raise exception 'Termo de outro cliente.'; end if;
  new.accepted_via := 'portal'; new.accepted_at := now();
  new.term_text := (select consent_text from clinic_settings limit 1);
  return new;
end $$;
create trigger guard_client_consent before insert on consent_terms
  for each row execute function guard_client_consent();

-- ===================== Agendamento pelo link (sem login) =====================
-- A cliente informa só nome e WhatsApp. Tudo é conferido aqui no servidor; os gatilhos acima
-- ainda aplicam antecedência mínima, janela de agendamento, preço e duração da tabela.
create or replace function public_book(
  p_appointment_id uuid, p_client_id uuid, p_name text, p_whatsapp text,
  p_service_id uuid, p_professional_id uuid, p_date date, p_start time,
  p_notes text default '', p_consent boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $
declare
  v_phone text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  v_name text := left(trim(coalesce(p_name, '')), 80);
  v_appt uuid := coalesce(p_appointment_id, gen_random_uuid());
  v_client uuid;
  v_svc services%rowtype;
  h business_hours%rowtype;
  v_end time;
begin
  if length(v_name) < 2 then raise exception 'Informe seu nome.'; end if;
  if length(v_phone) not between 10 and 11 then raise exception 'Informe o WhatsApp com DDD.'; end if;
  select * into v_svc from services where id = p_service_id and active;
  if not found then raise exception 'Procedimento indisponível.'; end if;
  if not exists (select 1 from professionals where id = p_professional_id and active and p_service_id = any(service_ids)) then
    raise exception 'Profissional indisponível para este procedimento.';
  end if;
  if v_svc.requires_consent and not coalesce(p_consent, false) then
    raise exception 'Para este procedimento é preciso aceitar o termo de consentimento.';
  end if;

  v_end := p_start + make_interval(mins => v_svc.duration_min);
  select * into h from business_hours where weekday = extract(dow from p_date)::smallint;
  if not found or h.closed or p_start < h.open or v_end > h.close or v_end <= p_start then
    raise exception 'Horário fora do atendimento da clínica.';
  end if;
  if h.break_start is not null and h.break_end is not null and p_start < h.break_end and v_end > h.break_start then
    raise exception 'Horário no intervalo de almoço.';
  end if;
  if exists (select 1 from time_blocks b where b.professional_id = p_professional_id and b.date = p_date and p_start < b."end" and v_end > b.start) then
    raise exception 'A profissional não atende neste horário.';
  end if;

  -- mesma ficha para o mesmo WhatsApp
  select id into v_client from clients where regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g') = v_phone order by created_at limit 1;
  if v_client is null then
    insert into clients (id, name, whatsapp, notes) values (coalesce(p_client_id, gen_random_uuid()), v_name, v_phone, 'Agendou pelo link')
    returning id into v_client;
  end if;

  perform set_config('app.agendamento_link', 'on', true);
  insert into appointments (id, client_id, professional_id, service_id, date, start, "end", status, source, price, notes)
  values (v_appt, v_client, p_professional_id, p_service_id, p_date, p_start, v_end, 'agendado', 'online', v_svc.price, nullif(left(coalesce(p_notes, ''), 500), ''));
  if v_svc.requires_consent then
    insert into consent_terms (client_id, service_id, appointment_id, term_text, accepted_via)
    values (v_client, p_service_id, v_appt, '', 'portal');
  end if;
  perform set_config('app.agendamento_link', '', true);
  return v_appt;
end $;
revoke all on function public_book(uuid, uuid, text, text, uuid, uuid, date, time, text, boolean) from public;
grant execute on function public_book(uuid, uuid, text, text, uuid, uuid, date, time, text, boolean) to anon, authenticated;

-- ===================== RLS =====================
do $$
declare t text;
begin
  foreach t in array array['clinic_settings','business_hours','services','professionals','time_blocks','package_plans',
    'clients','anamneses','client_packages','appointments','session_notes','evolution_photos','consent_terms','waitlist','transactions']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy equipe_total on %I for all to authenticated using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

-- Catálogo e configuração: leitura pública (portal sem login também precisa)
create policy leitura_publica on clinic_settings for select using (true);
create policy leitura_publica on business_hours for select using (true);
create policy leitura_publica on services for select using (active);
create policy leitura_publica on professionals for select using (active);
create policy leitura_publica on package_plans for select using (active);

-- Cliente do portal: os próprios dados
create policy proprio_cadastro on clients for select to authenticated using (user_id = auth.uid());
create policy proprios_agendamentos on appointments for select to authenticated using (client_id = my_client_id());
create policy agendar_online on appointments for insert to authenticated with check (client_id = my_client_id());
create policy alterar_proprio on appointments for update to authenticated using (client_id = my_client_id()) with check (client_id = my_client_id());
create policy proprios_pacotes on client_packages for select to authenticated using (client_id = my_client_id());
create policy proprios_termos on consent_terms for select to authenticated using (client_id = my_client_id());
create policy aceitar_termo on consent_terms for insert to authenticated with check (client_id = my_client_id());

grant execute on function busy_slots(date), public_time_blocks(date) to anon, authenticated;

-- ===================== Fotos (Storage) =====================
insert into storage.buckets (id, name, public) values ('evolucao', 'evolucao', false) on conflict do nothing;
create policy fotos_equipe on storage.objects for all to authenticated
  using (bucket_id = 'evolucao' and is_staff()) with check (bucket_id = 'evolucao' and is_staff());
