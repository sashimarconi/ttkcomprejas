import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Radio, ChevronDown, ChevronUp } from "lucide-react";

interface PageVisit {
  page: string;
  count: number;
}

interface PagesVisitedProps {
  /** All page events from today */
  todayEvents: { event_type: string; page_url: string | null; created_at: string }[];
  /** Live sessions (last 5 min) */
  liveSessions: { page_url: string | null }[];
}

function extractPageName(url: string | null): string {
  if (!url) return "Página inicial";
  try {
    const path = new URL(url).pathname;
    if (path === "/" || path === "") return "Página inicial";
    if (path.startsWith("/product/")) return path.replace("/product/", "Produto: ");
    if (path.startsWith("/loja/")) return path.replace("/loja/", "Loja: ");
    if (path.startsWith("/checkout/")) return path.replace("/checkout/", "Checkout: ");
    return path;
  } catch {
    if (url === "/" || url === "") return "Página inicial";
    if (url.startsWith("/product/")) return url.replace("/product/", "Produto: ");
    if (url.startsWith("/loja/")) return url.replace("/loja/", "Loja: ");
    if (url.startsWith("/checkout/")) return url.replace("/checkout/", "Checkout: ");
    return url;
  }
}

export default function PagesVisited({ todayEvents, liveSessions }: PagesVisitedProps) {
  const [mode, setMode] = useState<"live" | "today">("today");
  const [expanded, setExpanded] = useState(false);

  // Build page visit counts
  const pageMap = new Map<string, number>();

  if (mode === "live") {
    liveSessions.forEach(s => {
      const name = extractPageName(s.page_url);
      pageMap.set(name, (pageMap.get(name) || 0) + 1);
    });
  } else {
    todayEvents
      .filter(e => e.event_type === "page_view")
      .forEach(e => {
        const name = extractPageName(e.page_url);
        pageMap.set(name, (pageMap.get(name) || 0) + 1);
      });
  }

  const allPages: PageVisit[] = Array.from(pageMap.entries())
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count);

  const visiblePages = expanded ? allPages : allPages.slice(0, 4);
  const maxCount = allPages.length > 0 ? allPages[0].count : 1;

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Páginas visitadas</span>
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

        {visiblePages.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {mode === "live" ? "Nenhuma sessão ativa" : "Nenhum acesso hoje"}
          </p>
        ) : (
          <div className="space-y-3">
            {visiblePages.map((p) => (
              <div key={p.page}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-foreground truncate max-w-[200px]">{p.page}</span>
                  <span className="text-xs font-semibold text-foreground">{p.count}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-marketplace-green transition-all duration-500"
                    style={{ width: `${(p.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {allPages.length > 4 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-xs text-muted-foreground gap-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>Mostrar menos <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>Ver tudo ({allPages.length}) <ChevronDown className="w-3 h-3" /></>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
