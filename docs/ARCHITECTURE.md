# Arquitetura

## Visão

Monólito modular em monorepo. Um processo web (Next.js), um processo API (NestJS), PostgreSQL, Redis, e um worker de sandbox isolado (fase posterior).

```
Browser (pt-BR)
    │
    ▼
Next.js :3000  ──rewrite /api/*──►  NestJS :4000
    │                                    │
    │                                    ├── PostgreSQL (estado)
    │                                    ├── Redis (rate limit)
    │                                    └── SMTP (Mailpit em dev)
    ▼
UI de aprendizagem: “o que eu devo fazer agora?”
```

## ITS (Intelligent Tutoring System)

Quatro modelos clássicos, a implementar de forma incremental:

1. **Domain model** — knowledge graph (nós + pré-requisitos em tabelas)
2. **Student model** — conhecimento, habilidade, aplicação, autonomia (separados)
3. **Tutoring model** — next best learning action + FSRS para retenção
4. **Interface model** — UX educativa, não dashboard de métricas

Referências: Bloom (mastery learning, 1968); Corbett & Anderson (BKT); FSRS (Ye et al., Open Spaced Repetition).

## Fronteiras de confiança

- Código de aluno **nunca** corre no processo da API.
- Segredos nunca no frontend nem em logs.
- Sessão só validada no backend (ASVS V7.2.1).
- GitHub e IA só ativos com credencial real.

## Pacotes

```
apps/web          UI Next.js
apps/api          API NestJS
packages/database Prisma + migrações
packages/shared   Zod contracts partilhados
```

## Decisões

Ver `docs/decisions/`.
