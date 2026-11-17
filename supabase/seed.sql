-- Dados iniciais (configuração e catálogo). Rode DEPOIS de schema.sql.
-- Clientes e agendamentos reais nascem pelo uso; nada fictício aqui.
-- Ajuste nomes, preços e profissionais pelo painel (Ajustes) depois.

insert into clinic_settings (clinic_name, whatsapp, address, consent_text) values (
  'Garrido Estética', '', '',
  'Declaro que as informações prestadas na ficha de anamnese são verdadeiras. Fui informado(a) sobre o procedimento, seus objetivos, riscos, possíveis reações e cuidados pré e pós-procedimento, e tive a oportunidade de esclarecer minhas dúvidas. Autorizo a realização do procedimento e o registro fotográfico para acompanhamento da evolução, de uso exclusivo do prontuário.'
);

insert into business_hours (weekday, closed, open, close, break_start, break_end) values
  (0, true,  '09:00', '13:00', null, null),
  (1, false, '09:00', '19:00', '12:00', '13:00'),
  (2, false, '09:00', '19:00', '12:00', '13:00'),
  (3, false, '09:00', '19:00', '12:00', '13:00'),
  (4, false, '09:00', '19:00', '12:00', '13:00'),
  (5, false, '09:00', '19:00', '12:00', '13:00'),
  (6, false, '09:00', '14:00', null, null);

with s as (
  insert into services (name, category, description, price, duration_min, requires_consent) values
    ('Limpeza de pele profunda', 'Facial', 'Higienização, extração e máscara calmante.', 150, 60, false),
    ('Drenagem linfática', 'Corporal', 'Reduz retenção de líquido e inchaço.', 120, 50, false),
    ('Design de sobrancelha', 'Facial', 'Mapeamento e design com pinça e linha.', 60, 30, false),
    ('Peeling químico', 'Facial', 'Renovação celular para manchas e textura.', 220, 45, true),
    ('Microagulhamento', 'Facial', 'Estímulo de colágeno para cicatrizes e poros.', 350, 75, true),
    ('Massagem modeladora', 'Corporal', 'Manobras intensas para contorno corporal.', 130, 50, false),
    ('Radiofrequência facial', 'Facial', 'Firmeza e combate à flacidez.', 180, 40, false)
  returning id, name
)
insert into professionals (name, title, color, service_ids)
select 'Profissional 1', 'Esteticista', '#bd7765', array_agg(id) from s;

insert into package_plans (service_id, name, sessions, price, validity_days)
select id, 'Drenagem – 10 sessões', 10, 1000, 120 from services where name = 'Drenagem linfática'
union all
select id, 'Modeladora – 5 sessões', 5, 590, 90 from services where name = 'Massagem modeladora'
union all
select id, 'Microagulhamento – 4 sessões', 4, 1200, 180 from services where name = 'Microagulhamento';

-- Para dar acesso de EQUIPE a um usuário (crie-o antes em Authentication → Users):
-- update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
--  where email = 'email-da-equipe@exemplo.com';
-- (o usuário precisa sair e entrar de novo para a permissão valer)
