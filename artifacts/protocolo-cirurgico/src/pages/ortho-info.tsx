import { BookOpen, Activity, Eye, Wind, Wrench, CheckCircle } from "lucide-react";

const SectionCard = ({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white border border-border rounded-none shadow-sm">
    <div className="flex items-start gap-4 p-6">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">{title}</h2>
        {children}
      </div>
    </div>
  </div>
);

export function OrthoInfo() {
  return (
    <div className="flex-1 overflow-auto bg-muted/5">
      {/* Page Header */}
      <div className="bg-sidebar text-white px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-6 w-6 text-white/80" />
            <span className="text-xs uppercase tracking-widest text-white/70 font-semibold">Referência Clínica</span>
          </div>
          <h1 className="text-2xl font-light tracking-tight">Cirurgia Ortognática — Enquadramento Clínico</h1>
          <p className="text-white/70 text-sm mt-1">Clínica da Face · Dr. Matos da Fonseca</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">

        {/* Section 1 */}
        <SectionCard number={1} title="Deformidades Dentofaciais">
          <p className="text-sm text-muted-foreground leading-relaxed">
            As deformidades dentofaciais resultam de alterações no crescimento dos maxilares, podendo afectar a oclusão, a estética facial e a função respiratória e mastigatória. As mais comuns incluem as classes II e III esqueléticas, mordidas abertas anteriores, mordidas cruzadas e assimetrias faciais de grau variável.
          </p>
        </SectionCard>

        {/* Section 2 — Impact cards */}
        <SectionCard number={2} title="Impacto Clínico">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: <CheckCircle className="h-4 w-4 text-primary" />,
                title: "Oclusal",
                text: "Má-oclusão esquelética, dificuldade de mastigação, desgaste dentário prematuro, compromisso periodontal",
              },
              {
                icon: <Eye className="h-4 w-4 text-primary" />,
                title: "Estético",
                text: "Disproporção facial, retrusão ou protrusão mandibular/maxilar, assimetria facial, impacto psicossocial",
              },
              {
                icon: <Wind className="h-4 w-4 text-primary" />,
                title: "Respiratório",
                text: "Síndrome de apneia obstrutiva do sono, respiração oral crónica, compromisso das vias aéreas superiores",
              },
              {
                icon: <Activity className="h-4 w-4 text-primary" />,
                title: "Funcional",
                text: "Disfunção temporo-mandibular, limitação da abertura bucal, dificuldades de fonação e mastigação",
              },
            ].map(card => (
              <div key={card.title} className="border border-border p-4 rounded-none bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  {card.icon}
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">{card.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{card.text}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Section 3 */}
        <SectionCard number={3} title="Motivos de Consulta Frequentes">
          <ul className="space-y-2">
            {[
              "Dentes que não engrenam correctamente (trespasse horizontal e vertical anómalos)",
              "Queixo muito recuado (retrognatia) ou muito proeminente (prognatia)",
              "Face assimétrica com desvio do mento",
              "Dificuldade em mastigar ou morder alimentos",
              "Roncopatia / síndrome de apneia obstrutiva do sono",
              "Dor articular temporo-mandibular persistente",
              "Indicação do médico dentista ou ortodontista para avaliação cirúrgica",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Section 4 */}
        <SectionCard number={4} title="Objectivos Terapêuticos">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Correcção da relação esquelética maxilo-mandibular, restabelecimento da oclusão funcional em classe I, harmonização do perfil facial segundo os padrões de estética contemporânea, melhoria da função respiratória e mastigatória, e estabilidade da correção a longo prazo.
          </p>
        </SectionCard>

        {/* Section 5 — Timeline */}
        <SectionCard number={5} title="Sequência Ortodôntico-Cirúrgica">
          <div className="flex flex-col sm:flex-row gap-0 sm:gap-0 overflow-x-auto">
            {[
              {
                step: 1,
                title: "Ortodontia Pré-Cirúrgica",
                duration: "12–18 meses",
                items: [
                  "Nivelamento e alinhamento dentário",
                  "Descompensação das inclinações dentárias",
                  "Preparação da oclusão para a cirurgia",
                ],
              },
              {
                step: 2,
                title: "Planeamento Cirúrgico",
                duration: "2–3 meses",
                items: [
                  "Cefalometria, CBCT, modelos digitais",
                  "Planeamento virtual 3D",
                  "Confecção de guias e splints",
                ],
              },
              {
                step: 3,
                title: "Cirurgia Ortognática",
                duration: "Internamento 1–2 dias",
                items: [
                  "Osteotomias maxilares e/ou mandibulares",
                  "Reposicionamento ósseo preciso",
                  "Fixação rígida com titânio, via intra-oral",
                ],
              },
              {
                step: 4,
                title: "Ortodontia Pós-Cirúrgica",
                duration: "6–12 meses",
                items: [
                  "Finalização da oclusão",
                  "Detalhamento dos contactos oclusais",
                  "Retenção e estabilização",
                ],
              },
            ].map((phase, idx, arr) => (
              <div key={phase.step} className="flex sm:flex-col flex-row flex-1 items-start sm:items-stretch">
                <div className="flex sm:flex-row items-center sm:items-start">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0 z-10">
                    {phase.step}
                  </div>
                  {idx < arr.length - 1 && (
                    <div className="hidden sm:block flex-1 h-px bg-primary/30 mt-4 mx-2" />
                  )}
                </div>
                <div className="sm:mt-3 ml-3 sm:ml-0 pb-4 sm:pb-0 pr-0 sm:pr-4 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-foreground">{phase.title}</p>
                  <p className="text-[10px] text-primary font-semibold mt-0.5 mb-2">{phase.duration}</p>
                  <ul className="space-y-1">
                    {phase.items.map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                        <span className="mt-1 w-1 h-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Section 6 */}
        <SectionCard number={6} title="Abordagem Surgery-First">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Em casos seleccionados, é possível realizar a cirurgia antes da ortodontia convencional, reduzindo o tempo total de tratamento. Esta abordagem requer planeamento virtual 3D rigoroso e é indicada em situações em que a deformidade esquelética é a componente predominante.
          </p>
        </SectionCard>

        {/* Section 7 */}
        <SectionCard number={7} title="Cirurgia por Via Intra-Oral">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Toda a cirurgia ortognática é realizada exclusivamente por via intra-oral, sem incisões cutâneas externas. As osteotomias efectuam-se através de incisões na mucosa oral, não resultando em cicatrizes visíveis no rosto.
          </p>
        </SectionCard>

        {/* Section 8 */}
        <SectionCard number={8} title="Planeamento Facial e Funcional">
          <p className="text-sm text-muted-foreground leading-relaxed">
            O planeamento baseia-se na análise cefalométrica, fotografia clínica padronizada, tomografia computorizada de feixe cónico (CBCT) e, crescentemente, no planeamento virtual 3D com simulação dos movimentos ósseos e previsão dos resultados nos tecidos moles.
          </p>
        </SectionCard>

        {/* Section 9 — Complementary procedures */}
        <SectionCard number={9} title="Procedimentos Complementares">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Genioplastia",
                text: "Reposicionamento cirúrgico do mento para harmonização do perfil facial",
              },
              {
                title: "Expansão Palatina Cirúrgica (SARPE)",
                text: "Indicada em casos de atresia maxilar transversal severa",
              },
              {
                title: "Rinoplastia",
                text: "Frequentemente associada para harmonização do terço médio facial",
              },
              {
                title: "Distração Osteogénica",
                text: "Utilizada em deformidades severas ou em situações de compromisso respiratório grave",
              },
            ].map(proc => (
              <div key={proc.title} className="border border-border p-4 rounded-none bg-white">
                <p className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">{proc.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{proc.text}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Section 10 */}
        <SectionCard number={10} title="Planeamento Virtual 3D">
          <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 p-4 rounded-none">
            <Wrench className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cada processo clínico inclui uma galeria de planeamento virtual 3D acessível no separador{" "}
              <span className="font-semibold text-foreground">«Planeamento 3D»</span> dentro de cada protocolo, onde podem ser carregadas e organizadas as imagens do planeamento cirúrgico virtual — incluindo fotografias clínicas, renders 3D, simulações de tecidos moles, osteotomias planeadas e comparações pré/pós-operatórias.
            </p>
          </div>
        </SectionCard>

      </div>
    </div>
  );
}
