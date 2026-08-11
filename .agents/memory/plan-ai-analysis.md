---
name: Análise IA do planeamento
description: Regras duradouras do fluxo de IA (2 fases) sobre imagens de planeamento e do JSON planAiAnalysis
---

Regras acordadas com o cirurgião (não violar em trabalho futuro):
- A IA nunca corre automaticamente (só por botão), nunca apaga imagens, e nunca inventa valores — ilegível ⇒ `undetermined`.
- O output original da IA é imutável: repetições com `force` **arquivam** o resultado anterior em `archivedRuns`/`archivedClassifications` dentro de `protocols.planAiAnalysis`, nunca substituem sem rasto.
- Confirmação em dois níveis: revisão por item (confirmar/corrigir/rejeitar) e só depois confirmação global; "Aplicar ao plano" exige a confirmação global (frontend e é bom manter no servidor).
- A seleção autoritária para a extração é a gravada na BD (`isFinalMeasurement` + `selectedForExtraction`), não a lista enviada pelo cliente.
- Modelos: gpt-5.6-luna (classificação, barata) e gpt-5.6-terra (extração+diagnóstico) via Replit AI Integrations (ativa desde 11/08/2026, após verificação de telemóvel do utilizador).
- **Porquê:** contexto clínico — auditabilidade e decisão humana obrigatórias; a code review chumbou a 1ª versão por permitir aplicar valores sem confirmação global e por destruir `aiRaw` em re-execuções.
- **Fraqueza conhecida:** escrita last-writer-wins no jsonb (tarefa própria para concorrência).
