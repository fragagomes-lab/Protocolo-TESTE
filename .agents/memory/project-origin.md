---
name: Origem do projeto
description: Como este projeto foi importado e o que ficou de fora
---
- O código veio do ZIP `attached_assets/protocolo-operatorio_1786469253355.zip` (workspace privado "clinica-da-face"); a app web original chamava-se `orto-protocol` e foi renomeada para `@workspace/protocolo-cirurgico`.
- **Não importado:** a app móvel Expo (`orto-mobile` no ZIP) e os dados da base de dados original (~548 protocolos — não estavam no ZIP; se o utilizador quiser os dados, precisará de um export SQL do projeto original).
- **Sem autenticação:** a API expõe dados clínicos sem login (fiel ao original); o check de ACL em `storage.ts` está comentado e o CORS aberto. Corrigir antes de publicar.
- **Why:** decisões de fidelidade ao original; segurança proposta como tarefa de follow-up.
- O utilizador comunica em português, registo não-técnico.
