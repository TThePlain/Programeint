# Deploy

## Vercel (frontend / `apps/web`)

O site Next.js pode ser publicado na [Vercel](https://vercel.com). A **API NestJS** (`apps/api`) **não** corre na Vercel — precisa de um host com Node contínuo (Railway, Render, Fly.io, VPS) + Postgres + Redis.

### 1. Preparar o monorepo

No dashboard Vercel (Import Git Repository → `TThePlain/Programeint`):

| Setting | Valor |
|---------|--------|
| Framework Preset | Next.js |
| Root Directory | `apps/web` |
| Install Command | `cd ../.. && pnpm install --frozen-lockfile` |
| Build Command | `cd ../.. && pnpm --filter @programeint/web build` |
| Node.js | 22.x |

Ou via CLI (na pasta `apps/web`):

```bash
npx vercel@latest login
npx vercel@latest link
npx vercel@latest --prod
```

### 2. Variáveis de ambiente (Web)

| Variável | Exemplo | Notas |
|----------|---------|--------|
| `API_URL` | `https://api.teu-dominio.com` | URL pública da API Nest (sem barra final) |
| `APP_URL` | `https://teu-projecto.vercel.app` | Domínio do site (CORS + links de e-mail na API) |

Sem `API_URL` apontando para uma API no ar, a landing abre mas login/mapa/fórum falham.

### 3. API em produção (obrigatório para a plataforma completa)

1. Deploy `apps/api` noutro serviço com `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, SMTP real  
2. `APP_URL` = URL da Vercel; CORS já usa `APP_URL`  
3. `pnpm db:migrate:deploy` + `pnpm db:seed` na base de produção  
4. Definir `API_URL` na Vercel e redesploy  

### 4. Cookies / sessão

Login grava cookie httpOnly no domínio da Vercel (Server Action). Pedidos `/api/*` no browser são reescritos para `API_URL` — a API deve aceitar `Origin` = `APP_URL` com `credentials: true`.

## Ambientes locais

| Ambiente | Como |
|---|---|
| development | `docker-compose.yml` + `pnpm dev` |
| staging local | `docker-compose.yml` + `docker-compose.app.yml` |
| production web | Vercel |
| production API | host Node + Postgres + Redis |

## CI

GitHub Actions (`.github/workflows/ci.yml`): install → generate → migrate → orphan-check → typecheck → test → build.

## Secrets

Nunca no Git. `.env` local gitignored. Produção: env da Vercel + secret manager do host da API.
