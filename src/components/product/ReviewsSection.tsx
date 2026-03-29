import { Star, ChevronRight } from "lucide-react";
import type { Review } from "@/data/mockData";

interface ReviewsSectionProps {
  reviews: Review[];
  totalReviews: number;
}

const formatCount = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")} mil`;
  return n.toLocaleString("pt-BR");
};

const ReviewsSection = ({ reviews, totalReviews }: ReviewsSectionProps) => {
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "5.0";

  return (
    <div className="bg-card px-4 py-3 mt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-foreground">
          Avaliações dos clientes ({formatCount(totalReviews)})
        </p>
        <button className="flex items-center gap-0.5 text-xs text-marketplace-blue font-medium">
          Ver mais
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Overall rating */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl font-bold text-foreground">{avgRating}</span>
        <span className="text-sm text-muted-foreground">/ 5</span>
        <div className="flex gap-0.5 ml-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < Math.round(Number(avgRating))
                  ? "fill-marketplace-yellow text-marketplace-yellow"
                  : "text-border"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
            <div className="flex items-center gap-2.5">
              <img
                src={review.userAvatar}
                alt={review.userName}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div>
                <p className="text-xs font-semibold text-foreground">{review.userName}</p>
                <p className="text-[10px] text-marketplace-green font-medium">Compra confirmada</p>
              </div>
            </div>

            <div className="flex gap-0.5 mt-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < review.rating
                      ? "fill-marketplace-yellow text-marketplace-yellow"
                      : "text-border"
                  }`}
                />
              ))}
            </div>

            <p className="text-xs text-foreground mt-1.5 leading-relaxed">{review.comment}</p>

            {review.photos.length > 0 && (
              <div className="flex gap-2 mt-2">
                {review.photos.map((photo, i) => (
                  <img
                    key={i}
                    src={photo}
                    alt="Review photo"
                    className="w-16 h-16 rounded-md object-cover"
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewsSection;
