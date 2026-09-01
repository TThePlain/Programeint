# Laboratório (sandbox Java)

| Método | Caminho | Auth | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/lab/status` | — | 200 `{ ok, message }` | — |
| GET | `/api/lab/exercises/:slug` | sessão | 200 enunciado + ficheiros (sem testes ocultos) | 400 sem diagnóstico, 404 |
| PUT | `/api/lab/exercises/:slug/files` | sessão | 200 workspace | 400 path inválido |
| POST | `/api/lab/exercises/:slug/runs` | sessão | 201 resultado do contentor | 400 sem ficheiros; `blocked` se Docker em falta |

O código do aluno **não** corre no processo NestJS. Cada job é `docker run` com: `--network none`, `--read-only` + tmpfs, `--cap-drop ALL`, `no-new-privileges`, memória/CPU/PIDs limitados, user `65534`, timeout.

Imagem: `eclipse-temurin:21-jdk-alpine` (`LAB_JAVA_IMAGE`). Se Docker ou a imagem faltarem, o run fica `status: blocked` com `errorCode: BLOCKED/CONFIGURATION_REQUIRED` — não há execução no host.

Exercícios publicados agora: `algo-twice` (Algoritmos), `java-hello` (Java).
