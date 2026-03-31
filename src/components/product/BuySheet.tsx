import { useState } from "react";
import { X, Zap, Minus, Plus, Mail } from "lucide-react";
import { formatCurrency } from "@/data/mockData";

interface Variant {
  id: string;
  name: string;
  color: string;
  thumbnail: string;
}

interface BuySheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedVariant: string | null, quantity: number) => void;
  title: string;
  image: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  flashSale: boolean;
  flashSaleEndsIn: string;
  variants: Variant[];
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
}: BuySheetProps) => {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(variants[0]?.id || null);
  const [quantity, setQuantity] = useState(1);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[61] bg-card rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Header with product info */}
          <div className="flex items-start gap-3">
            <img src={image} alt={title} className="w-20 h-20 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="bg-marketplace-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  -{discountPercent}%
                </span>
                <span className="text-xs text-muted-foreground">From</span>
                <span className="text-lg font-bold text-foreground">
                  R$ {salePrice.toFixed(2).replace(".", ",")}
                </span>
                <Mail className="w-4 h-4 text-muted-foreground" />
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
                Ends in {flashSaleEndsIn}
              </span>
            </div>
          )}

          {/* Variants */}
          {variants.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Cor ({variants.length})
              </p>
              <div className="flex gap-3 flex-wrap">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v.id)}
                    className={`flex flex-col items-center gap-1 transition-all`}
                  >
                    <div
                      className={`w-16 h-16 rounded-lg border-2 overflow-hidden flex items-center justify-center ${
                        selectedVariant === v.id
                          ? "border-marketplace-red"
                          : "border-border"
                      }`}
                    >
                      {v.thumbnail ? (
                        <img src={v.thumbnail} alt={v.name} className="w-full h-full object-cover" />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{ backgroundColor: v.color || "#eee" }}
                        />
                      )}
                    </div>
                    <span className="text-[11px] text-foreground">{v.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
            onClick={() => onConfirm(selectedVariant, quantity)}
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
