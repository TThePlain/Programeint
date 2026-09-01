# Testes

## Pirâmide

| Tipo | Onde | O que prova |
|---|---|---|
| Unit | `apps/api`, `packages/shared` | regras (hash, token, validação) |
| Integration / API | `apps/api` + Postgres de teste | HTTP + persistência |
| E2E | Playwright contra web+api+db+mailpit | fluxo de utilizador real |
| Security | headers, cookie flags, rate limit | controlos básicos |

## Bases

- App: `programeint` — usada pela API em desenvolvimento e, por isso, pelo Playwright
- Testes: `programeint_test` — usada só pelo Vitest de integração

Cuidado com `DATABASE_URL` exportada na shell: o Prisma e a API preferem-na ao `.env`, e uma variável esquecida faz a API de desenvolvimento escrever na base de testes. O sintoma é falha intermitente no E2E que não reproduz isolada (a mais comum: gravar o objetivo fica em `/onboarding` porque `GET /api/onboarding` já não vê os dados). Arranca a API e corre migrações com o URL explícito:

```bash
DATABASE_URL=postgresql://postgres@127.0.0.1:5432/programeint pnpm --filter @programeint/database migrate:deploy
(cd apps/api && env -u DATABASE_URL node --import tsx src/main.ts)
```

Depois de qualquer migração nova, semeia **as duas** bases: o E2E lê a de aplicação e o Vitest a de testes.

## E2E de autenticação (mínimo)

1. Criar conta
2. Ler e-mail no Mailpit API
3. Verificar e-mail
4. Entrar
5. Ver `/app` com sessão real
6. Sair
7. `/app` redireciona para `/entrar`

## Biblioteca de conteúdo

`pnpm library:check` valida por HTTP que cada link curado continua a responder e grava `lastStatus` / `lastCheckedAt`. Link partido faz o comando sair com código 1.

## Agenda / rotina

`e2e/agenda.spec.ts` grava o onboarding via `PUT /api/onboarding` (contrato real) e valida agendar → planear semana → foco → concluir com `focusedMinutes`.

## Regra

Não apagar teste para o fazer passar. Não usar mocks que escondam falha de integração.
