# Estado do projeto

**Atualizado:** 2026-09-01  
**Repositório:** [github.com/TThePlain/Programeint](https://github.com/TThePlain/Programeint)

## Veredito

**Pronto para uso local** na trilha Java Backend e objectivos com currículo gerado — software real, integrado e testado.

**Não está “100% Master Prompt”**: faltam currículos seed não-Java, deploy de produção com TLS, e integrações que exigem chaves/ambiente externo — marcadas `BLOCKED/CONFIGURATION_REQUIRED`, sem features falsas.

## Modelo de dados por utilizador

| Conteúdo | Escopo |
|---|---|
| Objectivos / onboarding | Por `userId` |
| Mapa, estudo, mastery, agenda | Objectivo em foco do utilizador |
| Labs / vídeos por slug | Validados contra o grafo do plano actual |
| Fórum | Comunidade (qualquer utilizador logado) |
| News | Público / global |
| Conta | Privado ao dono da sessão |

## Evidência

- Seed Java: nós, questões, módulos, labs, projeto, recursos
- Auth com sessão httpOnly + verificação de e-mail
- Onboarding multi-objectivo com objectivo actual
- Mapa + vídeos por língua (PT/EN/ES) com filtro de língua
- Labs Docker Temurin 21 · fórum · news · conta export/delete
- Integrações sem chave: GitHub / AI → `BLOCKED/CONFIGURATION_REQUIRED`
- CI: typecheck / testes / orphan-check (ver `.github/workflows`)

## O que funciona de ponta a ponta

Auth → onboarding → diagnóstico → mapa → estudo → labs → projeto/portfólio → biblioteca → agenda → fórum → tutor (com chave) → conta.

## O que ainda não está READY

| Item | Estado |
|---|---|
| Currículos seed Python/JS/etc. | não inventados (`available: false` ou gerados sob demanda) |
| Produção cloud + TLS + E2E pós-deploy | `CONFIGURATION_REQUIRED` |
| GitHub OAuth / evidência end-to-end | precisa `GITHUB_CLIENT_*` |
| AI Tutor com provider real | precisa `AI_API_KEY` |
| Push/alarmes | sem serviço de notificações |
| Firecracker | host macOS (sandbox usa Docker) |

## Stack

pnpm + Turborepo · Next.js 15 · NestJS 11 · PostgreSQL + Prisma · Redis · Mailpit · Docker (Temurin 21)
