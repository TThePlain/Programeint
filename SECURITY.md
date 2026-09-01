# Segurança

## Reportar uma vulnerabilidade

Se encontrares uma falha de segurança no Programeint, **não** abras uma issue pública.

Envia um relatório privado ao maintainer do repositório (GitHub Security Advisory ou contacto directo dos maintainers). Inclui:

- Descrição do problema e impacto
- Passos para reproduzir (PoC mínimo)
- Versão / commit afectado, se souberes
- Sugestão de mitigação (opcional)

Resposta esperada: confirmação em poucos dias úteis e plano de correcção quando aplicável.

## Boas práticas para contribuidores

- Nunca commits `.env`, tokens, chaves API ou dumps de base de dados
- Usa [.env.example](.env.example) como referência de configuração
- Sandbox de lab: não enfraquecer restrições Docker sem discussão
- Auth/sessões: trata cookies e secrets com o mesmo rigor do código existente

Obrigado por ajudares a manter o projecto seguro para alunos e profissionais.
