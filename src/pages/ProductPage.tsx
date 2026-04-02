import { useRef, useState } from "react";
import { usePageTracking, useVisitorHeartbeat } from "@/hooks/usePageTracking";
import { useTikTokPixel } from "@/hooks/useTikTokPixel";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

export interface ProductPageBuilderConfig {
  sections: { id: string; enabled: boolean; label: string }[];
  appearance: {
    bg_color: string;
    header_bg_color: string;
    header_logo_url: string;
    header_logo_height: number;
    show_cart_icon: boolean;
    button_color: string;
    button_text_color: string;
    button_radius: string;
  };
  texts: {
    buy_button_text: string;
    shipping_label: string;
    reviews_title: string;
    units_available_text: string;
    description_title: string;
    related_title: string;
  };
  conversion: {
    show_discount_badge: boolean;
    show_flash_sale: boolean;
    show_sold_count: boolean;
    show_units_available: boolean;
    units_available_count: number;
  };
}

const DEFAULT_BUILDER: ProductPageBuilderConfig = {
  sections: [
    { id: "gallery", enabled: true, label: "Galeria" },
    { id: "pricing", enabled: true, label: "Preço" },
    { id: "info", enabled: true, label: "Info" },
    { id: "shipping", enabled: true, label: "Frete" },
    { id: "trust_badges", enabled: true, label: "Badges" },
    { id: "store_card", enabled: true, label: "Loja" },
    { id: "reviews", enabled: true, label: "Avaliações" },
    { id: "description", enabled: true, label: "Descrição" },
    { id: "related", enabled: true, label: "Relacionados" },
  ],
  appearance: { bg_color: "", header_bg_color: "", header_logo_url: "", header_logo_height: 28, show_cart_icon: true, button_color: "#E63946", button_text_color: "#FFFFFF", button_radius: "lg" },
  texts: { buy_button_text: "Comprar agora", shipping_label: "Frete grátis", reviews_title: "Avaliações", units_available_text: "13 unidades disponíveis", description_title: "Descrição do produto", related_title: "Mais desta loja" },
  conversion: { show_discount_badge: true, show_flash_sale: true, show_sold_count: true, show_units_available: true, units_available_count: 13 },
};

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  usePageTracking("page_view");
  useVisitorHeartbeat();
  useTikTokPixel();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug!),
    enabled: !!slug,
    staleTime: 5 * 60_000, // 5 min cache
    gcTime: 10 * 60_000,
  });

  const { data: productStore } = useQuery({
    queryKey: ["product-store", product?.id],
    queryFn: () => fetchStoreForProduct(product!.id),
    enabled: !!product?.id,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  const { data: storeProducts } = useQuery({
    queryKey: ["store-products", productStore?.id],
    queryFn: () => fetchStoreProducts(productStore!.id),
    enabled: !!productStore?.id,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: () => fetchStoreSettings(),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });

  const { data: builderRaw } = useQuery({
    queryKey: ["product-page-builder-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_page_builder_config" as any)
        .select("*")
        .limit(1)
        .single();
      if (error) return null;
      return data as any;
    },
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });

  const builder: ProductPageBuilderConfig = (() => {
    if (!builderRaw?.config || Object.keys(builderRaw.config).length === 0) return DEFAULT_BUILDER;
    const c = builderRaw.config as any;
    return {
      sections: c.sections || DEFAULT_BUILDER.sections,
      appearance: { ...DEFAULT_BUILDER.appearance, ...(c.appearance || {}) },
      texts: { ...DEFAULT_BUILDER.texts, ...(c.texts || {}) },
      conversion: { ...DEFAULT_BUILDER.conversion, ...(c.conversion || {}) },
    };
  })();

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

  const images = (product.product_images || []).map((img) => ({ id: img.id, url: img.url, alt: img.alt || "" }));
  const variants = (product.product_variants || []).map((v) => ({ id: v.id, name: v.name, color: v.color || "", thumbnail: v.thumbnail_url || "", groupId: v.variant_group_id || null }));
  const variantGroups = (product.variant_groups || []).map((g) => ({ id: g.id, name: g.name }));
  const reviews = (product.reviews || []).map((r) => ({ id: r.id, userName: r.user_name, userAvatar: r.user_avatar_url || "", city: r.city || "", rating: r.rating, comment: r.comment || "", photos: r.photos || [], date: r.review_date || "" }));

  const relatedFormatted = otherProducts.map((p) => ({
    id: p.slug, title: p.title, description: p.description || "",
    originalPrice: Number(p.original_price), salePrice: Number(p.sale_price), discountPercent: p.discount_percent,
    images: (p.product_images || []).map((img) => ({ id: img.id, url: img.url, alt: img.alt || "" })),
    variants: [], rating: Number(p.rating) || 0, reviewCount: p.review_count || 0, soldCount: p.sold_count || 0,
    promoTag: p.promo_tag || "", flashSale: p.flash_sale || false, flashSaleEndsIn: p.flash_sale_ends_in || "",
    freeShipping: p.free_shipping || false, shippingCost: Number(p.shipping_cost) || 0, estimatedDelivery: p.estimated_delivery || "",
    checkoutType: p.checkout_type as "external" | "pix", externalCheckoutUrl: p.external_checkout_url || "", reviews: [],
  }));

  const isSectionEnabled = (id: string) => {
    const s = builder.sections.find((s) => s.id === id);
    return s ? s.enabled : true;
  };

  const btnRadius = builder.appearance.button_radius === "full" ? "9999px" : builder.appearance.button_radius === "lg" ? "8px" : builder.appearance.button_radius === "md" ? "6px" : "0px";

  // Build section rendering map
  const sectionComponents: Record<string, React.ReactNode> = {
    gallery: isSectionEnabled("gallery") && <ProductGallery images={images} />,
    pricing: isSectionEnabled("pricing") && (
      <PricingBlock
        originalPrice={Number(product.original_price)}
        salePrice={Number(product.sale_price)}
        discountPercent={product.discount_percent}
        flashSale={product.flash_sale || false}
        flashSaleEndsIn={product.flash_sale_ends_in || ""}
        showDiscountBadge={builder.conversion.show_discount_badge}
        showFlashSale={builder.conversion.show_flash_sale}
      />
    ),
    info: isSectionEnabled("info") && (
      <ProductInfo
        title={product.title}
        promoTag={product.promo_tag || ""}
        rating={Number(product.rating) || 0}
        reviewCount={product.review_count || 0}
        soldCount={product.sold_count || 0}
        variants={variants}
        variantGroups={variantGroups}
        showSoldCount={builder.conversion.show_sold_count}
        showUnitsAvailable={builder.conversion.show_units_available}
        unitsAvailableText={builder.texts.units_available_text}
      />
    ),
    shipping: isSectionEnabled("shipping") && (
      <ShippingInfo
        freeShipping={product.free_shipping || false}
        shippingCost={Number(product.shipping_cost) || 0}
        estimatedDelivery={product.estimated_delivery || ""}
        shippingLabel={builder.texts.shipping_label}
      />
    ),
    trust_badges: isSectionEnabled("trust_badges") && <TrustBadges />,
    store_card: isSectionEnabled("store_card") && productStore && (
      <StoreCard
        store={{ name: productStore.name, avatar: productStore.logo_url || "", totalSales: productStore.total_sales || "0", rating: Number(productStore.rating) || 5.0 }}
        storeSlug={productStore.slug}
      />
    ),
    reviews: isSectionEnabled("reviews") && (
      <div ref={reviewsRef}>
        <ReviewsSection reviews={reviews} totalReviews={product.review_count || 0} title={builder.texts.reviews_title} />
      </div>
    ),
    description: isSectionEnabled("description") && (
      <div ref={descriptionRef} className="bg-card px-4 py-4 mt-2">
        <p className="text-sm font-bold text-foreground mb-3">{builder.texts.description_title}</p>
        {product.video_url && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <video src={product.video_url} className="w-full rounded-lg" controls playsInline preload="metadata" />
          </div>
        )}
        {product.description && product.description.includes("<") ? (
          <div className="text-xs text-muted-foreground leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} />
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{product.description}</p>
        )}
      </div>
    ),
    related: isSectionEnabled("related") && (
      <>
        <RelatedProducts title={builder.texts.related_title} products={relatedFormatted} />
        {relatedFormatted.length > 2 && <RelatedProducts title="Você também pode gostar" products={relatedFormatted.slice(0, 2)} />}
      </>
    ),
  };

  const logoUrl = builder.appearance.header_logo_url || storeSettings?.product_page_logo_url || undefined;

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: builder.appearance.bg_color || undefined }}>
      <ProductHeader
        logoUrl={logoUrl}
        logoHeight={builder.appearance.header_logo_height}
        headerBgColor={builder.appearance.header_bg_color}
        showCartIcon={builder.appearance.show_cart_icon}
      />

      <div className="pt-12">
        {builder.sections.map((section) => (
          <div key={section.id}>{sectionComponents[section.id]}</div>
        ))}
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
        buttonText={builder.texts.buy_button_text}
        buttonColor={builder.appearance.button_color}
        buttonTextColor={builder.appearance.button_text_color}
        buttonRadius={btnRadius}
        shippingLabel={builder.texts.shipping_label}
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
