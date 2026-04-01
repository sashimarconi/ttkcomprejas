import { ShoppingCart, CreditCard, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ClientBehaviorProps {
  activeCarts: number;
  inCheckout: number;
  purchased: number;
}

export default function ClientBehavior({ activeCarts, inCheckout, purchased }: ClientBehaviorProps) {
  const items = [
    { label: "Carrinhos ativos", value: activeCarts, icon: ShoppingCart },
    { label: "No checkout", value: inCheckout, icon: CreditCard },
    { label: "Comprado", value: purchased, icon: CheckCircle },
  ];

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <span className="text-sm font-medium text-foreground">Comportamento do cliente</span>
        <div className="grid grid-cols-3 gap-4 mt-3">
          {items.map((item) => (
            <div key={item.label} className="text-center">
              <item.icon className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-xl font-bold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
