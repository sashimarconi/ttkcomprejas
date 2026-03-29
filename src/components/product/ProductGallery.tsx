import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductImage } from "@/data/mockData";

interface ProductGalleryProps {
  images: ProductImage[];
}

const ProductGallery = ({ images }: ProductGalleryProps) => {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));

  return (
    <div className="relative w-full bg-card">
      <div className="relative aspect-square overflow-hidden">
        <img
          src={images[current]?.url}
          alt={images[current]?.alt}
          className="w-full h-full object-cover"
        />

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-card/70 backdrop-blur-sm rounded-full p-1.5 shadow-md"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/70 backdrop-blur-sm rounded-full p-1.5 shadow-md"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </>
        )}

        {/* Counter badge */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-foreground/60 text-primary-foreground text-xs px-3 py-1 rounded-full font-medium backdrop-blur-sm">
            {current + 1}/{images.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductGallery;
