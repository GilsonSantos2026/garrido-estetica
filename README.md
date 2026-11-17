# Garrido Estética – Agenda, prontuário e financeiro (v2)

Protótipo funcional em **React + Tailwind + Lucide**, com dados fictícios salvos no `localStorage`.
O botão **Alternar visão: Profissional / Cliente**, no topo da tela, troca entre o painel da clínica e o portal de autoagendamento.

## Rodar
```bash
npm install --ignore-scripts
npm run dev      # http://localhost:5173
npm test         # 15 testes: horários livres e regras de negócio
npm run build    # gera www/ (usado pelo Capacitor no APK)
```

## Documentação
- [docs/01-modelagem-banco.md](docs/01-modelagem-banco.md): tabelas e relacionamentos
- [docs/02-logica-horarios-livres.md](docs/02-logica-horarios-livres.md): algoritmo de horários livres
- [docs/03-ativar-supabase.md](docs/03-ativar-supabase.md): **passo a passo para ligar o banco real**
- [supabase/schema.sql](supabase/schema.sql) e [supabase/seed.sql](supabase/seed.sql): tabelas, regras de segurança (RLS) e dados iniciais

## Estrutura
```
src/domain/      regras puras (horários, financeiro, datas) – testáveis, reaproveitáveis no servidor
src/data/        persistência: backend.js escolhe localStorage (protótipo) ou Supabase (banco real); auth.js para os dois
src/store/       ações de negócio (db, args) → operações + contexto React
src/features/    portal/ (cliente) e admin/ (agenda, clientes/prontuário, espera, pacotes, financeiro, ajustes)
legado/          app v1 original (referência)
```

## APK
O workflow `.github/workflows/build-apk.yml` roda testes e build e gera o APK (Node 22, JDK 21, Capacitor 8.6.0).
Ao abrir pela primeira vez num celular que tinha o app antigo, os dados da chave `bella-estetica-v1` são importados automaticamente.

## Testes manuais
Conta de teste criada no portal durante a validação (somente local, dados fictícios):
`aline.teste@exemplo.com` e `bruna.teste@exemplo.com`, senha `portal-teste-2026` (somem ao clicar em "restaurar"). O botão "Entrar como cliente de demonstração" entra como Marina sem senha.

## Segurança das dependências
Versões fixas, todas publicadas há mais de 2 semanas. Alerta conhecido: `picomatch` (lentidão com padrões maliciosos,
GHSA-fc5q-39xc-vjpf) usado só pelas ferramentas de build no computador, nunca no app; ainda não há versão corrigida.
Atualizar quando sair (`npm audit`).
