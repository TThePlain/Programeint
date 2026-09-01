# Agenda / rotina — API

## Endpoints

Todos exigem sessão autenticada.

### `GET /api/calendar?from=&to=`

Lista eventos persistidos no intervalo e revisões FSRS devidas (derivadas, não inventadas).

Resposta:

- `events[]` — sessões do aluno
- `dueReviews[]` — cartas FSRS com `due` no intervalo (`href: /revisar`)
- `preferences` — `weeklyHours` / `sessionMinutes` do onboarding (ou `null`)
- `policy` — texto explícito: sem lembretes push nesta versão

### `POST /api/calendar/events`

Cria sessão planeada.

```json
{
  "title": "Estudar lógica",
  "kind": "study",
  "startsAt": "2026-09-01T18:00:00.000Z",
  "durationMinutes": 45,
  "href": "/estudar/logic"
}
```

### `POST /api/calendar/events/:id/complete`

Marca concluída. Opcional: `focusedMinutes` (Pomodoro). Sem valor, usa a duração planeada.

### `DELETE /api/calendar/events/:id`

Cancela. Não cancela sessões já concluídas.

### `POST /api/calendar/plan-week`

Gera sessões a partir das preferências reais:

```json
{ "firstSlot": "2026-09-07T18:00:00.000Z" }
```

O cliente envia o instante do primeiro slot no fuso do aluno. O servidor só soma dias e usa `weeklyHours` / `sessionMinutes` — não inventa disponibilidade.

## O que não existe (não fingir)

- Push / alarmes no dispositivo — `CONFIGURATION_REQUIRED` (sem serviço de notificação)
- Integração com Google Calendar / iCal
