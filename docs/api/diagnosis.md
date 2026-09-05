# Diagnóstico e mapa

| Método | Caminho | Auth | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/api/diagnosis/sessions` | sessão | 201 sessão + questão (sem gabarito) ou `available:false` | 401, 400 sem objetivo |
| POST | `/api/diagnosis/sessions/:id/answers` | sessão | 201 feedback + próxima questão ou conclusão | 400 questão errada, 401 |
| GET | `/api/roadmap` | sessão | 200 nós + estados de evidência | 401 |

O diagnóstico e o mapa seguem o **objectivo em foco** do aluno:

- Trilha **seed** (ex.: Java backend) — grafo curado partilhado  
- Outros objectivos do catálogo — currículo **gerado** por objectivo (fundamentos → ferramentas → prática → projecto), com checks e diagnóstico alinhados ao tema  

Estados no mapa: `unassessed` | `passed` | `failed` | `skipped`. `skipped` = pré-requisito falhado; o aluno pode na mesma ver o nó.
