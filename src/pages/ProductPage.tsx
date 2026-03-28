import { useRef, useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchProductBySlug, fetchProducts, fetchStoreSettings } from "@/lib/supabase-queries";
import ProductHeader from "@/components/product/ProductHeader";
import ProductGallery from "@/components/product/ProductGallery";
import PricingBlock from "@/components/product/PricingBlock";
import ProductInfo from "@/components/product/ProductInfo";
import ShippingInfo from "@/components/product/ShippingInfo";
import TrustBadges from "@/components/product/TrustBadges";
import ReviewsSection from "@/components/product/ReviewsSection";
import StoreCard from "@/components/product/StoreCard";
import RelatedProducts from "@/components/product/RelatedProducts";
import FixedFooter from "@/components/product/FixedFooter";

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [activeSection, setActiveSection] = useState("Visão geral");

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug!),
    enabled: !!slug,
  });

  const { data: allProducts } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const { data: store } = useQuery({
    queryKey: ["store-settings"],
    queryFn: fetchStoreSettings,
  });

  const overviewRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const recommendationsRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback((section: string) => {
    setActiveSection(section);
    const refs: Record<string, React.RefObject<HTMLDivElement>> = {
      "Visão geral": overviewRef,
      "Avaliações": reviewsRef,
      "Descrição": descriptionRef,
      "Recomendações": recommendationsRef,
    };
    refs[section]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleBuyNow = () => {
    if (product?.checkout_type === "external" && product.external_checkout_url) {
      window.open(product.external_checkout_url, "_blank");
    }
  };

  if (isLoading || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const otherProducts = allProducts?.filter((p) => p.id !== product.id) || [];

  // Map DB data to component props
  const images = (product.product_images || []).map((img) => ({
    id: img.id,
    url: img.url,
    alt: img.alt || "",
  }));

  const variants = (product.product_variants || []).map((v) => ({
    id: v.id,
    name: v.name,
    color: v.color || "",
    thumbnail: v.thumbnail_url || "",
  }));

  const reviews = (product.reviews || []).map((r) => ({
    id: r.id,
    userName: r.user_name,
    userAvatar: r.user_avatar_url || "",
    city: r.city || "",
    rating: r.rating,
    comment: r.comment || "",
    photos: r.photos || [],
    date: r.review_date || "",
  }));

  const relatedFormatted = otherProducts.map((p) => ({
    id: p.slug,
    title: p.title,
    description: p.description || "",
    originalPrice: Number(p.original_price),
    salePrice: Number(p.sale_price),
    discountPercent: p.discount_percent,
    images: (p.product_images || []).map((img) => ({ id: img.id, url: img.url, alt: img.alt || "" })),
    variants: [],
    rating: Number(p.rating) || 0,
    reviewCount: p.review_count || 0,
    soldCount: p.sold_count || 0,
    promoTag: p.promo_tag || "",
    flashSale: p.flash_sale || false,
    flashSaleEndsIn: p.flash_sale_ends_in || "",
    freeShipping: p.free_shipping || false,
    shippingCost: Number(p.shipping_cost) || 0,
    estimatedDelivery: p.estimated_delivery || "",
    checkoutType: p.checkout_type as "external" | "pix",
    externalCheckoutUrl: p.external_checkout_url || "",
    reviews: [],
  }));

  return (
    <div className="min-h-screen bg-background pb-16">
      <ProductHeader activeSection={activeSection} onSectionClick={scrollToSection} />

      <div className="pt-[88px]">
        <div ref={overviewRef}>
          <ProductGallery images={images} />
          <PricingBlock
            originalPrice={Number(product.original_price)}
            salePrice={Number(product.sale_price)}
            discountPercent={product.discount_percent}
            flashSale={product.flash_sale || false}
            flashSaleEndsIn={product.flash_sale_ends_in || ""}
          />
          <ProductInfo
            title={product.title}
            promoTag={product.promo_tag || ""}
            rating={Number(product.rating) || 0}
            reviewCount={product.review_count || 0}
            soldCount={product.sold_count || 0}
            variants={variants}
          />
          <ShippingInfo
            freeShipping={product.free_shipping || false}
            shippingCost={Number(product.shipping_cost) || 0}
            estimatedDelivery={product.estimated_delivery || ""}
          />
          <TrustBadges />
        </div>

        <div ref={reviewsRef}>
          <ReviewsSection reviews={reviews} totalReviews={product.review_count || 0} />
        </div>

        <div ref={descriptionRef} className="bg-card px-4 py-3 mt-2">
          <p className="text-sm font-semibold text-foreground mb-2">Descrição do produto</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{product.description}</p>
        </div>

        {store && (
          <StoreCard
            store={{
              name: store.name,
              avatar: store.avatar_url || "",
              totalSales: store.total_sales || "0",
              rating: Number(store.rating) || 0,
            }}
          />
        )}

        <div ref={recommendationsRef}>
          <RelatedProducts title="Mais desta loja" products={relatedFormatted} />
          <RelatedProducts title="Você também pode gostar" products={relatedFormatted.slice(0, 2)} />
        </div>
      </div>

      <FixedFooter
        freeShipping={product.free_shipping || false}
        onBuyNow={handleBuyNow}
        onAddToCart={() => {}}
      />
    </div>
  );
};

export default ProductPage;
