# Programeint

**programa + mente** — plataforma open source de formação tecnológica adaptativa.

Foco: **tecnologia, programação, IA e mercado tech**. Cada aluno define objectivos, recebe um plano de estudo, pratica em labs, acompanha o mapa e participa na comunidade.

Idioma do produto: **português do Brasil**. Licença: [MIT](LICENSE).

Repositório: [github.com/TThePlain/Programeint](https://github.com/TThePlain/Programeint)

---

## O que é

Software real (sem ecrãs fake): autenticação, onboarding, diagnóstico, currículo por objectivo, estudo com verificação, labs, agenda, biblioteca, tutor (com chave), fórum, news tech e conta com exportação/apagamento de dados.

| Área | Para quem | Escopo |
|------|-----------|--------|
| Objectivos e plano | Aluno autenticado | **Por utilizador** — cada conta tem os seus objectivos e o plano gerado a partir deles |
| Mapa / estudo / prática / labs | Aluno autenticado | **Do objectivo em foco** do utilizador logado |
| Progresso e mastery | Aluno autenticado | **Por utilizador** |
| Fórum | Qualquer utilizador logado | **Comunidade** — todos vêem e interagem |
| News | Público | Feed global do ramo tech |
| Conta | Dono da sessão | Privado (exportar / apagar) |

---

## Funcionalidades

- **Auth** — registo, verificação de e-mail, login com sessão httpOnly, recuperação de senha
- **Onboarding** — objectivo, nível, ritmo; vários objectivos com um em foco
- **Diagnóstico** — posicionamento no grafo do objectivo
- **Mapa de estudo** — etapas sequenciais, progresso, vídeos por língua (PT/EN/ES)
- **Estudar** — módulos com leitura e verificação
- **Prática / Lab** — exercícios guiados e Java em sandbox Docker
- **Agenda** — sessões e foco do dia
- **Biblioteca** — recursos legais ligados ao teu grafo
- **Fórum** — posts, comentários e soluções (comunidade logada)
- **News** — RSS tech agregado
- **Tutor** — ajuda contextual (requer `AI_API_KEY`)
- **GitHub** — OAuth + evidência (requer `GITHUB_CLIENT_*`)
- **Conta** — export JSON e delete com confirmação

Estado detalhado: [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md).

---

## Stack

| Pasta | Tecnologia |
|-------|------------|
| `apps/web` | Next.js 15 (App Router) |
| `apps/api` | NestJS 11 |
| `packages/database` | PostgreSQL + Prisma |
| `packages/shared` | Tipos, schemas Zod, domínio partilhado |

Também: pnpm + Turborepo · Redis (rate limit / cache) · Mailpit (dev) · Docker (Postgres, Redis, sandbox Java Temurin 21).

---

## Requisitos locais

- Node.js **22+**
- pnpm **10+**
- Docker (Postgres 16, Redis 7, Mailpit) **ou** serviços equivalentes
- JDK 21 (lab Java local)
- Imagem `eclipse-temurin:21-jdk-alpine` (`docker pull`) para o lab

---

## Arranque rápido

```bash
git clone https://github.com/TThePlain/Programeint.git
cd Programeint

docker compose -f docker-compose.yml up -d

cp .env.example .env
# SESSION_SECRET=$(openssl rand -hex 32)

pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

| Serviço | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API (directa) | http://127.0.0.1:4000/api/health |
| API via proxy Next | http://localhost:3000/api/health |
| Mailpit | http://127.0.0.1:8025 |

Se já tens Postgres/Redis locais, omite o Compose e configura `DATABASE_URL` / `REDIS_URL` no `.env`.

Verificar links da biblioteca:

```bash
pnpm library:check
```

---

## Como colaborar

1. Lê [CONTRIBUTING.md](CONTRIBUTING.md) e o [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
2. Abre uma issue ou escolhe uma existente
3. Branch a partir de `main`: `feat/…`, `fix/…`, `docs/…`
4. Um tema por PR; sem funcionalidade falsa
5. Corre o que tocaste (`pnpm typecheck`, testes relevantes)
6. Abre o PR com resumo + plano de teste

### Bom para começar

- UI / acessibilidade
- Docs e setup
- Recursos da biblioteca (`pnpm library:check`)
- Labs e fórum
- Testes e tipagem

### Segurança

Não commits de secrets (`.env` está no `.gitignore`). Vulnerabilidades: [SECURITY.md](SECURITY.md).

Integrações sem credencial ficam `BLOCKED` / `CONFIGURATION_REQUIRED` — ver [.env.example](.env.example).

---

## Documentação

| Doc | Conteúdo |
|-----|----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitectura |
| [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) | Estado actual |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy |
| [docs/TESTING.md](docs/TESTING.md) | Testes |
| [docs/api/](docs/api/) | Contratos da API |
| [docs/decisions/](docs/decisions/) | ADRs |

---

## Princípios

1. **Nada de funcionalidade falsa** — botões e páginas fazem o que prometem
2. **Plano por aluno** — mapa e progresso seguem o objectivo do utilizador logado
3. **Fórum aberto à comunidade autenticada** — interação entre alunos
4. **Open source para alunos e profissionais** — PRs pequenos e honestos

---

## Licença

[MIT](LICENSE) © contribuidores do Programeint
