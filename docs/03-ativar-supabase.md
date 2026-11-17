# 3. Ativar o banco de dados real (Supabase)

O app tem dois modos e escolhe sozinho:

| | Protótipo (padrão) | Banco real (Supabase) |
|---|---|---|
| Quando | sem `.env.local` | com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` |
| Dados | `localStorage`, fictícios, só neste aparelho | PostgreSQL na nuvem, compartilhado entre aparelhos |
| Login do cliente | simulado (hash local) + conta de demonstração | Supabase Auth (e-mail e senha, confirmação por e-mail) |
| Painel da clínica | aberto, para testes | exige login da equipe |
| Fotos | dentro do `localStorage` | bucket privado `evolucao` no Storage |

O código das telas é o mesmo nos dois modos. Só muda a camada `src/data/` (`backend.js` escolhe).

## Passo a passo (uns 15 minutos)

1. **Criar o projeto**: em supabase.com, crie uma conta e um projeto (plano gratuito serve para começar).
   Região: *South America (São Paulo)*.
2. **Criar as tabelas**: abra *SQL Editor*, cole todo o [`supabase/schema.sql`](../supabase/schema.sql) e clique em *Run*.
   Depois faça o mesmo com [`supabase/seed.sql`](../supabase/seed.sql) (configuração, horários, procedimentos e pacotes iniciais).
3. **Conectar o app**: copie `.env.example` para `.env.local` e cole a *Project URL* e a chave *anon public*
   (*Project Settings → API*). Rode `npm run dev`. A faixa no topo passa a mostrar "Conectado ao banco de dados".
4. **Criar o acesso da equipe**: em *Authentication → Users → Add user*, crie o usuário da clínica.
   Depois, no *SQL Editor*, dê o papel de equipe:
   ```sql
   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
    where email = 'email-da-equipe@exemplo.com';
   ```
   Entre no painel com esse e-mail. Em *Ajustes*, troque "Profissional 1" pelo nome real, ajuste preços e o WhatsApp.
5. **Testar o portal**: em outra janela (anônima), use a visão Cliente, crie uma conta e agende.
   Se a confirmação de e-mail estiver ligada (*Authentication → Providers → Email*), o cliente precisa clicar no link antes de entrar.
6. **APK com o banco real**: no GitHub, em *Settings → Secrets and variables → Actions*, crie os segredos
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. O workflow já os usa no build.

## O que o banco garante sozinho (mesmo que alguém mexa no app)
- **RLS**: cliente só lê o próprio cadastro, os próprios agendamentos, pacotes e termos. Prontuário, fotos,
  financeiro e lista de espera são só da equipe.
- **Horários livres sem expor ninguém**: o portal recebe a agenda alheia pela função `busy_slots`, só com horário e profissional.
- **Sem sobreposição**: a restrição `sem_sobreposicao` impede dois atendimentos no mesmo horário do mesmo profissional,
  mesmo com duas pessoas agendando ao mesmo tempo.
- **Regras do portal no servidor** (gatilho `guard_client_appointment`): agendamento online sempre entra como
  "agendado", com preço e duração da tabela; cancelar/remarcar só com a antecedência configurada.
- **Cadastro automático**: ao criar conta no portal, o gatilho `handle_new_user` cria o cliente ou vincula a um
  cadastro que a clínica já tinha com o mesmo WhatsApp/e-mail.

## Limites conhecidos desta etapa
- O `schema.sql` ainda não foi executado num projeto real: a primeira aplicação pode revelar ajustes.
- "Concluir e receber" grava status, caixa e pacote em chamadas separadas. Se a internet cair no meio, pode
  ficar parcial (o app recarrega e mostra o estado real). Próximo passo: uma função RPC transacional.
- Excluir uma foto apaga o registro, mas o arquivo continua no Storage (limpeza manual por enquanto).
- Dados do modo protótipo (`localStorage`) não são enviados ao Supabase automaticamente.
