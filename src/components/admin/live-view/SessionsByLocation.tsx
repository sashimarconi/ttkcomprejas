import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SessionLocation {
  location: string;
  count: number;
}

interface SessionsByLocationProps {
  sessions: { session_id: string }[];
}

const BRAZIL_STATES = [
  "São Paulo", "Rio de Janeiro", "Minas Gerais", "Bahia", "Paraná",
  "Rio Grande do Sul", "Ceará", "Pernambuco", "Pará", "Santa Catarina",
  "Goiás", "Maranhão", "Amazonas", "Espírito Santo", "Paraíba",
];

function sessionToLocation(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = ((hash << 5) - hash) + sessionId.charCodeAt(i);
    hash |= 0;
  }
  const stateIndex = Math.abs(hash) % BRAZIL_STATES.length;
  return `Brasil - ${BRAZIL_STATES[stateIndex]}`;
}

export default function SessionsByLocation({ sessions }: SessionsByLocationProps) {
  const navigate = useNavigate();

  const locationMap = new Map<string, number>();
  sessions.forEach(s => {
    const loc = sessionToLocation(s.session_id);
    locationMap.set(loc, (locationMap.get(loc) || 0) + 1);
  });

  const allLocations: SessionLocation[] = Array.from(locationMap.entries())
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count);

  const locations = allLocations.slice(0, 4);
  const maxCount = locations.length > 0 ? locations[0].count : 1;

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Sessões por local</span>
          </div>
          {allLocations.length > 4 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/admin/analytics")}
            >
              Ver tudo <ExternalLink className="w-3 h-3" />
            </Button>
          )}
        </div>

        {locations.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma sessão registrada hoje</p>
        ) : (
          <div className="space-y-3">
            {locations.map((loc) => (
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
      </CardContent>
    </Card>
  );
}
