# API de autenticação

Base: `/api/auth`  
Sessão: cookie httpOnly `programeint_sid` (SameSite=Lax).

| Método | Caminho | Auth | Request | Sucesso | Erros |
|---|---|---|---|---|---|
| POST | `/api/auth/register` | não | `{ name, email, password }` | 201 user + envio de e-mail | 400 validação, 409 e-mail existente, 429 |
| POST | `/api/auth/login` | não | `{ email, password }` | 200 Set-Cookie + user | 401, 403 EMAIL_NOT_VERIFIED, 429 |
| POST | `/api/auth/logout` | cookie opcional | — | 201 `{ ok: true }` | — |
| GET | `/api/auth/session` | cookie | — | 200 `{ user \| null }` | — |
| POST | `/api/auth/verify-email` | não | `{ token }` | 201 | 400 token inválido |
| POST | `/api/auth/resend-verification` | não | `{ email }` | 201 mensagem genérica | 429 |
| POST | `/api/auth/forgot-password` | não | `{ email }` | 201 mensagem genérica | 429 |
| POST | `/api/auth/reset-password` | não | `{ token, password }` | 201; revoga sessões | 400 |
| GET | `/api/health` | não | — | 200 | — |
| GET | `/api/health/ready` | não | — | 200 db+redis | 500 se dependência cair |

OpenAPI: `http://127.0.0.1:4000/api/docs`
