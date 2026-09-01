# ADR 0007 — AI Tutor com provider abstraído e bloqueio honesto

## Estado

Aceite e implementado na fase 10. Nesta máquina fica `BLOCKED/CONFIGURATION_REQUIRED` (sem `AI_API_KEY`).

## Decisão

- O tutor fala com um endpoint compatível com OpenAI (`POST /chat/completions`). Trocar de fornecedor é configuração, não código.
- Sem chave não há tutor: `createAiProvider` devolve `null`, a API responde 409 e a UI não desenha caixa de perguntas nem botão. Nenhuma resposta é simulada.
- O prompt é ancorado no nó em estudo e proíbe a solução completa quando o nó tem exercício avaliado por testes ocultos. Os ficheiros ocultos nunca entram no prompt.
- Isso é instrução ao modelo, não garantia. A UI declara que a resposta vem de um modelo externo e pode estar errada.
- A conversa só é persistida depois de uma resposta real do provider, para o histórico não conter turnos sem resposta.
- Há limites reais de custo e abuso: 2000 caracteres por pergunta, 10 turnos de histórico, 30 perguntas por hora por utilizador.

## Alternativas rejeitadas

- **Modelo local como fallback**: daria a ilusão de tutor configurado com qualidade muito diferente.
- **Resposta guardada antes da chamada**: deixaria perguntas sem resposta no histórico quando o provider falha.
- **Tutor global sem nó**: sem ancoragem o modelo inventa contexto sobre o progresso do aluno.
