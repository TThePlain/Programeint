# ADR 0006 — GitHub só com OAuth real

## Estado

Aceite e implementado na fase 9.

## Decisão

- Sem `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: `errorCode: BLOCKED/CONFIGURATION_REQUIRED`. A UI não mostra «Ligar GitHub».
- Com credenciais: authorization code + `state` no Redis (10 min), token cifrado na tabela `github_accounts`.
- Ligar a conta **não** publica o portfólio. Não há botão de push enquanto isso não for uma feature própria.
