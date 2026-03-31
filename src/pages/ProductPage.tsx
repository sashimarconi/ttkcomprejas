import { useRef, useState } from "react";
import { usePageTracking, useVisitorHeartbeat } from "@/hooks/usePageTracking";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchProductBySlug, fetchStoreForProduct, fetchStoreProducts, fetchStoreSettings } from "@/lib/supabase-queries";
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
import BuySheet from "@/components/product/BuySheet";

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  usePageTracking("page_view");
  useVisitorHeartbeat();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug!),
    enabled: !!slug,
  });

  const { data: productStore } = useQuery({
    queryKey: ["product-store", product?.id],
    queryFn: () => fetchStoreForProduct(product!.id),
    enabled: !!product?.id,
  });

  const { data: storeProducts } = useQuery({
    queryKey: ["store-products", productStore?.id],
    queryFn: () => fetchStoreProducts(productStore!.id),
    enabled: !!productStore?.id,
  });

  const reviewsRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [buySheetOpen, setBuySheetOpen] = useState(false);

  const handleBuyNow = (selectedVariants: Record<string, string> | string | null, quantity: number) => {
    setBuySheetOpen(false);
    if (product?.checkout_type === "external" && product.external_checkout_url) {
      window.open(product.external_checkout_url, "_blank");
    } else {
      const params = new URLSearchParams();
      if (typeof selectedVariants === "string") {
        params.set("variant", selectedVariants);
      } else if (selectedVariants && typeof selectedVariants === "object") {
        const variantValues = Object.values(selectedVariants).join(",");
        if (variantValues) params.set("variant", variantValues);
      }
      if (quantity > 1) params.set("qty", String(quantity));
      navigate(`/checkout/${slug}?${params.toString()}`);
    }
  };

  if (isLoading || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const otherProducts = (storeProducts || []).filter((p) => p.id !== product.id);

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
    groupId: v.variant_group_id || null,
  }));

  const variantGroups = (product.variant_groups || []).map((g) => ({
    id: g.id,
    name: g.name,
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
      <ProductHeader />

      <div className="pt-12">
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
          variantGroups={variantGroups}
        />
        <ShippingInfo
          freeShipping={product.free_shipping || false}
          shippingCost={Number(product.shipping_cost) || 0}
          estimatedDelivery={product.estimated_delivery || ""}
        />
        <TrustBadges />

        <div ref={reviewsRef}>
          <ReviewsSection reviews={reviews} totalReviews={product.review_count || 0} />
        </div>

        <div ref={descriptionRef} className="bg-card px-4 py-4 mt-2">
          <p className="text-sm font-bold text-foreground mb-3">Descrição do produto</p>

          {/* Video do produto */}
          {product.video_url && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <video
                src={product.video_url}
                className="w-full rounded-lg"
                controls
                playsInline
                preload="metadata"
              />
            </div>
          )}

          {/* Descrição com formatação preservada */}
          {product.description && product.description.includes("<") ? (
            <div
              className="text-xs text-muted-foreground leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          )}
        </div>

        {productStore && (
          <StoreCard
            store={{
              name: productStore.name,
              avatar: productStore.logo_url || "",
              totalSales: productStore.total_sales || "0",
              rating: Number(productStore.rating) || 5.0,
            }}
            storeSlug={productStore.slug}
          />
        )}

        <RelatedProducts title="Mais desta loja" products={relatedFormatted} />
        {relatedFormatted.length > 2 && (
          <RelatedProducts title="Você também pode gostar" products={relatedFormatted.slice(0, 2)} />
        )}
      </div>

      <FixedFooter
        freeShipping={product.free_shipping || false}
        onBuyNow={() => {
          if (variants.length > 0) {
            setBuySheetOpen(true);
          } else {
            handleBuyNow(null, 1);
          }
        }}
      />

      <BuySheet
        open={buySheetOpen}
        onClose={() => setBuySheetOpen(false)}
        onConfirm={handleBuyNow}
        title={product.title}
        image={images[0]?.url || ""}
        originalPrice={Number(product.original_price)}
        salePrice={Number(product.sale_price)}
        discountPercent={product.discount_percent}
        flashSale={product.flash_sale || false}
        flashSaleEndsIn={product.flash_sale_ends_in || ""}
        variants={variants}
        variantGroups={variantGroups}
      />
    </div>
  );
};

export default ProductPage;
