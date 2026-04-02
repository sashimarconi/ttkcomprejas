import { Star } from "lucide-react";
import { useState } from "react";

interface Variant {
  id: string;
  name: string;
  color: string;
  thumbnail: string;
  groupId: string | null;
}

interface VariantGroup {
  id: string;
  name: string;
}

interface ProductInfoProps {
  title: string;
  promoTag: string;
  rating: number;
  reviewCount: number;
  soldCount: number;
  variants: Variant[];
  variantGroups?: VariantGroup[];
  showSoldCount?: boolean;
  showUnitsAvailable?: boolean;
  unitsAvailableText?: string;
}

const formatCount = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")} mil`;
  return n.toLocaleString("pt-BR");
};

const ProductInfo = ({ title, promoTag, rating, reviewCount, soldCount, variants, variantGroups = [], showSoldCount = true, showUnitsAvailable = true, unitsAvailableText = "13 unidades disponíveis" }: ProductInfoProps) => {
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    variantGroups.forEach((g) => {
      const gv = variants.filter((v) => v.groupId === g.id);
      if (gv.length > 0) init[g.id] = gv[0].id;
    });
    const ungrouped = variants.filter((v) => !v.groupId);
    if (ungrouped.length > 0) init["_ungrouped"] = ungrouped[0].id;
    return init;
  });

  const ungroupedVariants = variants.filter((v) => !v.groupId);

  const renderGroup = (groupId: string, groupName: string, groupVariants: Variant[]) => {
    if (groupVariants.length === 0) return null;
    const hasVisuals = groupVariants.some((v) => v.thumbnail || v.color);

    return (
      <div key={groupId} className="mt-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">{groupName}</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {groupVariants.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setSelections((prev) => ({ ...prev, [groupId]: v.id }))}
              className={`transition-all ${hasVisuals ? "flex flex-col items-center min-w-[72px] rounded-lg border-2 p-1.5" : "px-3 py-1.5 rounded-lg border-2 text-xs font-medium"} ${
                selections[groupId] === v.id
                  ? "border-marketplace-red shadow-md"
                  : "border-border"
              }`}
            >
              {hasVisuals ? (
                <>
                  {i === 0 && groupId !== "_ungrouped" && (
                    <span className="text-[8px] font-bold text-marketplace-red bg-marketplace-red-light px-1.5 py-0.5 rounded-sm mb-1">
                      MAIS VENDIDA
                    </span>
                  )}
                  {v.thumbnail ? (
                    <img src={v.thumbnail} alt={v.name} className="w-12 h-12 object-cover rounded" />
                  ) : v.color ? (
                    <div className="w-12 h-12 rounded" style={{ backgroundColor: v.color }} />
                  ) : null}
                  <span className="text-[10px] text-foreground mt-1 font-medium">{v.name}</span>
                </>
              ) : (
                <span className={selections[groupId] === v.id ? "text-marketplace-red" : "text-foreground"}>
                  {v.name}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card px-4 py-3">
      <h1 className="text-base font-bold text-foreground leading-snug">{title}</h1>

      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-0.5">
          <Star className="w-3.5 h-3.5 fill-marketplace-yellow text-marketplace-yellow" />
          <span className="font-semibold text-foreground">{rating}</span>
        </div>
        <span>{formatCount(reviewCount)} avaliações</span>
        <span>•</span>
        {showSoldCount && <><span>•</span><span>{formatCount(soldCount)} vendidos</span></>}
      </div>

      {showUnitsAvailable && (
        <p className="text-xs text-marketplace-orange font-medium mt-1.5">
          {unitsAvailableText}
        </p>
      )}

      {/* Variant groups */}
      {variantGroups.map((g) =>
        renderGroup(g.id, g.name, variants.filter((v) => v.groupId === g.id))
      )}

      {/* Ungrouped variants */}
      {ungroupedVariants.length > 0 && renderGroup("_ungrouped", "Opções", ungroupedVariants)}

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
