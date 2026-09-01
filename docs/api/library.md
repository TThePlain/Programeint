# Biblioteca de conteúdo legal

| Método | Caminho | Auth | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/library` | sessão | 200 `{policy, items}`; filtros `?node=<slug>` e `?kind=<tipo>` | 401 |
| GET | `/api/library/nodes/:slug` | sessão | 200 `{node, items}` | 401, 404 nó inexistente |

## Política (aplicada em código, não só em texto)

Um recurso só é servido se cumprir **todas** as regras de `listableRejection` em `packages/shared/src/library.ts`:

| Regra | Rejeição |
|---|---|
| URL começa por `https://` | `url_insegura` |
| Licença está no catálogo `RESOURCE_LICENSES` | `licenca_desconhecida` |
| Tipo está em `RESOURCE_KINDS` | `tipo_desconhecido` |
| Link aponta para o site do próprio editor | `fonte_nao_oficial` |

A regra é aplicada duas vezes: o seed recusa-se a semear um recurso fora da política, e a API volta a filtrar antes de responder. O teste de integração grava de propósito um recurso pirata na base e confirma que ele nunca aparece na listagem.

A biblioteca **liga** à fonte; não aloja, não copia e não serve o conteúdo. Nenhum ficheiro de terceiros é guardado.

## Catálogo

Curado no repositório (`packages/database/src/library.ts`), ligado aos nós do grafo. Acrescentar recurso é dados, não código. Publicados agora: OpenJDK, Wikibooks Java, JUnit 5 User Guide, Spring Framework, Spring Boot, MDN HTTP, PostgreSQL Docs, Pro Git, Docker Docs.

Licenças aceites: `Apache-2.0`, `EPL-2.0`, `GPL-2.0-with-classpath-exception`, `PostgreSQL`, `CC-BY-SA-4.0`, `CC-BY-SA-2.5`, `CC-BY-NC-SA-3.0`. O campo `redistributable` diz se a licença permitiria reutilizar o conteúdo — hoje não reutilizamos nenhum.

## Verificação de links

`pnpm library:check` faz HEAD (com recurso a GET quando o editor recusa HEAD) a cada URL publicado e grava `lastStatus` e `lastCheckedAt`. Sai com código 1 se algum link falhar, e a UI mostra o estado. Última execução: 9/9 acessíveis.

## Descoberta automática

Não existe. Ficou de fora por decisão explícita (ver ADR 0008): exigiria uma API de pesquisa externa e não daria garantia de licença. Um recurso entra por curadoria, com licença verificada à mão.
