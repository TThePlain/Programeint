# Deploy

## Ambientes

| Ambiente | Onde | Estado |
|---|---|---|
| development | localhost (Postgres/Redis locais + Mailpit Docker) | ativo nesta máquina |
| test | `programeint_test` + Playwright | CI + local |
| app compose | `docker-compose.yml` + `docker-compose.app.yml` | imagens API/Web; **não** é TLS de produção |
| production | domínio + TLS + secrets | `BLOCKED/CONFIGURATION_REQUIRED` |

## Desenvolvimento nesta máquina

Serviços locais (sem Docker Desktop; Homebrew oficial exigia admin):

- PostgreSQL 16 em `~/.local/pgsql` — `programeint-services start`
- Redis 8 em `~/.local/bin`
- Mailpit container via Lima
- Docker daemon: Lima VM `docker` (Ubuntu 26.04)

`docker-compose.yml` descreve a via reproduzível para outras máquinas com Docker.

## Stack app em contentores (staging local)

```bash
# infra
docker compose up -d postgres redis mailpit

# API + Web (build a partir da raiz do monorepo)
docker compose -f docker-compose.yml -f docker-compose.app.yml up --build
```

- API: `apps/api/Dockerfile` → porta 4000, health `/api/health`
- Web: `apps/web/Dockerfile` → porta 3000
- Antes do primeiro arranque da API: correr migrações (`pnpm db:migrate:deploy`) contra a mesma `DATABASE_URL`

Isto **não** substitui produção: sem TLS terminado, sem secret manager, sem SMTP real.

## Produção (ainda não)

Falta: conta cloud, domínio, TLS, SMTP real, backups, observabilidade hospedada.

Estratégia prevista (não fingir que está no ar):

1. Imagens Docker da API e do web (`apps/*/Dockerfile`)
2. Migrações Prisma no release (`pnpm db:migrate:deploy`)
3. Health check `/api/health/ready`
4. Rollback: imagem anterior + migrate down só se a migração for reversível; senão expand/contract

## CI

GitHub Actions (`.github/workflows/ci.yml`): install → generate → migrate deploy → orphan-check → typecheck → test → build.

## Secrets

Nunca commitados. `.env` local gitignored. Produção: secret manager.
