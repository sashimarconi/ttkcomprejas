import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { fetchStoreBySlug, fetchStoreProducts } from "@/lib/supabase-queries";
import { formatCurrency } from "@/data/mockData";
import ProductHeader from "@/components/product/ProductHeader";

const StorePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ["store", slug],
    queryFn: () => fetchStoreBySlug(slug!),
    enabled: !!slug,
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["store-products", store?.id],
    queryFn: () => fetchStoreProducts(store!.id),
    enabled: !!store?.id,
  });

  if (storeLoading || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ProductHeader />

      <div className="pt-12">
        {/* Store Header */}
        <div className="bg-card px-4 py-6 flex items-center gap-4 border-b border-border">
          {store.logo_url && (
            <img
              src={store.logo_url}
              alt={store.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-border"
            />
          )}
          <div>
            <h1 className="text-lg font-bold text-foreground">{store.name}</h1>
            {store.description && (
              <p className="text-sm text-muted-foreground mt-1">{store.description}</p>
            )}
          </div>
        </div>

        {/* Products Grid */}
        <div className="px-4 py-4">
          <p className="text-sm font-semibold text-foreground mb-3">
            Produtos ({products?.length || 0})
          </p>

          {productsLoading ? (
            <p className="text-sm text-muted-foreground">Carregando produtos...</p>
          ) : !products || products.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum produto nesta loja.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => navigate(`/product/${product.slug}`)}
                  className="text-left rounded-lg border border-border overflow-hidden bg-card"
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={product.product_images?.[0]?.url || "/placeholder.svg"}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] text-foreground line-clamp-2 leading-tight">
                      {product.title}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-sm font-bold text-marketplace-red">
                        {formatCurrency(Number(product.sale_price))}
                      </span>
                      {product.discount_percent > 0 && (
                        <span className="text-[10px] bg-marketplace-orange-light text-marketplace-orange font-bold px-1 rounded">
                          -{product.discount_percent}%
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {(product.sold_count || 0).toLocaleString("pt-BR")} vendidos
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StorePage;
