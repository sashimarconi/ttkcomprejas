import { Check, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchTrustBadges } from "@/lib/supabase-queries";

const TrustBadges = () => {
  const { data: badges } = useQuery({
    queryKey: ["trust-badges"],
    queryFn: fetchTrustBadges,
  });

  // Default badges if none in DB
  const defaultBadges = [
    "Devolução gratuita",
    "Reembolso automático por danos",
    "Pagamento seguro",
    "Cupom por atraso na coleta",
  ];

  const items = badges && badges.length > 0
    ? badges.map((b: any) => b.title)
    : defaultBadges;

  return (
    <div className="bg-card px-4 py-3 mt-2">
      <div className="flex items-center gap-2 mb-2.5">
        <ShieldCheck className="w-4 h-4 text-marketplace-green" />
        <p className="text-xs font-semibold text-foreground">Proteção do cliente</p>
      </div>
      <div className="grid grid-cols-2 gap-y-1.5 gap-x-2">
        {items.map((item: string, i: number) => (
          <div key={i} className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-marketplace-green flex-shrink-0" />
            <span className="text-[11px] text-muted-foreground">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustBadges;
