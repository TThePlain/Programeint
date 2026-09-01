# Conta / privacidade — API

## Endpoints

Todos exigem sessão.

### `GET /api/account/export`

Exporta JSON com dados pessoais e de aprendizagem. **Nunca** inclui `passwordHash`, tokens ou cifragens.

### `DELETE /api/account`

Apaga a conta (cascade nas relações do utilizador) e revoga o cookie de sessão.

```json
{ "password": "…", "confirm": "APAGAR" }
```

## Política

Minimização: só o necessário no export. Exclusão: permanente após confirmação explícita.
