/**
 * AnatomicalMap — frontal osteosynthesis map.
 *
 * Uses the clinic's own frontal drawing WITHOUT any plates pre-drawn (the plate
 * layer was removed from the original artwork). Plates only appear on the map
 * once they are registered from the library AND assigned an anatomical zone —
 * each registered plate is overlaid as a small plate glyph at its zone.
 */
import { PlateRecord } from "@workspace/api-client-react";
import { PlateSvgIcon } from "@/components/plate-svgs";
import frontalImg from "@assets/map-frontal-clean.png";

// ─── Zone metadata: label + normalized position on the frontal drawing ─────────
// Positions (0–1) were measured from the plate centroids in the clinic's own
// drawing. Convention: viewer looks AT the patient, so the patient's right
// ("Dir.") is on the left of the image (smaller x).
export interface ZoneInfo {
  id: string;
  label: string;
  x: number;
  y: number;
}

export const ANATOMICAL_ZONES: ZoneInfo[] = [
  { id: "pilar_zigomatico_dir", label: "P. Zigomático Dir.", x: 0.246, y: 0.447 },
  { id: "pilar_zigomatico_esq", label: "P. Zigomático Esq.", x: 0.727, y: 0.444 },
  { id: "pilar_canino_dir",     label: "P. Canino Dir.",     x: 0.403, y: 0.448 },
  { id: "pilar_canino_esq",     label: "P. Canino Esq.",     x: 0.574, y: 0.454 },
  { id: "bordo_ant_dir",        label: "Bordo Ant. Dir.",    x: 0.40,  y: 0.83 },
  { id: "bordo_ant_esq",        label: "Bordo Ant. Esq.",    x: 0.60,  y: 0.83 },
  { id: "bordo_inf_dir",        label: "Bordo Inf. Dir.",    x: 0.281, y: 0.789 },
  { id: "bordo_inf_esq",        label: "Bordo Inf. Esq.",    x: 0.692, y: 0.792 },
  { id: "mento",                label: "Mento",              x: 0.488, y: 0.893 },
];

const ZONE_BY_ID: Record<string, ZoneInfo> = Object.fromEntries(
  ANATOMICAL_ZONES.map((z) => [z.id, z]),
);

interface PlacedZone {
  zone: ZoneInfo;
  count: number;
  plateType: string;
}

/** Group registered plates by their assigned zone (ignoring plates without a mapped zone). */
function groupByZone(plates: PlateRecord[]): PlacedZone[] {
  const acc = new Map<string, PlacedZone>();
  for (const p of plates) {
    const zone = p.anatomicalZone ? ZONE_BY_ID[p.anatomicalZone] : undefined;
    if (!zone) continue;
    const existing = acc.get(zone.id);
    if (existing) {
      existing.count += 1;
    } else {
      acc.set(zone.id, { zone, count: 1, plateType: p.plateType || "" });
    }
  }
  return ANATOMICAL_ZONES.map((z) => acc.get(z.id)).filter(Boolean) as PlacedZone[];
}

interface AnatomicalMapProps {
  /** Plates already placed — overlaid on the map at their zone */
  plates: PlateRecord[];
  /** Kept for API compatibility; the map is display-only */
  onZoneClick?: (zoneId: string) => void;
  activeZone?: string | null;
  readOnly?: boolean;
}

function MapCore({ plates, markerSize = 22 }: { plates: PlateRecord[]; markerSize?: number }) {
  const placed = groupByZone(plates);

  return (
    <div className="flex flex-col items-center gap-1 w-full">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
        Mapa de Osteossíntese — Vista Frontal
      </div>
      <div className="rounded-md border border-border bg-white p-2 w-full max-w-[280px]">
        <div className="relative">
          <img src={frontalImg} alt="Mapa anatómico frontal" className="w-full h-auto block" />
          {/* Plate overlays — only appear for registered plates with a chosen zone */}
          {placed.map(({ zone, count, plateType }) => (
            <div
              key={zone.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${zone.x * 100}%`, top: `${zone.y * 100}%` }}
              title={`${zone.label}${count > 1 ? ` × ${count}` : ""}`}
            >
              <div className="relative flex items-center justify-center rounded-full bg-white/85 border border-primary/60 shadow-sm p-0.5">
                <PlateSvgIcon plateType={plateType} size={markerSize} />
                {count > 1 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[8px] leading-none rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                    {count}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {placed.length > 0 ? (
        <div className="text-[9px] text-muted-foreground leading-relaxed text-center space-y-0.5 mt-1">
          <div className="uppercase tracking-wider font-semibold text-foreground/70">Placas colocadas</div>
          {placed.map(({ zone, count }) => (
            <div key={zone.id} className="flex items-center gap-1 justify-center">
              <span className="inline-block w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              <span>{zone.label}{count > 1 ? ` × ${count}` : ""}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[9px] text-muted-foreground mt-1 text-center">
          Sem placas registadas.<br />Registe uma placa na biblioteca e escolha a zona.
        </div>
      )}
    </div>
  );
}

export function AnatomicalMap({ plates }: AnatomicalMapProps) {
  return <MapCore plates={plates} markerSize={22} />;
}

/** Static version for print — identical (component is already display-only) */
export function AnatomicalMapPrint({ plates }: { plates: PlateRecord[] }) {
  return <MapCore plates={plates} markerSize={20} />;
}
