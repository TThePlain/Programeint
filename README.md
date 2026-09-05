# Programeint

**programa + mente** — plataforma open source de formação tecnológica adaptativa.

Aprende **qualquer linguagem de programação**, stack ou ferramenta tech: o plano, o mapa, a prática e os **acessórios do ofício** (IDE, Git, framework, testes, deploy…) adaptam-se ao objectivo que escolheres — não é uma escola só de Java.

Idioma do produto: **português do Brasil**. Licença: [MIT](LICENSE).

Repositório: [github.com/TThePlain/Programeint](https://github.com/TThePlain/Programeint)

> Este projecto foi **estruturado e desenvolvido com apoio de IA**, sob direcção humana: arquitectura em monorepo, contratos reais, testes e produto utilizável — não um protótipo descartável.

---

## Visão

| Princípio | Significado |
|-----------|-------------|
| **Multi-linguagem** | Java, Python, JavaScript/TypeScript, Go, Rust, C#, Kotlin, PHP, SQL, web, stacks (React, Node, Spring…) e temas tech (DevOps, cloud, ML, segurança…) |
| **Ferramentas da escolha** | Cada plano inclui fundamentos, conceitos, **ambiente/ferramentas**, prática, padrões, projecto e fecho alinhados à linguagem/stack escolhida |
| **Plano por aluno** | Objectivos, mapa e progresso são do utilizador logado |
| **Comunidade** | Fórum partilhado entre quem está autenticado |
| **Software real** | Sem ecrãs falsos; integrações sem chave ficam `BLOCKED` / `CONFIGURATION_REQUIRED` |

---

## O que a plataforma faz

- **Auth** — registo, verificação de e-mail, sessão httpOnly, recuperação de senha  
- **Onboarding** — objectivo (linguagem/stack/ferramenta), nível, ritmo; vários objectivos com um em foco  
- **Currículo** — grafo curado (ex.: trilha Java backend) **ou** mapa **gerado** para o teu objectivo (com módulos, checks, vídeos e prática guiada)  
- **Diagnóstico e mapa** — posicionamento e progresso no teu plano  
- **Estudar** — lições com verificação  
- **Prática / Lab** — exercícios guiados; sandbox Docker executável para Java (outras linguagens: prática guiada no mapa gerado; runners multi-runtime em evolução)  
- **Agenda, biblioteca, fórum, news**  
- **Tutor** (com `AI_API_KEY`) · **GitHub** (com `GITHUB_CLIENT_*`) · **Conta** (exportar / apagar)

---

## Estrutura do monorepo

```
programeint/
├── apps/web          # Next.js 15 — UI
├── apps/api          # NestJS 11 — API
├── packages/database # Prisma + seed
├── packages/shared   # Tipos, Zod, catálogo de objectivos e carreiras
├── docs/             # Arquitectura, API, ADRs, testes, deploy
└── docker-compose.yml
```

Cada objectivo do aluno resolve um **currículo** (seed ou gerado) com etapas fixas de programa:

1. Fundamentos → 2. Conceitos → 3. **Ferramentas / ambiente** → 4. Prática → 5. Padrões → 6. Projecto → 7. Fecho  

O perfil de carreira (`packages/shared` → `dev-career`) injeta framework, complementos full-stack e **work tools** (Git, IDE, CI…) conforme a linguagem escolhida.

---

## Stack

| Pasta | Tecnologia |
|-------|------------|
| `apps/web` | Next.js 15 (App Router) |
| `apps/api` | NestJS 11 |
| `packages/database` | PostgreSQL + Prisma |
| `packages/shared` | Tipos e domínio partilhado |

pnpm + Turborepo · Redis · Mailpit (dev) · Docker (Postgres, Redis, sandbox Temurin 21 para labs Java).

---

## Arranque local

**Requisitos:** Node.js 22+, pnpm 10+, Docker (ou Postgres/Redis equivalentes). JDK 21 + imagem `eclipse-temurin:21-jdk-alpine` para labs Java.

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
| API | http://127.0.0.1:4000/api/health |
| Mailpit | http://127.0.0.1:8025 |

```bash
pnpm library:check
```

---

## Caminho para cobertura completa (multi-linguagem)

O núcleo (auth, objectivos, mapa gerado, estudo, fórum, conta) já serve **qualquer objectivo do catálogo**. Para ficar “100%” no sentido de **paridade com a trilha Java em todas as linguagens**:

1. **Sandbox multi-runtime** — runners Docker para Python, Node/TS, Go, etc. (hoje o executável é Java; o resto usa prática guiada)  
2. **Labs e projectos gerados por linguagem** — starters + testes ocultos, não só markdown  
3. **Biblioteca e vídeos** indexados por linguagem/stack, não só nós do seed Java  
4. **Deploy de produção** com TLS e secrets reais (`AI_API_KEY`, `GITHUB_CLIENT_*`)  
5. **Notificações / rotina** além da agenda local  

Contribuições nestes eixos são especialmente bem-vindas.

---

## Como colaborar

1. [CONTRIBUTING.md](CONTRIBUTING.md) · [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) · [SECURITY.md](SECURITY.md)  
2. Issue → branch `feat/…` | `fix/…` | `docs/…` → PR pequeno  
3. Sem funcionalidade falsa; secrets só em `.env`  

Ideias boas para começar: UI/a11y, docs, recursos da biblioteca, labs noutras linguagens, testes.

---

## Documentação

| Doc | Conteúdo |
|-----|----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitectura |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy |
| [docs/TESTING.md](docs/TESTING.md) | Testes |
| [docs/api/](docs/api/) | Contratos da API |
| [docs/decisions/](docs/decisions/) | ADRs |

---

## Licença

[MIT](LICENSE) © contribuidores do Programeint
