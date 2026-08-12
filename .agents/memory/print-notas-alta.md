---
name: Impressão e Notas de Alta
description: Regras impostas pelo cirurgião para a impressão/PDF e presets de Notas de Alta
---
- Regra obrigatória: nada é impresso automaticamente — o utilizador escolhe secções por checkbox; secções não selecionadas nunca podem aparecer (incluindo Proc. Nº/data no cabeçalho, gated por identification/surgeryData).
- 5 presets fixos: Nota de Alta CdF (identificação, dados cirurgia, diagnóstico, relato, recomendações, resumo), Nota de Alta O Bloco (sem diagnóstico/planeamento/info interna), Protocolo Interno Completo, Checklist Dia da Cirurgia (identificação+previsão laboratorial+checklist apenas), Apenas Relato.
- Menção legal nas Notas de Alta: "Artigo 98, § 1 e 2 do Código Deontológico…" + linha de assinatura digital; assinatura "A. Matos da Fonseca — Cirurgia Maxilo-Facial".
- Previsão Laboratorial: verificações numeradas 1,2,3,4,6,7,8,9 — os nºs 5,10,11,12,13 foram removidos intencionalmente; "Reserva de Sangue" e SARPE (maxila) removidos por ordem do cirurgião (mantidos só em dados legados).

**Why:** exigências explícitas do Dr. Matos da Fonseca baseadas nos documentos reais da clínica; reintroduzir itens removidos ou imprimir secções não escolhidas é um erro clínico/legal.
**How to apply:** qualquer alteração a protocol-print.tsx, lab-prediction-section.tsx ou seeds deve respeitar estas regras.
