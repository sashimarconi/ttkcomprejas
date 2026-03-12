import { Zap } from "lucide-react";
import { formatCurrency } from "@/data/mockData";

interface PricingBlockProps {
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  flashSale: boolean;
  flashSaleEndsIn: string;
}

const PricingBlock = ({ originalPrice, salePrice, discountPercent, flashSale, flashSaleEndsIn }: PricingBlockProps) => {
  return (
    <div className="bg-gradient-to-r from-marketplace-orange to-[hsl(15,90%,50%)] px-4 py-3 text-primary-foreground">
      <div className="flex items-center gap-3">
        <span className="bg-marketplace-red text-primary-foreground text-xs font-bold px-2 py-0.5 rounded">
          -{discountPercent}%
        </span>
        <span className="text-primary-foreground/70 line-through text-sm">
          {formatCurrency(originalPrice)}
        </span>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-sm font-medium">R$</span>
        <span className="text-3xl font-extrabold">{salePrice.toFixed(2).replace('.', ',')}</span>
      </div>
      {flashSale && (
        <div className="mt-2 flex items-center gap-2">
          <span className="flex items-center gap-1 bg-marketplace-red/90 text-primary-foreground text-xs font-bold px-2 py-1 rounded">
            <Zap className="w-3 h-3 fill-current" />
            Oferta Relâmpago
          </span>
          <span className="text-xs text-primary-foreground/90">
            Termina em {flashSaleEndsIn}
          </span>
        </div>
      )}
    </div>
  );
};

export default PricingBlock;
