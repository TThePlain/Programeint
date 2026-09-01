# ADR 0010 — Objetivo Java aponta para o tip `java-backend`

## Estado

Aceite na fase 13.

## Contexto

O motor de estudo e o diagnóstico caminham pelos **ancestrais** do nó-alvo (`ancestorsAndSelf`). Com `GOAL_SLUG_TO_NODE.java = "java"`, OOP, Collections e Spring ficavam **fora** da trilha — publicar módulos nesses nós não os tornava a «próxima ação».

## Decisão

- Criar o nó tip `java-backend` com pré-requisitos que puxam Spring Boot, Collections, Exceptions, Testing (required) e Git/SQL/Docker (recommended).
- Mapear o alvo de onboarding `java` → `java-backend`.
- Publicar módulos só quando há conteúdo + verificação reais; nós sem módulo continuam a devolver `module_unpublished` (sem aula inventada).

## Consequências

- Diagnósticos novos cobrem um grafo mais largo (máx. 6 perguntas; nós sem questão ficam `unassessed` e o estudo recomenda-os).
- Sessões de diagnóstico antigas guardam o `targetNodeId` antigo; o motor de `GET /api/learning/next` usa sempre o mapa actual do objetivo.
