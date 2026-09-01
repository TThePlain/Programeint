# ADR 0011 — Exportação e exclusão de conta

## Estado

Aceite na fase 14.

## Decisão

- `GET /api/account/export` devolve um snapshot auditável sem segredos.
- `DELETE /api/account` exige senha + texto `APAGAR`; apaga o `User` (cascade) e limpa o cookie.
- Sem soft-delete nesta versão: exclusão é permanente e registada em `audit_logs` antes do delete (actor fica null após cascade SetNull).
