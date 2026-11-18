-- Migração 002 · Agendamento pelo link (cliente informa só nome e WhatsApp, sem login)
-- Aplicar UMA vez no projeto que já tem o schema.sql (SQL Editor → Run). Pode rodar de novo sem problema.
-- Instalações novas: o schema.sql já contém tudo isto.

alter table professionals add column if not exists whatsapp text;

-- Verdadeiro só dentro da função public_book (agendamento pelo link, sem login).
create or replace function via_link() returns boolean language sql stable as $$
  select coalesce(current_setting('app.agendamento_link', true), '') = 'on'
$$;

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

create or replace function guard_client_consent() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if is_staff() then return new; end if;
  if new.client_id is distinct from my_client_id() and not via_link() then raise exception 'Termo de outro cliente.'; end if;
  new.accepted_via := 'portal'; new.accepted_at := now();
  new.term_text := (select consent_text from clinic_settings limit 1);
  return new;
end $$;

-- ===================== Agendamento pelo link (sem login) =====================
-- A cliente informa só nome e WhatsApp. Tudo é conferido aqui no servidor; os gatilhos acima
-- ainda aplicam antecedência mínima, janela de agendamento, preço e duração da tabela.
create or replace function public_book(
  p_appointment_id uuid, p_client_id uuid, p_name text, p_whatsapp text,
  p_service_id uuid, p_professional_id uuid, p_date date, p_start time,
  p_notes text default '', p_consent boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
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
end $$;
revoke all on function public_book(uuid, uuid, text, text, uuid, uuid, date, time, text, boolean) from public;
grant execute on function public_book(uuid, uuid, text, text, uuid, uuid, date, time, text, boolean) to anon, authenticated;
