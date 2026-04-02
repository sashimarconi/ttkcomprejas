import { Zap } from "lucide-react";
import { formatCurrency } from "@/data/mockData";
import { useState, useEffect } from "react";

interface PricingBlockProps {
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  flashSale: boolean;
  flashSaleEndsIn: string;
  showDiscountBadge?: boolean;
  showFlashSale?: boolean;
}

const parseTimeToSeconds = (timeStr: string): number => {
  const hmsMatch = timeStr.match(/(\d+):(\d+):(\d+)/);
  if (hmsMatch) {
    return parseInt(hmsMatch[1]) * 3600 + parseInt(hmsMatch[2]) * 60 + parseInt(hmsMatch[3]);
  }
  const dayMatch = timeStr.match(/(\d+)\s*dia/);
  if (dayMatch) {
    return parseInt(dayMatch[1]) * 86400;
  }
  return 3600;
};

const formatTime = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const PricingBlock = ({ originalPrice, salePrice, discountPercent, flashSale, flashSaleEndsIn, showDiscountBadge = true, showFlashSale = true }: PricingBlockProps) => {
  const [secondsLeft, setSecondsLeft] = useState(() => parseTimeToSeconds(flashSaleEndsIn));

  useEffect(() => {
    if (!flashSale) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [flashSale]);

  return (
    <div className="bg-gradient-to-r from-marketplace-orange to-[hsl(15,90%,50%)] px-4 py-3">
      {/* Row: discount badge + price + flash sale */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showDiscountBadge && (
            <span className="bg-marketplace-red text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
              -{discountPercent}%
            </span>
          )}
          <span className="text-2xl font-extrabold text-primary-foreground">
            R$ {salePrice.toFixed(2).replace('.', ',')}
          </span>
        </div>
        {flashSale && showFlashSale && (
          <div className="flex flex-col items-end">
            <span className="flex items-center gap-1 text-primary-foreground text-[11px] font-bold">
              <Zap className="w-3 h-3 fill-current" />
              Oferta Relâmpago
            </span>
            <span className="text-[11px] text-primary-foreground/90">
              Termina em <span className="font-bold">{formatTime(secondsLeft)}</span>
            </span>
          </div>
        )}
      </div>
      {/* Original price */}
      <p className="text-xs text-primary-foreground/70 line-through mt-0.5">
        {formatCurrency(originalPrice)}
      </p>
    </div>
  );
};

export default PricingBlock;
