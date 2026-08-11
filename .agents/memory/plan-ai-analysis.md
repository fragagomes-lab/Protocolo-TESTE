---
name: Análise IA do planeamento
description: Regras duradouras do fluxo de IA (2 fases) sobre imagens de planeamento e do JSON planAiAnalysis
---

Regras acordadas com o cirurgião (não violar em trabalho futuro):
- A IA nunca corre automaticamente (só por botão), nunca apaga imagens, e nunca inventa valores — ilegível ⇒ `undetermined`.
- O output original da IA é imutável: repetições com `force` **arquivam** o resultado anterior em `archivedRuns`/`archivedClassifications` dentro de `protocols.planAiAnalysis`, nunca substituem sem rasto.
- Confirmação: por pedido do cirurgião (11/08/2026), o fluxo por defeito é **confirmação em bloco** de todas as medidas sem dúvida; só as propostas `undetermined`/sem valor exigem revisão uma a uma (corrigir ou rejeitar). "Aplicar ao plano" continua a exigir a confirmação global.
- A seleção autoritária para a extração é a gravada na BD (`isFinalMeasurement` + `selectedForExtraction`), não a lista enviada pelo cliente.
- Modelos: gpt-5.6-luna (classificação, barata) e gpt-5.6-terra (extração+diagnóstico) via Replit AI Integrations (ativa desde 11/08/2026, após verificação de telemóvel do utilizador).
- **Porquê:** contexto clínico — auditabilidade e decisão humana obrigatórias; a code review chumbou a 1ª versão por permitir aplicar valores sem confirmação global e por destruir `aiRaw` em re-execuções.
- **Fraqueza conhecida:** escrita last-writer-wins no jsonb (tarefa própria para concorrência).

## Convenção clínica do cirurgião para pontos Dolphin (11/08/2026 — NUNCA alterar sem ordem dele)
- **PNS/ENP** = avanço REAL do lado DIREITO do maxilar; **A-Point** = lado ESQUERDO. Correspondem ao degrau (step/dobra) das placas de fixação paranasais pré-moldadas — não têm o significado cefalométrico habitual. Cada um mostra também as alterações verticais e transversais desse local.
- **B-Point** = movimentos da mandíbula. **Pogónio** = movimento sagital de mandíbula+mento SOMADOS (+ vertical e transversal desse local).
- **Porquê:** intra-operatoriamente o que interessa é o avanço que as placas paranasais devem ter; não existindo pontos cefalométricos nesses locais, o cirurgião convencionou usar PNS (dta) e A (esq).
