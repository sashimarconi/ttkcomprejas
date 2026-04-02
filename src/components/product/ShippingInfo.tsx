import { Truck } from "lucide-react";

interface ShippingInfoProps {
  freeShipping: boolean;
  shippingCost: number;
  estimatedDelivery: string;
  shippingLabel?: string;
}

const ShippingInfo = ({ freeShipping, shippingCost, estimatedDelivery, shippingLabel = "Frete grátis" }: ShippingInfoProps) => {
  return (
    <div className="bg-card px-4 py-3 mt-2">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-marketplace-green-light flex items-center justify-center flex-shrink-0 mt-0.5">
          <Truck className="w-4 h-4 text-marketplace-green" />
        </div>
        <div className="flex-1">
          {freeShipping && (
            <p className="text-sm font-bold text-marketplace-green">{shippingLabel}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {estimatedDelivery || "Chegará entre 7 e 15 dias úteis"}
          </p>
          {shippingCost > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Taxa de envio: <span className="font-medium text-foreground">R$ {shippingCost.toFixed(2).replace('.', ',')}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShippingInfo;
