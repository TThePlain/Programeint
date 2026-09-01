# ADR 0008 — Biblioteca liga à fonte legal, com curadoria

## Estado

Aceite e implementado na fase 11. Funcional sem qualquer credencial externa.

## Decisão

- A biblioteca guarda **metadados e um link**. Nunca aloja, copia ou serve conteúdo de terceiros.
- Um recurso só entra com licença conhecida (catálogo `RESOURCE_LICENSES`), URL `https://` e link para o site do próprio editor. Falhar uma regra é ficar de fora, não entrar com aviso.
- A regra vive em `packages/shared` e é aplicada no seed **e** na API. O teste de integração insere um recurso pirata na base e exige que ele não seja servido.
- Os recursos são curados no repositório e ligados aos nós do grafo, para o aluno chegar a eles a partir do que está a estudar.
- `pnpm library:check` verifica por HTTP que os links respondem e grava o estado. Link partido é estado real, registado, não escondido.

## Alternativas rejeitadas

- **Descoberta automática por API de pesquisa**: traria resultados sem garantia de licença e obrigaria a uma chave externa. A classificação de licença não é automatizável com honestidade.
- **Guardar cópias ou excertos**: é exatamente o que a regra anti-pirataria proíbe, e criaria obrigações de licenciamento que não temos.
- **Aceitar links de qualquer domínio**: um PDF de um livro pago alojado em terceiros passaria a regra da licença mas seria pirataria. Daí a exigência de fonte oficial.
- **Submissão livre pelo aluno**: sem revisão, a biblioteca deixaria de poder afirmar que é legal.
