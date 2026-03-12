import { Star, ChevronRight } from "lucide-react";
import type { StoreInfo } from "@/data/mockData";

interface StoreCardProps {
  store: StoreInfo;
}

const StoreCard = ({ store }: StoreCardProps) => {
  return (
    <div className="bg-card px-4 py-3 mt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={store.avatar}
            alt={store.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-border"
          />
          <div>
            <p className="text-sm font-semibold text-foreground">{store.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-marketplace-yellow text-marketplace-yellow" />
                {store.rating}
              </span>
              <span>•</span>
              <span>{store.totalSales} vendidos</span>
            </div>
          </div>
        </div>
        <button className="flex items-center gap-1 bg-marketplace-red text-primary-foreground text-xs font-semibold px-4 py-2 rounded-full">
          Visitar
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default StoreCard;
