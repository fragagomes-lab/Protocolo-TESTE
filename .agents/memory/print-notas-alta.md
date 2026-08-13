---
name: Impressão e Notas de Alta
description: Regras impostas pelo cirurgião para a impressão/PDF e presets de Notas de Alta
---
- Regra obrigatória: nada é impresso automaticamente — o utilizador escolhe secções por checkbox; secções não selecionadas nunca podem aparecer (incluindo Proc. Nº/data no cabeçalho, gated por identification/surgeryData).
- Preset "Relatório Clínico Pré-operatório (Seguradora)" (modelos CL II/III): identificação → diagnóstico (texto do construtor) → Terapêutica Cirúrgica Ortognática (data/local/internamento previsto) → Atos Médicos (códigos OM + valores K derivados do plano; maxila incluída sem tipo = LeFort I) → Equipa (frase fixa + "Responsável: … Nº OM 21892"); avisos clínicos internos nunca aparecem neste documento.
- 5 presets fixos: Nota de Alta CdF (identificação, dados cirurgia, diagnóstico, relato, recomendações, resumo), Nota de Alta O Bloco (sem diagnóstico/planeamento/info interna), Protocolo Interno Completo, Checklist Dia da Cirurgia (identificação+previsão laboratorial+checklist apenas), Apenas Relato.
- Menção legal nas Notas de Alta: "Artigo 98, § 1 e 2 do Código Deontológico…" + linha de assinatura digital; assinatura "A. Matos da Fonseca — Cirurgia Maxilo-Facial".
- Previsão Laboratorial: verificações numeradas 1,2,3,4,6,7,8,9 — os nºs 5,10,11,12,13 foram removidos intencionalmente; "Reserva de Sangue" e SARPE (maxila) removidos por ordem do cirurgião (mantidos só em dados legados).

**Why:** exigências explícitas do Dr. Matos da Fonseca baseadas nos documentos reais da clínica; reintroduzir itens removidos ou imprimir secções não escolhidas é um erro clínico/legal.
**How to apply:** qualquer alteração a protocol-print.tsx, lab-prediction-section.tsx ou seeds deve respeitar estas regras.

## Documentos (ago 2026)
- Fotos no PDF: NENHUMA marcada por omissão (incl. foto de identificação — checkbox própria).
- Edições da pré-visualização vivem em protocol.documentEdits, chave `docStyle:idioma:bloco`. O PATCH do servidor faz merge POR CHAVE (valor null apaga a chave) — nunca enviar o objeto inteiro do cliente.
- Idiomas do documento PT/EN/ES: tradução por IA via POST /protocols/{id}/translate-document (funciona em protocolos finalizados; não altera dados clínicos); traduções gravadas em documentEdits (editáveis); substituição de traduções existentes exige confirmação do médico.
- Assinatura: anestesista nunca assina; bloco fixo Dr. António Matos da Fonseca / Cédula OM 21892; representante "p/" em signatureRepresentative; imagem manuscrita em signatureImagePath.
- Rodapé/cabeçalho: morada atual = Av. José Gomes Ferreira 15, Piso 4, Ed. Atlas IV, 1495-139 Algés; subtítulo "Cirurgia Ortognática / Dr. António Matos da Fonseca". Nada de Implantologia/Ortodontia.
- "Previsão Laboratorial" renomeada "Protocolo/Execução Cirúrgica"; complementos estruturados por osso (maxillaComplement, mandibleComplement, chinComplement, nasalComplement, alloplasticImplants) com retrocompatibilidade do objeto antigo `complements`.
