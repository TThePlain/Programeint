# GitHub OAuth

| Método | Caminho | Auth | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/github/status` | sessão | 200 `{ configured, connected, login, canPublish, errorCode, message }` | 401 |
| GET | `/api/github/connect` | sessão | 302 para GitHub | 409 `BLOCKED/CONFIGURATION_REQUIRED` se faltar `GITHUB_CLIENT_ID` / secret |
| GET | `/api/github/callback` | state OAuth | 302 `/portfolio` após upsert | 409 sem credenciais; 401 state inválido |
| POST | `/api/github/publish-evidence` | sessão | 200 `{ ok, repo, path, url, count, message }` | 409 sem OAuth / sem evidência / erro GitHub; 401 |
| DELETE | `/api/github` | sessão | 200 status actualizado | 401 |

Sem `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` **não há** conta ligada, botão «Ligar GitHub» nem publicação. Com conta ligada e evidência de projeto, `publish-evidence` cria/actualiza o repo público `programeint-portfolio` com `EVIDENCIA.md` (scope `public_repo`). O token fica cifrado (AES-256-GCM) e nunca vai ao cliente.

Redirect URI: `{APP_URL}/api/github/callback` (via proxy Next, para o cookie de sessão).
