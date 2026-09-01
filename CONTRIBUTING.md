# Contribuir para o Programeint

Obrigado por quereres melhorar o Programeint. Este projecto é **open source** para profissionais e alunos que estudam tecnologia, programação, IA e o mercado tech.

## Código de conduta

Participação regida pelo [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## O que valorizamos

- Software real — sem ecrãs falsos, botões mortos ou “demo” que minta
- Integrações sem credencial ficam `BLOCKED` / `CONFIGURATION_REQUIRED`
- Mudanças pequenas e revisáveis (um tema por PR)
- Docs e testes alinhados com o que o código faz

## Arranque local

Requisitos: Node.js 22+, pnpm 10+, Docker (Postgres, Redis, Mailpit), JDK 21 (lab Java).

```bash
# Infra de desenvolvimento (Postgres 16 + Redis 7 + Mailpit)
docker compose -f docker-compose.yml up -d

cp .env.example .env
# Ajusta SESSION_SECRET (openssl rand -hex 32)

pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web: http://localhost:3000  
- API: http://127.0.0.1:4000/api/health  
- Mailpit: http://127.0.0.1:8025  

Alternativa: se já usas serviços locais (`programeint-services`), podes omitir o Compose e apontar `DATABASE_URL` / `REDIS_URL` no `.env`.

## Fluxo de contribuição

1. Abre uma issue (bug, ideia, docs) ou comenta numa existente
2. Cria um branch a partir de `main` (`fix/…`, `feat/…`, `docs/…`)
3. Implementa só o necessário; evita refactors laterais no mesmo PR
4. Corre localmente o que tocaste (`pnpm typecheck`, testes relevantes)
5. Abre um pull request com resumo + plano de teste

### Checklist do PR

- [ ] Não introduz funcionalidade falsa
- [ ] Secrets só em `.env` / `.env.example` (nunca commits de credenciais)
- [ ] UI em português do Brasil quando for copy de produto
- [ ] Docs actualizados se mudares comportamento público

## Onde começar (bom para alunos)

- Bugs de UI / acessibilidade
- Docs e exemplos de setup
- Novos recursos legais na biblioteca (`pnpm library:check`)
- Exercícios de lab / fórum
- Testes e tipagem

## Estrutura

| Pasta | Papel |
|-------|--------|
| `apps/web` | Next.js (UI) |
| `apps/api` | NestJS (API) |
| `packages/database` | Prisma + seed |
| `packages/shared` | Tipos e constantes partilhadas |
| `docs/` | Arquitectura, estado, API |

## English (short)

We welcome PRs from students and professionals. Keep changes honest (no fake features), small, and documented. Use `docker compose -f docker-compose.yml up -d`, then `pnpm install && pnpm db:migrate && pnpm db:seed && pnpm dev`. See above for the full checklist.
