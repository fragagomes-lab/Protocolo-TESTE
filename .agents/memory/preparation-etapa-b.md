---
name: Preparação (Etapa B)
description: Regras de negócio e decisões da área de Preparação (checklist, prazos, na_auto, concorrência, i18n)
---

# Área de Preparação (Etapa B)

- Página própria em `/protocols/:id/preparation`, fora do formulário multi-step; futura linha temporal Preparação → Cirurgia Virtual → Cirurgia → Pós-op.
- **na_auto é derivado, nunca autoritativo.** Se a regra de aplicabilidade voltar a tornar um item/produto aplicável, um `na_auto` gravado é ignorado (volta a "todo") — no frontend E no endpoint de pendências. **Why:** mudar de Splintless para guias podia ocultar uma pendência clínica.
- **Prazos contam por dia civil.** Data-limite só fica "ultrapassada" após o FIM do próprio dia; produtos por verificar contam até ao fim do dia da cirurgia. Regra BRK −3 semanas / Aligners −2 semanas, com override manual.
- **Concorrência:** o formulário NÃO carrega nem envia `preparation` (só o separador Preparação o grava) — evita que autosave com snapshot antigo apague a preparação. Na página de Preparação, todos os mutators compõem a partir de `prepRef.current` (sincronizado no `persist`, não só no useEffect) e usam fila latest-wins. Falta ainda optimistic concurrency por protocolo (task follow-up #1).
- **I18N impressão:** etiquetas estruturais traduzidas via dicionário I18N do protocol-print; catálogo da Preparação traduzido via `PREP_I18N`/`prepI18n` em `src/lib/preparation.ts`. Enums clínicos (osteotomias, placas, atos médicos da Tabela OM) ficam em PT até validação do cirurgião (task #2). Nunca traduzir nomes próprios, moradas, nome do cirurgião; designação profissional traduz-se.
