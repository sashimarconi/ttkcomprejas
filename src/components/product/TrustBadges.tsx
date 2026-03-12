import { RotateCcw, ShieldCheck, Clock, Package } from "lucide-react";

const services = [
  { icon: RotateCcw, label: "Devolução gratuita", color: "text-marketplace-blue" },
  { icon: ShieldCheck, label: "Pagamento seguro", color: "text-marketplace-green" },
  { icon: Clock, label: "Cupom por atraso", color: "text-marketplace-orange" },
  { icon: Package, label: "Cupom por perda/dano", color: "text-marketplace-red" },
];

const TrustBadges = () => {
  return (
    <div className="bg-card px-4 py-3 mt-2">
      <p className="text-xs font-semibold text-foreground mb-3">Nossos Serviços</p>
      <div className="grid grid-cols-4 gap-2">
        {services.map((s) => (
          <div key={s.label} className="flex flex-col items-center text-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-marketplace-gray-light flex items-center justify-center">
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <span className="text-[10px] text-muted-foreground leading-tight">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustBadges;
