import { Truck } from "lucide-react";

interface ShippingInfoProps {
  freeShipping: boolean;
  shippingCost: number;
  estimatedDelivery: string;
}

const ShippingInfo = ({ freeShipping, shippingCost, estimatedDelivery }: ShippingInfoProps) => {
  return (
    <div className="bg-card px-4 py-3 mt-2">
      <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
        freeShipping ? "bg-marketplace-green-light" : "bg-marketplace-gray-light"
      }`}>
        <Truck className={`w-5 h-5 ${freeShipping ? "text-marketplace-green" : "text-muted-foreground"}`} />
        <div>
          <p className={`text-sm font-semibold ${freeShipping ? "text-marketplace-green" : "text-foreground"}`}>
            {freeShipping ? "Frete grátis" : `Taxa de envio: R$ ${shippingCost.toFixed(2).replace('.', ',')}`}
          </p>
          <p className="text-xs text-muted-foreground">
            Entrega estimada: {estimatedDelivery}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShippingInfo;
