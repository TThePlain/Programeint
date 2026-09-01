# ADR 0001 — Monólito modular Next.js + NestJS + PostgreSQL

## Estado

Aceite (2026-08-28)

## Contexto

Greenfield. Precisamos de auth, grafo de competências, execução isolada de código, e evolução por features reais.

## Decisão

- pnpm workspaces + Turborepo
- Next.js (UI) e NestJS (API) separados
- PostgreSQL como sistema de record; grafo modelado em tabelas de adjacência
- Redis para rate limiting e filas futuras
- Sessões opacas no banco (não JWT de acesso de longa duração)

## Alternativas rejeitadas

| Opção | Porquê não |
|---|---|
| Next.js só (Route Handlers) | sandbox e jobs não devem viver no mesmo runtime da UI |
| Neo4j agora | custo operacional extra; CTEs recursivos bastam no início |
| JWT stateless | revogação de sessão e timeout idle são mais fracos |
| Clerk / Auth SaaS | estado e privacidade do aluno fora do nosso controlo |
| Docker Desktop | exigia admin; Lima cobre o daemon |

## Consequências

Proxy `/api` no Next.js para cookies same-origin. Worker de sandbox é processo à parte.
