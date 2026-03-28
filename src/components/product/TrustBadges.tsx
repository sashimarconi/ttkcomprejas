import { RotateCcw, ShieldCheck, Clock, Package, Undo2, PackageCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchTrustBadges } from "@/lib/supabase-queries";

const iconMap: Record<string, any> = {
  "undo-2": Undo2,
  "shield-check": ShieldCheck,
  "clock": Clock,
  "package-check": PackageCheck,
  "rotate-ccw": RotateCcw,
  "package": Package,
  "shield": ShieldCheck,
};

const colorMap: Record<string, string> = {
  green: "text-marketplace-green",
  blue: "text-marketplace-blue",
  orange: "text-marketplace-orange",
  red: "text-marketplace-red",
};

const TrustBadges = () => {
  const { data: badges } = useQuery({
    queryKey: ["trust-badges"],
    queryFn: fetchTrustBadges,
  });

  if (!badges || badges.length === 0) return null;

  return (
    <div className="bg-card px-4 py-3 mt-2">
      <p className="text-xs font-semibold text-foreground mb-3">Nossos Serviços</p>
      <div className="grid grid-cols-4 gap-2">
        {badges.map((badge) => {
          const Icon = iconMap[badge.icon] || ShieldCheck;
          const colorClass = colorMap[badge.color || "blue"] || "text-marketplace-blue";
          return (
            <div key={badge.id} className="flex flex-col items-center text-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-marketplace-gray-light flex items-center justify-center">
                <Icon className={`w-5 h-5 ${colorClass}`} />
              </div>
              <span className="text-[10px] text-muted-foreground leading-tight">{badge.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrustBadges;
