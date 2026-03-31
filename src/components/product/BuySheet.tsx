import { useState } from "react";
import { X, Zap, Minus, Plus } from "lucide-react";
import { formatCurrency } from "@/data/mockData";

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

interface BuySheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedVariants: Record<string, string>, quantity: number) => void;
  title: string;
  image: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  flashSale: boolean;
  flashSaleEndsIn: string;
  variants: Variant[];
  variantGroups: VariantGroup[];
}

const BuySheet = ({
  open,
  onClose,
  onConfirm,
  title,
  image,
  originalPrice,
  salePrice,
  discountPercent,
  flashSale,
  flashSaleEndsIn,
  variants,
  variantGroups,
}: BuySheetProps) => {
  // Initialize selections: one per group (or ungrouped)
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (variantGroups.length > 0) {
      variantGroups.forEach((g) => {
        const groupVariants = variants.filter((v) => v.groupId === g.id);
        if (groupVariants.length > 0) init[g.id] = groupVariants[0].id;
      });
    }
    // Ungrouped variants
    const ungrouped = variants.filter((v) => !v.groupId);
    if (ungrouped.length > 0) {
      init["_ungrouped"] = ungrouped[0].id;
    }
    return init;
  });
  const [quantity, setQuantity] = useState(1);

  if (!open) return null;

  const ungroupedVariants = variants.filter((v) => !v.groupId);

  const renderVariantGroup = (groupId: string, groupName: string, groupVariants: Variant[]) => {
    if (groupVariants.length === 0) return null;
    const hasVisuals = groupVariants.some((v) => v.thumbnail || v.color);

    return (
      <div key={groupId} className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          {groupName} ({groupVariants.length})
        </p>
        <div className="flex gap-2 flex-wrap">
          {groupVariants.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelections((prev) => ({ ...prev, [groupId]: v.id }))}
              className={`transition-all ${hasVisuals ? "flex flex-col items-center gap-1" : ""}`}
            >
              {hasVisuals ? (
                <>
                  <div
                    className={`w-14 h-14 rounded-lg border-2 overflow-hidden flex items-center justify-center ${
                      selections[groupId] === v.id ? "border-marketplace-red" : "border-border"
                    }`}
                  >
                    {v.thumbnail ? (
                      <img src={v.thumbnail} alt={v.name} className="w-full h-full object-cover" />
                    ) : v.color ? (
                      <div className="w-full h-full" style={{ backgroundColor: v.color }} />
                    ) : (
                      <span className="text-xs text-muted-foreground">{v.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-[11px] text-foreground">{v.name}</span>
                </>
              ) : (
                <div
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium ${
                    selections[groupId] === v.id
                      ? "border-marketplace-red bg-marketplace-red/5 text-marketplace-red"
                      : "border-border text-foreground"
                  }`}
                >
                  {v.name}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[61] bg-card rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <img src={image} alt={title} className="w-20 h-20 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="bg-marketplace-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  -{discountPercent}%
                </span>
                <span className="text-lg font-bold text-foreground">
                  {formatCurrency(salePrice)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-through">
                {formatCurrency(originalPrice)}
              </p>
            </div>
            <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Flash Sale */}
          {flashSale && (
            <div className="flex items-center justify-between bg-marketplace-red/10 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-marketplace-red" />
                <span className="text-sm font-bold text-marketplace-red">Flash Sale</span>
              </div>
              <span className="text-sm font-semibold text-marketplace-red">
                Termina em {flashSaleEndsIn}
              </span>
            </div>
          )}

          {/* Variant groups */}
          {variantGroups.map((g) =>
            renderVariantGroup(g.id, g.name, variants.filter((v) => v.groupId === g.id))
          )}

          {/* Ungrouped variants (legacy) */}
          {ungroupedVariants.length > 0 &&
            renderVariantGroup("_ungrouped", "Opções", ungroupedVariants)}

          {/* Quantity */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Quantidade</p>
            <div className="flex items-center gap-3 border border-border rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-foreground w-6 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Buy button */}
          <button
            onClick={() => onConfirm(selections, quantity)}
            className="w-full h-12 rounded-lg bg-marketplace-red text-white font-bold text-base"
          >
            Comprar agora
          </button>
        </div>
      </div>
    </>
  );
};

export default BuySheet;
