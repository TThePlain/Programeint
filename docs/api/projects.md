# Projetos e portfólio

| Método | Caminho | Auth | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/projects` | sessão | 200 lista (`locked` se faltar evidência nos nós) | 401 |
| GET | `/api/projects/:slug` | sessão | 200 enunciado + ficheiros (sem testes ocultos) | 404 |
| PUT | `/api/projects/:slug/files` | sessão | 200 workspace | 400 sem diagnóstico / bloqueado / path inválido |
| POST | `/api/projects/:slug/runs` | sessão | 201 resultado do contentor; se `passed`, cria evidência | 400 sem diagnóstico / bloqueado; `blocked` se Docker em falta |
| GET | `/api/portfolio` | sessão | 200 evidências (vazio é estado real) | 401 |

Projeto ≠ lab: vários ficheiros, pré-requisitos de nós (`studied` ou `passed`), e **portfólio só com testes isolados a passar**. Não há certificado, diploma, nem botão GitHub (OAuth continua `BLOCKED/CONFIGURATION_REQUIRED`).

O código corre no mesmo sandbox Docker do lab. Sem Docker: `status: blocked`.

Publicado agora: `java-catalog` (exige Algoritmos + Java).
