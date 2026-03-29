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

const formatCount = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")} mil`;
  return n.toLocaleString("pt-BR");
};

const ProductInfo = ({ title, promoTag, rating, reviewCount, soldCount, variants }: ProductInfoProps) => {
  const [selectedVariant, setSelectedVariant] = useState(variants[0]?.id || "");

  return (
    <div className="bg-card px-4 py-3">
      {/* Title */}
      <h1 className="text-base font-bold text-foreground leading-snug">{title}</h1>

      {/* Rating & sold */}
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-0.5">
          <Star className="w-3.5 h-3.5 fill-marketplace-yellow text-marketplace-yellow" />
          <span className="font-semibold text-foreground">{rating}</span>
        </div>
        <span>{formatCount(reviewCount)} avaliações</span>
        <span>•</span>
        <span>{formatCount(soldCount)} vendidos</span>
      </div>

      {/* Available units */}
      <p className="text-xs text-marketplace-orange font-medium mt-1.5">
        13 unidades disponíveis
      </p>

      {/* Variants */}
      {variants.length > 0 && (
        <div className="mt-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {variants.map((v, i) => (
              <button
                key={v.id}
                onClick={() => setSelectedVariant(v.id)}
                className={`flex flex-col items-center min-w-[72px] rounded-lg border-2 p-1.5 transition-all ${
                  selectedVariant === v.id
                    ? "border-marketplace-red shadow-md"
                    : "border-border"
                }`}
              >
                {/* Tag */}
                {i === 0 && (
                  <span className="text-[8px] font-bold text-marketplace-red bg-marketplace-red-light px-1.5 py-0.5 rounded-sm mb-1">
                    MAIS VENDIDA
                  </span>
                )}
                {i === 1 && (
                  <span className="text-[8px] font-bold text-marketplace-blue bg-marketplace-blue-light px-1.5 py-0.5 rounded-sm mb-1">
                    POPULAR
                  </span>
                )}
                <img src={v.thumbnail} alt={v.name} className="w-12 h-12 object-cover rounded" />
                <span className="text-[10px] text-foreground mt-1 font-medium">{v.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Promo tag */}
      {promoTag && (
        <div className="mt-3">
          <span className="inline-block bg-marketplace-orange text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded">
            {promoTag}
          </span>
        </div>
      )}
    </div>
  );
};

export default ProductInfo;
