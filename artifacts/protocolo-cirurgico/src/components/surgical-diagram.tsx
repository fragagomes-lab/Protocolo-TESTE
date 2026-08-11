/**
 * SurgicalDiagram — interactive anatomical marking surface.
 *
 * Renders a precise base drawing, the toggleable colour-coded osteotomy lines,
 * and any freehand pen strokes. Everything is stored in the diagram's own
 * viewBox coordinate space, so the on-screen marking and the printed PDF are
 * pixel-for-pixel identical.
 */
import { useRef, useState, useCallback } from "react";
import { DiagramAnnotation, DiagramStroke } from "@workspace/api-client-react";
import { DiagramId, getDiagram, PEN_COLORS } from "./surgical-diagrams/diagrams";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Undo2, Trash2, Pencil, Eraser } from "lucide-react";

interface Props {
  diagramId: DiagramId;
  value: DiagramAnnotation;
  onChange: (next: DiagramAnnotation) => void;
  readOnly?: boolean;
}

function pointsToPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    // a dot — tiny line so it renders
    const [x, y] = points[0];
    return `M ${x} ${y} L ${x + 0.1} ${y + 0.1}`;
  }
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
}

function pathPoints(d: string): [number, number][] {
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const pts: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  return pts;
}

export function SurgicalDiagram({ diagramId, value, onChange, readOnly = false }: Props) {
  const def = getDiagram(diagramId);
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef<[number, number][] | null>(null);

  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState(PEN_COLORS[0].value);
  const [width, setWidth] = useState(2.2);
  const [draft, setDraft] = useState<string>("");

  const lines = value.lines ?? {};
  const strokes = value.strokes ?? [];
  const includeInPdf = value.includeInPdf !== false; // default true

  const toSvg = useCallback((e: React.PointerEvent): [number, number] | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const loc = pt.matrixTransform(ctm.inverse());
    return [Math.round(loc.x * 10) / 10, Math.round(loc.y * 10) / 10];
  }, []);

  const toggleLine = (id: string) =>
    onChange({ ...value, lines: { ...lines, [id]: !lines[id] } });

  const eraseAt = useCallback(
    (x: number, y: number) => {
      const R = Math.max(def.w, def.h) * 0.035;
      const next = strokes.filter((s) => {
        const pts = pathPoints(s.d ?? "");
        return !pts.some(([px, py]) => Math.hypot(px - x, py - y) <= R);
      });
      if (next.length !== strokes.length) onChange({ ...value, strokes: next });
    },
    [strokes, value, onChange, def.w, def.h]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (readOnly) return;
    const p = toSvg(e);
    if (!p) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (tool === "eraser") {
      eraseAt(p[0], p[1]);
      drawing.current = [];
      return;
    }
    drawing.current = [p];
    setDraft(pointsToPath([p]));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (readOnly || drawing.current === null) return;
    const p = toSvg(e);
    if (!p) return;
    if (tool === "eraser") {
      eraseAt(p[0], p[1]);
      return;
    }
    drawing.current.push(p);
    setDraft(pointsToPath(drawing.current));
  };

  const onPointerUp = () => {
    if (readOnly || drawing.current === null) return;
    if (tool === "pen" && drawing.current.length > 0) {
      const stroke: DiagramStroke = { color, width, d: pointsToPath(drawing.current) };
      onChange({ ...value, strokes: [...strokes, stroke] });
    }
    drawing.current = null;
    setDraft("");
  };

  const undo = () => onChange({ ...value, strokes: strokes.slice(0, -1) });
  const clearStrokes = () => {
    if (strokes.length && window.confirm("Apagar todos os traços deste diagrama?"))
      onChange({ ...value, strokes: [] });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground">{def.title}</div>
          <div className="text-[10px] text-muted-foreground">{def.hint}</div>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onChange({ ...value, includeInPdf: !includeInPdf })}
            className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border transition-colors ${
              includeInPdf ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground"
            }`}
            title={includeInPdf ? "Incluído no relatório" : "Excluído do relatório"}
          >
            {includeInPdf ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {includeInPdf ? "No PDF" : "Fora"}
          </button>
        )}
      </div>

      {/* Predefined osteotomy line toggles */}
      {def.lines.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {def.lines.map((l) => {
            const on = !!lines[l.id];
            return (
              <button
                key={l.id}
                type="button"
                disabled={readOnly}
                onClick={() => toggleLine(l.id)}
                className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border transition-all ${
                  on ? "text-white shadow-xs" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                } ${readOnly ? "cursor-default opacity-90" : ""}`}
                style={on ? { backgroundColor: l.color, borderColor: l.color } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: on ? "#fff" : l.color }} />
                {l.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Canvas */}
      <div className="rounded-sm border border-border bg-white overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${def.w} ${def.h}`}
          className="w-full h-auto block"
          style={{ touchAction: "none", cursor: readOnly ? "default" : tool === "eraser" ? "cell" : "crosshair" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          aria-label={def.title}
        >
          <rect x="0" y="0" width={def.w} height={def.h} fill="#ffffff" />
          <def.Base />
          {/* Predefined lines */}
          {def.lines.filter((l) => lines[l.id]).map((l) => (
            <path
              key={l.id}
              d={l.d}
              fill="none"
              stroke={l.color}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="6 4"
            />
          ))}
          {/* Committed freehand strokes */}
          {strokes.map((s, i) => (
            <path
              key={i}
              d={s.d}
              fill="none"
              stroke={s.color ?? "#111827"}
              strokeWidth={s.width ?? 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {/* Live draft */}
          {draft && (
            <path d={draft} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </div>

      {/* Drawing toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-sm border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setTool("pen")}
              className={`px-2 py-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wider ${tool === "pen" ? "bg-primary text-white" : "bg-white text-muted-foreground"}`}
            >
              <Pencil className="h-3 w-3" /> Caneta
            </button>
            <button
              type="button"
              onClick={() => setTool("eraser")}
              className={`px-2 py-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wider ${tool === "eraser" ? "bg-primary text-white" : "bg-white text-muted-foreground"}`}
            >
              <Eraser className="h-3 w-3" /> Apagar
            </button>
          </div>

          <div className="flex items-center gap-1">
            {PEN_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.name}
                onClick={() => {
                  setColor(c.value);
                  setTool("pen");
                }}
                className={`h-5 w-5 rounded-full border-2 transition-transform ${color === c.value && tool === "pen" ? "scale-110 border-slate-800" : "border-white"}`}
                style={{ backgroundColor: c.value, boxShadow: "0 0 0 1px #e2e8f0" }}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            {[1.4, 2.2, 3.5].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWidth(w)}
                className={`h-6 w-6 rounded-sm border flex items-center justify-center ${width === w ? "border-primary bg-primary/5" : "border-border"}`}
                title={`Espessura ${w}`}
              >
                <span className="rounded-full bg-slate-700" style={{ width: w * 2, height: w * 2 }} />
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Button type="button" variant="outline" size="sm" onClick={undo} disabled={strokes.length === 0} className="h-7 text-[10px] uppercase tracking-wider">
              <Undo2 className="h-3 w-3 mr-1" /> Desfazer
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearStrokes} disabled={strokes.length === 0} className="h-7 text-[10px] uppercase tracking-wider text-destructive">
              <Trash2 className="h-3 w-3 mr-1" /> Limpar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Static render for the printed report. Returns null when nothing was marked. */
export function SurgicalDiagramStatic({
  diagramId,
  value,
  width = 260,
}: {
  diagramId: DiagramId;
  value: DiagramAnnotation;
  width?: number;
}) {
  const def = getDiagram(diagramId);
  const lines = value.lines ?? {};
  const strokes = value.strokes ?? [];
  const activeLines = def.lines.filter((l) => lines[l.id]);
  if (activeLines.length === 0 && strokes.length === 0) return null;

  return (
    <div className="inline-block">
      <svg viewBox={`0 0 ${def.w} ${def.h}`} width={width} height={(width * def.h) / def.w} style={{ border: "1px solid #e5e7eb", background: "#fff" }}>
        <rect x="0" y="0" width={def.w} height={def.h} fill="#ffffff" />
        <def.Base />
        {activeLines.map((l) => (
          <path key={l.id} d={l.d} fill="none" stroke={l.color} strokeWidth="2.4" strokeLinecap="round" strokeDasharray="6 4" />
        ))}
        {strokes.map((s, i) => (
          <path key={i} d={s.d} fill="none" stroke={s.color ?? "#111827"} strokeWidth={s.width ?? 2} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
      <div style={{ fontSize: 9, textAlign: "center", color: "#64748b", marginTop: 2 }}>{def.title}</div>
    </div>
  );
}
