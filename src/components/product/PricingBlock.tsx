import { Zap } from "lucide-react";
import { formatCurrency } from "@/data/mockData";
import { useState, useEffect } from "react";

interface PricingBlockProps {
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  flashSale: boolean;
  flashSaleEndsIn: string;
}

const parseTimeToSeconds = (timeStr: string): number => {
  // Support "HH:MM:SS" or "X dia(s)" formats
  const hmsMatch = timeStr.match(/(\d+):(\d+):(\d+)/);
  if (hmsMatch) {
    return parseInt(hmsMatch[1]) * 3600 + parseInt(hmsMatch[2]) * 60 + parseInt(hmsMatch[3]);
  }
  const dayMatch = timeStr.match(/(\d+)\s*dia/);
  if (dayMatch) {
    return parseInt(dayMatch[1]) * 86400;
  }
  return 3600; // fallback 1h
};

const formatTime = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const PricingBlock = ({ originalPrice, salePrice, discountPercent, flashSale, flashSaleEndsIn }: PricingBlockProps) => {
  const [secondsLeft, setSecondsLeft] = useState(() => parseTimeToSeconds(flashSaleEndsIn));

  useEffect(() => {
    if (!flashSale) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [flashSale]);

  return (
    <div className="bg-card">
      {/* Price section */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="bg-marketplace-red text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded">
            -{discountPercent}%
          </span>
          <span className="text-lg font-bold text-marketplace-red">
            {formatCurrency(salePrice)}
          </span>
        </div>
        <div className="mt-0.5">
          <span className="text-xs text-muted-foreground line-through">
            {formatCurrency(originalPrice)}
          </span>
        </div>
      </div>

      {/* Flash sale timer */}
      {flashSale && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 bg-marketplace-red text-primary-foreground text-xs font-bold px-2 py-1 rounded">
              <Zap className="w-3 h-3 fill-current" />
              Oferta Relâmpago
            </span>
            <span className="text-xs text-muted-foreground">
              Termina em <span className="font-bold text-foreground">{formatTime(secondsLeft)}</span>
            </span>
          </div>
        </div>
      )}

      {/* Discount progress bar */}
      <div className="px-4 pb-3">
        <div className="relative w-full h-5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-marketplace-red to-marketplace-orange rounded-full transition-all duration-500 flex items-center justify-end pr-2"
            style={{ width: `${Math.min(discountPercent, 100)}%` }}
          >
            <span className="text-[10px] font-bold text-primary-foreground">{discountPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingBlock;
