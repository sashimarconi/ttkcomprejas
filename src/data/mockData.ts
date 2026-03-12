export interface ProductImage {
  id: string;
  url: string;
  alt: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  color: string;
  thumbnail: string;
}

export interface Review {
  id: string;
  userName: string;
  userAvatar: string;
  city: string;
  rating: number;
  comment: string;
  photos: string[];
  date: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  images: ProductImage[];
  variants: ProductVariant[];
  rating: number;
  reviewCount: number;
  soldCount: number;
  promoTag: string;
  flashSale: boolean;
  flashSaleEndsIn: string;
  freeShipping: boolean;
  shippingCost: number;
  estimatedDelivery: string;
  checkoutType: 'external' | 'pix';
  externalCheckoutUrl?: string;
  reviews: Review[];
}

export interface StoreInfo {
  name: string;
  avatar: string;
  totalSales: string;
  rating: number;
}

export const mockStore: StoreInfo = {
  name: "Loja Brinox Oficial",
  avatar: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=80&h=80&fit=crop",
  totalSales: "35.4K",
  rating: 4.9,
};

export const mockProducts: Product[] = [
  {
    id: "panelas-brinox",
    title: "Jogo de Panelas Brinox Antiaderente 10 Peças Premium Collection",
    description: "Jogo completo de panelas antiaderentes com revestimento cerâmico de alta durabilidade. Inclui: 2 caçarolas, 2 frigideiras, 1 leiteira e 5 tampas de vidro temperado. Cabo ergonômico em silicone que não esquenta. Compatível com todos os tipos de fogão, incluindo indução.",
    originalPrice: 399.90,
    salePrice: 89.90,
    discountPercent: 78,
    images: [
      { id: "1", url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=600&fit=crop", alt: "Jogo de panelas vista frontal" },
      { id: "2", url: "https://images.unsplash.com/photo-1584990347449-a6526e0ed6d0?w=600&h=600&fit=crop", alt: "Panelas em uso" },
      { id: "3", url: "https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=600&h=600&fit=crop", alt: "Detalhe do revestimento" },
      { id: "4", url: "https://images.unsplash.com/photo-1574269909862-7e3d7bc60735?w=600&h=600&fit=crop", alt: "Conjunto completo" },
    ],
    variants: [
      { id: "v1", name: "Preto", color: "#1a1a1a", thumbnail: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=60&h=60&fit=crop" },
      { id: "v2", name: "Vermelho", color: "#dc2626", thumbnail: "https://images.unsplash.com/photo-1584990347449-a6526e0ed6d0?w=60&h=60&fit=crop" },
      { id: "v3", name: "Cinza", color: "#6b7280", thumbnail: "https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=60&h=60&fit=crop" },
    ],
    rating: 4.9,
    reviewCount: 1847,
    soldCount: 12340,
    promoTag: "Promo do Mês",
    flashSale: true,
    flashSaleEndsIn: "2 dia(s)",
    freeShipping: true,
    shippingCost: 0,
    estimatedDelivery: "20 de março",
    checkoutType: 'external',
    externalCheckoutUrl: '#',
    reviews: [
      {
        id: "r1",
        userName: "Maria Silva",
        userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop",
        city: "São Paulo, SP",
        rating: 5,
        comment: "Panelas maravilhosas! O revestimento antiaderente é excelente, nada gruda. Já faz 3 meses que uso diariamente e estão como novas. Super recomendo!",
        photos: ["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop"],
        date: "2024-01-15",
      },
      {
        id: "r2",
        userName: "João Santos",
        userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop",
        city: "Rio de Janeiro, RJ",
        rating: 5,
        comment: "Entrega rápida e produto de qualidade. As panelas são lindas e muito práticas. O cabo de silicone realmente não esquenta. Ótimo custo-benefício!",
        photos: [],
        date: "2024-01-10",
      },
      {
        id: "r3",
        userName: "Ana Oliveira",
        userAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop",
        city: "Belo Horizonte, MG",
        rating: 5,
        comment: "Comprei pelo preço promocional e valeu cada centavo. As panelas são pesadas (no bom sentido), o acabamento é impecável. Chegou bem embalado.",
        photos: ["https://images.unsplash.com/photo-1584990347449-a6526e0ed6d0?w=100&h=100&fit=crop"],
        date: "2024-01-05",
      },
    ],
  },
  {
    id: "frigideira-ceramic",
    title: "Frigideira Ceramic Life Smart Plus 24cm",
    description: "Frigideira com revestimento cerâmico interno e externo.",
    originalPrice: 189.90,
    salePrice: 59.90,
    discountPercent: 68,
    images: [
      { id: "1", url: "https://images.unsplash.com/photo-1574269909862-7e3d7bc60735?w=600&h=600&fit=crop", alt: "Frigideira" },
    ],
    variants: [],
    rating: 4.8,
    reviewCount: 923,
    soldCount: 5420,
    promoTag: "Mais Vendido",
    flashSale: false,
    flashSaleEndsIn: "",
    freeShipping: true,
    shippingCost: 0,
    estimatedDelivery: "22 de março",
    checkoutType: 'external',
    externalCheckoutUrl: '#',
    reviews: [],
  },
  {
    id: "conjunto-facas",
    title: "Conjunto de Facas Inox 6 Peças com Cepo",
    description: "Kit profissional de facas em aço inoxidável com cepo de madeira.",
    originalPrice: 299.90,
    salePrice: 79.90,
    discountPercent: 73,
    images: [
      { id: "1", url: "https://images.unsplash.com/photo-1593618998160-e34014e67546?w=600&h=600&fit=crop", alt: "Conjunto de facas" },
    ],
    variants: [],
    rating: 4.7,
    reviewCount: 654,
    soldCount: 3210,
    promoTag: "",
    flashSale: false,
    flashSaleEndsIn: "",
    freeShipping: false,
    shippingCost: 12.90,
    estimatedDelivery: "25 de março",
    checkoutType: 'external',
    externalCheckoutUrl: '#',
    reviews: [],
  },
];

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
