import { Star } from "lucide-react";
import type { Review } from "@/data/mockData";

interface ReviewsSectionProps {
  reviews: Review[];
  totalReviews: number;
}

const ReviewsSection = ({ reviews, totalReviews }: ReviewsSectionProps) => {
  return (
    <div className="bg-card px-4 py-3 mt-2">
      <p className="text-sm font-semibold text-foreground mb-3">
        Avaliações dos clientes ({totalReviews.toLocaleString('pt-BR')})
      </p>

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
                <p className="text-[10px] text-muted-foreground">{review.city}</p>
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
