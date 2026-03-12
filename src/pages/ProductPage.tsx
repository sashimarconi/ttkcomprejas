import { useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { mockProducts, mockStore } from "@/data/mockData";
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
import { useState } from "react";

const ProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const product = mockProducts.find((p) => p.id === id) || mockProducts[0];
  const otherProducts = mockProducts.filter((p) => p.id !== product.id);

  const [activeSection, setActiveSection] = useState("Visão geral");

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
    if (product.checkoutType === 'external' && product.externalCheckoutUrl) {
      window.open(product.externalCheckoutUrl, '_blank');
    }
    // PIX checkout will be implemented later
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <ProductHeader
        activeSection={activeSection}
        onSectionClick={scrollToSection}
      />

      {/* Content - offset for fixed header */}
      <div className="pt-[88px]">
        {/* Overview section */}
        <div ref={overviewRef}>
          <ProductGallery images={product.images} />
          <PricingBlock
            originalPrice={product.originalPrice}
            salePrice={product.salePrice}
            discountPercent={product.discountPercent}
            flashSale={product.flashSale}
            flashSaleEndsIn={product.flashSaleEndsIn}
          />
          <ProductInfo
            title={product.title}
            promoTag={product.promoTag}
            rating={product.rating}
            reviewCount={product.reviewCount}
            soldCount={product.soldCount}
            variants={product.variants}
          />
          <ShippingInfo
            freeShipping={product.freeShipping}
            shippingCost={product.shippingCost}
            estimatedDelivery={product.estimatedDelivery}
          />
          <TrustBadges />
        </div>

        {/* Reviews section */}
        <div ref={reviewsRef}>
          <ReviewsSection reviews={product.reviews} totalReviews={product.reviewCount} />
        </div>

        {/* Description section */}
        <div ref={descriptionRef} className="bg-card px-4 py-3 mt-2">
          <p className="text-sm font-semibold text-foreground mb-2">Descrição do produto</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{product.description}</p>
        </div>

        {/* Store */}
        <StoreCard store={mockStore} />

        {/* Recommendations section */}
        <div ref={recommendationsRef}>
          <RelatedProducts title="Mais desta loja" products={otherProducts} />
          <RelatedProducts title="Você também pode gostar" products={otherProducts.slice(0, 2)} />
        </div>
      </div>

      <FixedFooter
        freeShipping={product.freeShipping}
        onBuyNow={handleBuyNow}
        onAddToCart={() => {}}
      />
    </div>
  );
};

export default ProductPage;
