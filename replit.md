# Protocolo Cirúrgico Ortognático — Clínica da Face

Aplicação web clínica para digitalização do protocolo operatório de cirurgia ortognática da Clínica da Face (Dr. Matos da Fonseca).

## Run & Operate

- `pnpm --filter @workspace/protocolo-cirurgico run dev` — frontend (porta atribuída automaticamente)
- `pnpm --filter @workspace/api-server run dev` — API server (porta 8080)
- `pnpm run typecheck` — typecheck completo
- `pnpm run build` — typecheck + build todos os pacotes
- `pnpm --filter @workspace/api-spec run codegen` — regenerar hooks e schemas Zod a partir do OpenAPI spec
- `pnpm --filter @workspace/db run push` — aplicar alterações ao schema (dev only)
- Env obrigatória: `DATABASE_URL` — string de ligação PostgreSQL

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TanStack Query, wouter, shadcn/ui, Tailwind CSS, Framer Motion
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validação: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (a partir do OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — contrato OpenAPI (fonte de verdade)
- `lib/api-client-react/src/generated/` — hooks React Query gerados
- `lib/api-zod/src/generated/` — schemas Zod gerados
- `lib/db/src/schema/` — schema Drizzle (protocols.ts, templates.ts, phrases.ts)
- `artifacts/api-server/src/routes/` — rotas Express (protocols, templates, phrases)
- `artifacts/protocolo-cirurgico/src/` — frontend React
- `attached_assets/clinicadaface-logo.gif` — logótipo Clínica da Face

## Architecture decisions

- O protocolo completo é armazenado em colunas JSONB (team, checklist, preopDiagnosis, surgicalPlan, surgicalSequence, intraopRecord, materials) — evita normalização excessiva de dados clínicos altamente estruturados
- A geração automática da descrição operatória é feita server-side a partir dos dados estruturados do protocolo
- Rotas `/protocols/stats` e `/protocols/recent` antes das rotas com parâmetro `/:id` para evitar colisões no router Express 5

## Product

- Dashboard com estatísticas e protocolos recentes
- Lista de protocolos com pesquisa e filtros
- Formulário multi-step (5 passos): Identificação → Checklist/Diagnóstico → Plano Cirúrgico → Registo Intra-op → Descrição Operatória
- Plano cirúrgico modular: maxila (LeFort I/II/III), mandíbula (BSSO), mento (genioplastia), procedimentos associados
- Movimentos em milímetros por segmento
- Materiais de osteossíntese: placas, parafusos, brocas, serras
- Biblioteca de frases clínicas editável e reutilizável
- Geração automática de descrição operatória coerente
- Templates pré-configurados por tipo de cirurgia (Bimaxilar, LeFort I, BSSO)
- Duplicação de protocolos e visualização para impressão/PDF

## User preferences

_Preservar identidade visual da Clínica da Face: cores teal (#2D6B79), tipografia Roboto, cantos retos, sidebar escura._

## Gotchas

- Rotas de estatísticas (`/protocols/stats`, `/protocols/recent`) devem ficar ANTES da rota genérica `/:id` no router Express 5
- Google Fonts `@import url(...)` deve ser a primeira linha do index.css, antes de `@import "tailwindcss"`
- Correr `pnpm run typecheck:libs` após mudanças em `lib/*` antes dos checks de artefactos leaf
