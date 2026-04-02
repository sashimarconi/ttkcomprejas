import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Radio, ChevronDown, ChevronUp } from "lucide-react";

interface SessionLocation {
  location: string;
  count: number;
}

interface SessionWithGeo {
  session_id: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
}

interface SessionsByLocationProps {
  liveSessions: SessionWithGeo[];
  todaySessions: SessionWithGeo[];
}

function formatLocation(s: SessionWithGeo): string {
  if (s.region && s.country) return `${s.country} - ${s.region}`;
  if (s.city && s.country) return `${s.country} - ${s.city}`;
  if (s.country) return s.country;
  return "Desconhecido";
}

export default function SessionsByLocation({ liveSessions, todaySessions }: SessionsByLocationProps) {
  const [mode, setMode] = useState<"live" | "today">("today");
  const [expanded, setExpanded] = useState(false);

  const sessions = mode === "live" ? liveSessions : todaySessions;

  const locationMap = new Map<string, number>();
  sessions.forEach(s => {
    const loc = formatLocation(s);
    locationMap.set(loc, (locationMap.get(loc) || 0) + 1);
  });

  const allLocations: SessionLocation[] = Array.from(locationMap.entries())
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count);

  const visibleLocations = expanded ? allLocations : allLocations.slice(0, 4);
  const maxCount = allLocations.length > 0 ? allLocations[0].count : 1;

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Sessões por local</span>
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setMode("live")}
              className={`px-2.5 py-1 text-[10px] font-medium transition-colors flex items-center gap-1 ${
                mode === "live"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Radio className="w-3 h-3" /> Ao vivo
            </button>
            <button
              onClick={() => setMode("today")}
              className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                mode === "today"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Hoje
            </button>
          </div>
        </div>

        {visibleLocations.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {mode === "live" ? "Nenhuma sessão ativa" : "Nenhuma sessão registrada hoje"}
          </p>
        ) : (
          <div className="space-y-3">
            {visibleLocations.map((loc) => (
              <div key={loc.location}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-foreground">{loc.location}</span>
                  <span className="text-xs font-semibold text-foreground">{loc.count}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${(loc.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {allLocations.length > 4 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-xs text-muted-foreground gap-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>Mostrar menos <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>Ver tudo ({allLocations.length}) <ChevronDown className="w-3 h-3" /></>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
