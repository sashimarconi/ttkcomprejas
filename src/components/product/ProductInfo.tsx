import { Star } from "lucide-react";
import type { ProductVariant } from "@/data/mockData";
import { useState } from "react";

interface ProductInfoProps {
  title: string;
  promoTag: string;
  rating: number;
  reviewCount: number;
  soldCount: number;
  variants: ProductVariant[];
}

const ProductInfo = ({ title, promoTag, rating, reviewCount, soldCount, variants }: ProductInfoProps) => {
  const [selectedVariant, setSelectedVariant] = useState(variants[0]?.id || "");

  return (
    <div className="bg-card px-4 py-3">
      {promoTag && (
        <span className="inline-block bg-marketplace-orange text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded mb-2">
          {promoTag}
        </span>
      )}
      <h1 className="text-sm font-semibold text-foreground leading-snug">{title}</h1>

      {/* Rating */}
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-0.5">
          <Star className="w-3.5 h-3.5 fill-marketplace-yellow text-marketplace-yellow" />
          <span className="font-semibold text-foreground">{rating}</span>
        </div>
        <span>({reviewCount.toLocaleString('pt-BR')})</span>
        <span>•</span>
        <span>{soldCount.toLocaleString('pt-BR')} vendidos</span>
      </div>

      {/* Variants */}
      {variants.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-2">Cor:</p>
          <div className="flex gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVariant(v.id)}
                className={`w-12 h-12 rounded-lg border-2 overflow-hidden transition-all ${
                  selectedVariant === v.id
                    ? "border-marketplace-red shadow-md"
                    : "border-border"
                }`}
              >
                <img src={v.thumbnail} alt={v.name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductInfo;
