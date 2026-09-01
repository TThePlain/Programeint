# AI Tutor

| Método | Caminho | Auth | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/tutor/status` | pública | 200 `{configured, model, errorCode, message}` | — |
| GET | `/api/tutor/threads/:nodeSlug` | sessão | 200 conversa persistida (vazia é estado real) | 401, 404 nó inexistente |
| POST | `/api/tutor/threads/:nodeSlug/messages` | sessão | 201 conversa atualizada | 400 conteúdo inválido, 401, 404, 409 `BLOCKED/CONFIGURATION_REQUIRED`, 502 `AI_PROVIDER_ERROR`, 429 rate limit |

## Configuração

| Variável | Obrigatória | Default |
|---|---|---|
| `AI_API_KEY` | sim | — |
| `AI_BASE_URL` | não | `https://api.openai.com/v1` |
| `AI_MODEL` | não | `gpt-4o-mini` |

Sem `AI_API_KEY` o tutor fica `BLOCKED/CONFIGURATION_REQUIRED`: `status.configured = false`, o `POST` devolve 409 e a UI não mostra caixa de perguntas. Nunca há resposta simulada nem histórico inventado.

## Provider

`createAiProvider` devolve `null` sem chave — não existe fallback local. A implementação (`OpenAiCompatibleProvider`) fala com qualquer endpoint compatível com `POST /chat/completions` da OpenAI, com timeout de 30 s. Trocar de fornecedor é trocar `AI_BASE_URL` e `AI_MODEL`.

Erros do provider (HTTP != 2xx, resposta vazia, rede) sobem como 502 `AI_PROVIDER_ERROR`. A conversa **só** é gravada depois de uma resposta real, para não deixar turnos órfãos.

## Grounding e limites

O prompt de sistema é construído em `packages/shared/src/tutor.ts` e inclui o nó em estudo, o resumo do nó e o do módulo. Quando o nó tem exercício publicado, proíbe explicitamente a solução completa. Ficheiros de teste ocultos nunca entram no prompt.

Isto é instrução ao modelo, não garantia: a UI declara que as respostas vêm de um modelo externo e podem estar erradas.

Limites reais: 2000 caracteres por pergunta, 10 turnos de histórico enviados ao modelo, 30 perguntas por hora por utilizador (Redis).
