import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SurgicalTeam } from "@workspace/api-client-react";

interface TeamSectionProps {
  team: SurgicalTeam;
  updateTeam: (team: SurgicalTeam) => void;
  isFinalized: boolean;
}

type TeamField = keyof SurgicalTeam;

// ─── Default clinic roster (pre-seeded suggestions) ─────────────────────────
const DEFAULT_SUGGESTIONS: Partial<Record<TeamField, string[]>> = {
  surgeon: ["Dr. António Matos da Fonseca"],
  surgeonOmNumber: ["21892"],
  firstAssistant: ["Dr. Luís Matos Cunha", "Dr. Miguel Fraga G."],
  secondAssistant: ["Dr. Luís Matos Cunha", "Dr. Miguel Fraga G."],
};

// ─── Persistent roster: names typed once are remembered for future protocols ─
const ROSTER_KEY = "orto.teamRoster.v1";

type Roster = Partial<Record<TeamField, string[]>>;

const KNOWN_FIELDS: TeamField[] = [
  "surgeon",
  "surgeonOmNumber",
  "firstAssistant",
  "secondAssistant",
  "instrumentist",
  "anesthesiologist",
  "scrubNurse",
  "perfusionist",
];

function loadRoster(): Roster {
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const roster: Roster = {};
    for (const field of KNOWN_FIELDS) {
      const value = (parsed as Record<string, unknown>)[field];
      if (Array.isArray(value)) {
        const names = value.filter((n): n is string => typeof n === "string" && n.trim().length > 0);
        if (names.length > 0) roster[field] = names;
      }
    }
    return roster;
  } catch {
    return {};
  }
}

function saveToRoster(field: TeamField, name: string): Roster {
  const trimmed = name.trim();
  const roster = loadRoster();
  if (trimmed.length < 3) return roster;
  const list = roster[field] || [];
  if (!list.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
    roster[field] = [...list, trimmed];
    try {
      localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
    } catch {
      /* storage unavailable — suggestions just won't persist */
    }
  }
  return roster;
}

const FIELDS: { field: TeamField; label: string }[] = [
  { field: "surgeon", label: "Cirurgião Principal" },
  { field: "surgeonOmNumber", label: "Nº OM (Cirurgião Responsável)" },
  { field: "anesthesiologist", label: "Anestesista" },
  { field: "firstAssistant", label: "1º Ajudante" },
  { field: "instrumentist", label: "Instrumentista" },
  { field: "secondAssistant", label: "2º Ajudante" },
  { field: "scrubNurse", label: "Enfermeiro Circulante" },
];

export function TeamSection({ team, updateTeam, isFinalized }: TeamSectionProps) {
  const [roster, setRoster] = useState<Roster>(() => loadRoster());

  const suggestions = useMemo(() => {
    const merged: Partial<Record<TeamField, string[]>> = {};
    for (const { field } of FIELDS) {
      const seeded = DEFAULT_SUGGESTIONS[field] || [];
      const saved = roster[field] || [];
      const all: string[] = [];
      for (const n of [...seeded, ...saved]) {
        if (!all.some((x) => x.toLowerCase() === n.toLowerCase())) all.push(n);
      }
      merged[field] = all;
    }
    return merged;
  }, [roster]);

  const handleChange = (field: TeamField, value: string) => {
    updateTeam({ ...team, [field]: value });
  };

  const handleBlur = (field: TeamField) => {
    const value = team[field];
    if (typeof value === "string" && value.trim()) {
      setRoster(saveToRoster(field, value));
    }
  };

  return (
    <Card className="shadow-xs border-border/50">
      <CardHeader>
        <CardTitle className="uppercase tracking-widest text-sm text-primary">Equipa Cirúrgica</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {FIELDS.map(({ field, label }) => (
            <div className="space-y-2" key={field}>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                {label}
              </Label>
              <Input
                value={team[field] || ""}
                onChange={(e) => handleChange(field, e.target.value)}
                onBlur={() => handleBlur(field)}
                disabled={isFinalized}
                list={`team-suggestions-${field}`}
                autoComplete="off"
              />
              {(suggestions[field]?.length || 0) > 0 && (
                <datalist id={`team-suggestions-${field}`}>
                  {suggestions[field]!.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-4">
          Os nomes introduzidos ficam memorizados e são sugeridos automaticamente em protocolos futuros.
        </p>
      </CardContent>
    </Card>
  );
}
