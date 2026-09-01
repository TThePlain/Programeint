# ADR 0005 — Portfólio é evidência, não certificado

## Estado

Aceite e implementado na fase 8.

## Decisão

- Um projeto publicado tem testes ocultos executados no sandbox Docker (mesmo threat model do lab).
- Só um run `passed` cria `portfolio_evidence`.
- A UI declara que isso não é diploma, não é projeto de produção e não publica no GitHub.
- Sem OAuth configurado, não há botão «enviar para o GitHub».
