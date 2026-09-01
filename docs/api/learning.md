# Aprendizagem (próxima ação, módulo, FSRS)

| Método | Caminho | Auth | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/learning/next` | sessão | 200 ação + `href` + texto | 401 |
| POST | `/api/learning/sessions` | sessão | 201 módulo (sem gabarito) | 400 sem diagnóstico, 404 módulo inexistente |
| POST | `/api/learning/sessions/:id/read` | sessão | 201 `readAt` + questão de verificação | 400 sessão fechada, 401 |
| POST | `/api/learning/sessions/:id/check` | sessão | 201 feedback; completa se correto | 400 sem leitura / questão errada |
| POST | `/api/learning/reviews` | sessão | 200 próxima ação + feedback | 400 carta não vencida, 404 |

Prioridade da próxima ação: diagnóstico em curso → diagnóstico em falta → sessão de estudo em curso → revisão FSRS vencida → lab do nó já estudado → módulo publicado → **projeto** (pré-requisitos cumpridos) → `module_unpublished` → caminho publicado concluído.

Ler o módulo **não** marca domínio. Só a verificação correta passa o nó a `studied`. Passar o projeto gera evidência no portfólio, não certificado. Spring e Docker continuam sem aula publicada.

