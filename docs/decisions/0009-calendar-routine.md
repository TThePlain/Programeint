# ADR 0009 — Agenda com sessões reais e revisões FSRS derivadas

## Estado

Aceite e implementado na fase 12.

## Decisão

- Sessões de estudo são **linhas em `calendar_events`**, criadas pelo aluno ou pelo plano semanal.
- O plano semanal usa só `weeklyHours` e `sessionMinutes` do onboarding. O cliente envia o instante do primeiro slot (fuso do aluno); o servidor não inventa timezone.
- Revisões FSRS **não** são convertidas automaticamente em eventos. Aparecem em `dueReviews` como dados derivados das cartas — lista vazia é estado real.
- Pomodoro é opcional e corre no cliente. Só grava `focusedMinutes` quando o aluno conclui a sessão.
- Lembretes push / alarmes ficam fora: sem serviço de notificação configurado, marcar como funcional seria mentira.

## Alternativas rejeitadas

- **Gerar eventos falsos de revisão no calendário**: misturaria evidência FSRS com planeamento e dificultaria cancelar/editar.
- **Alarmes no browser sem opt-in e sem backend**: frágil e fácil de apresentar como “lembrete” que não chega.
- **Ignorar preferências do onboarding**: o Master Prompt exige rotina baseada em disponibilidade real.
