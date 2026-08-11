---
name: Codegen Orval/Zod
description: Versão do orval tem de ficar em 8.21.x
---
- O orval tem de ficar fixado em `8.21.0` em `lib/api-spec/package.json`.
- **Why:** o orval ≥8.23 gera `zod.int()` (API do zod v4), incompatível com o zod 3.25.x usado no workspace — o `codegen` falha no typecheck com "Property 'int' does not exist".
- **How to apply:** ao correr `pnpm --filter @workspace/api-spec run codegen` após alterar o `openapi.yaml`, se aparecerem erros `zod.int`, confirmar a versão do orval antes de mexer no spec.
