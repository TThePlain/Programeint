# ADR 0002 — Autenticação por sessão no servidor

## Estado

Aceite (2026-08-28)

## Contexto

OWASP ASVS 5.0 V6/V7: verificação de sessão no backend, token com entropia ≥ 128 bits, novo token no login, timeout idle + absoluto, cookies httpOnly.

## Decisão

- Palavra-passe: Argon2id
- Token de sessão: 32 bytes CSPRNG; armazenar SHA-256 do token; cookie `programeint_sid` httpOnly, SameSite=Lax, Secure em produção
- Idle: 30 minutos; absoluto: 7 dias (documentado)
- E-mail de verificação obrigatório antes do login completo
- Recuperação de senha com token de uso único (1 hora); revoga sessões após reset
- Resposta de “esqueci a senha” é constante (não revelar se o e-mail existe)
- Rate limit em login/registo/recuperação

## Não feito ainda

MFA (ASVS L2) — planeado; não fingir que existe.
