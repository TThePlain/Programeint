# ADR 0004 — Sandbox de execução

## Estado

Aceite e implementado na fase 7 (Java / Temurin 21).

## Threat model (resumo)

Atacante = aluno ou código gerado. Objetivos: escape para o host, roubo de secrets, abuso de CPU/rede, persistência.

## Decisão

- Dev/macOS: Docker (Lima) com: no-new-privileges, cap-drop ALL, network none, read-only FS + tmpfs, CPU/memory/pids, timeout, utilizador não-root, sem montar secrets
- Produção Linux multi-tenant: gVisor ou Firecracker (Firecracker bloqueado no Mac)
- Nunca `eval` / `exec` no processo NestJS
- Código do aluno e testes ocultos: bind-mount só de leitura em `/src`; compilação em tmpfs `/tmp`
- Sem Docker ou sem imagem: `status: blocked`, `errorCode: BLOCKED/CONFIGURATION_REQUIRED`

Java: imagem `eclipse-temurin:21-jdk-alpine` (`LAB_JAVA_IMAGE`), um job = um container.
