import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX } from "lucide-react";
import type { ProductImage } from "@/data/mockData";

interface ProductGalleryProps {
  images: ProductImage[];
  videoUrl?: string;
}

type GalleryItem = {
  type: "image" | "video";
  url: string;
  alt?: string;
};

const ProductGallery = ({ images, videoUrl }: ProductGalleryProps) => {
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Build gallery items: video first (if exists), then images
  const items: GalleryItem[] = [];
  if (videoUrl) {
    items.push({ type: "video", url: videoUrl });
  }
  images.forEach((img) => {
    items.push({ type: "image", url: img.url, alt: img.alt });
  });

  const prev = () => {
    setCurrent((c) => (c === 0 ? items.length - 1 : c - 1));
    setIsPlaying(false);
  };
  const next = () => {
    setCurrent((c) => (c === items.length - 1 ? 0 : c + 1));
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const currentItem = items[current];

  return (
    <div className="relative w-full bg-card">
      <div className="relative aspect-square overflow-hidden">
        {currentItem?.type === "video" ? (
          <>
            <video
              ref={videoRef}
              src={currentItem.url}
              className="w-full h-full object-cover"
              loop
              muted={isMuted}
              playsInline
              onClick={togglePlay}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            {/* Play/Pause overlay */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-foreground/10"
              >
                <div className="w-16 h-16 rounded-full bg-foreground/60 flex items-center justify-center backdrop-blur-sm">
                  <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
                </div>
              </button>
            )}
            {/* Mute button */}
            <button
              onClick={toggleMute}
              className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-foreground/60 flex items-center justify-center backdrop-blur-sm"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-primary-foreground" />
              ) : (
                <Volume2 className="w-4 h-4 text-primary-foreground" />
              )}
            </button>
          </>
        ) : (
          <img
            src={currentItem?.url}
            alt={currentItem?.alt || ""}
            className="w-full h-full object-cover"
          />
        )}

        {/* Arrows */}
        {items.length > 1 && (
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
        {items.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-foreground/60 text-primary-foreground text-xs px-3 py-1 rounded-full font-medium backdrop-blur-sm">
            {current + 1}/{items.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductGallery;
