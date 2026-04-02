import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/supabase-queries";
import { formatCurrency } from "@/data/mockData";

const Index = () => {
  const navigate = useNavigate();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products-list"],
    queryFn: fetchProducts,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card px-4 py-4 shadow-sm">
        <h1 className="text-lg font-bold text-foreground">🛒 Marketplace</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Ofertas imperdíveis para você</p>
      </header>

      {/* Products grid */}
      <div className="p-4 grid grid-cols-2 gap-3 max-w-screen-lg mx-auto">
        {products?.map((product) => (
          <button
            key={product.id}
            onClick={() => navigate(`/product/${product.slug}`)}
            className="text-left rounded-lg border border-border overflow-hidden bg-card shadow-sm"
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={product.product_images?.[0]?.url || "/placeholder.svg"}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-2.5">
              <p className="text-xs text-foreground line-clamp-2 leading-tight font-medium">
                {product.title}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-base font-bold text-marketplace-red">
                  {formatCurrency(Number(product.sale_price))}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-muted-foreground line-through">
                  {formatCurrency(Number(product.original_price))}
                </span>
                {product.discount_percent > 0 && (
                  <span className="text-[10px] bg-marketplace-orange-light text-marketplace-orange font-bold px-1 rounded">
                    -{product.discount_percent}%
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {(product.sold_count || 0).toLocaleString("pt-BR")} vendidos
              </p>
            </div>
          </button>
        ))}
      </div>

      {(!products || products.length === 0) && (
        <p className="text-center text-muted-foreground py-12">
          Nenhum produto cadastrado. <a href="/admin" className="text-marketplace-red underline">Ir para o admin</a>
        </p>
      )}
    </div>
  );
};

export default Index;
