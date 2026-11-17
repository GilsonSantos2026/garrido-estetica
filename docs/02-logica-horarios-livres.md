# 2. Lógica de cálculo de horários livres

Implementada como funções puras (sem React, sem banco) em
[`src/domain/availability.js`](../src/domain/availability.js). Por serem puras, a mesma lógica pode rodar
no navegador agora e depois numa *Edge Function* do Supabase, para que o servidor valide antes de gravar.

## Entradas
- `settings`: horário de funcionamento por dia da semana (abertura, fechamento, intervalo de almoço),
  passo da grade (`slotStepMin`, padrão 15 min), folga entre atendimentos (`bufferMin`),
  antecedência mínima para marcar (`minAdvanceMin`) e janela de agendamento (`bookingWindowDays`).
- `service`: duração do procedimento.
- `professional`: quem atende (ou "sem preferência").
- `appointments`: agendamentos já existentes do profissional naquele dia.
- `timeBlocks`: folgas e bloqueios do profissional.

## Algoritmo (por profissional e por dia)
```
1. Dia fechado ou fora da janela de agendamento → nenhum horário.
2. Expediente = [abertura, fechamento] − intervalo de almoço − bloqueios do profissional
   (resultado: lista de intervalos livres de trabalho).
3. Ocupados = agendamentos do dia com status ativo (agendado, confirmado, em atendimento, concluído),
   cada um estendido pelo buffer: [início, fim + buffer].
   Faltou/cancelado liberam o horário.
4. Para t = abertura; t + duração ≤ fechamento; t += passo:
     candidato = [t, t + duração]
     válido se: cabe inteiro dentro de UM intervalo de expediente
            e [t, t + duração + buffer] não se sobrepõe a nenhum ocupado
              (sobrepõe quando início < fimOcupado e fim > inícioOcupado; assim o buffer vale dos dois lados)
            e, se for hoje, t ≥ agora + antecedência mínima
5. Retorna a lista de horários válidos.
```

**Sem preferência de profissional:** roda o algoritmo para cada profissional que faz o serviço e une os
resultados. Cada horário guarda quem está livre nele, e a escolha vai para quem tem menos atendimentos no
dia (distribui a agenda).

**Calendário do mês:** `getAvailableDays` aplica o algoritmo a cada dia do mês e marca como disponível
o dia que tiver pelo menos um horário. O calendário do portal só deixa clicar nesses dias.

**Reagendamento:** o próprio agendamento é ignorado (`ignoreAppointmentId`) ao calcular, para o cliente
poder trocar para um horário vizinho do atual.

## Exemplo
Terça, 09:00–19:00 com almoço das 12:00 às 13:00, passo de 15 min, buffer de 10 min.
Serviço de 60 min. Já existe um atendimento às 10:00–10:50.

- 09:00 → 09:00–10:00 sobrepõe [10:00, 11:00) ✗
- 09:15 … 09:45 ✗ (todos invadem o atendimento das 10:00)
- 11:00 → 11:00–12:00 ✓ (cabe antes do almoço)
- 11:15 → 11:15–12:15 ✗ (invade o almoço)
- 13:00 → ✓ … 18:00 → 18:00–19:00 ✓; 18:15 ✗ (passa do fechamento)

## Complexidade
Para D dias, S horários na grade e A agendamentos por dia: O(D·S·A). Com 60 dias, ~40 horários e
~15 agendamentos por dia são cerca de 36 mil comparações, instantâneo no celular. No banco real a consulta
busca só os agendamentos do período exibido (índice em `professional_id, date`).
