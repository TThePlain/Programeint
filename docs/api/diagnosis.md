# Diagnóstico e mapa

| Método | Caminho | Auth | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/api/diagnosis/sessions` | sessão | 201 sessão + questão (sem gabarito) ou `available:false` | 401, 400 sem objetivo |
| POST | `/api/diagnosis/sessions/:id/answers` | sessão | 201 feedback + próxima questão ou conclusão | 400 questão errada, 401 |
| GET | `/api/roadmap` | sessão | 200 nós + estados de evidência | 401 |

O diagnóstico só existe para alvos com currículo publicado (agora: **Java**). Outros alvos devolvem `available: false` — não há perguntas inventadas.

Estados no mapa: `unassessed` | `passed` | `failed` | `skipped`. `skipped` = pré-requisito falhado; o aluno pode na mesma ver o nó.
