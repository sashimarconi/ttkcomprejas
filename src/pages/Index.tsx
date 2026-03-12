import { useNavigate } from "react-router-dom";
import { mockProducts, formatCurrency } from "@/data/mockData";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card px-4 py-4 shadow-sm">
        <h1 className="text-lg font-bold text-foreground">🛒 Marketplace</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Ofertas imperdíveis para você</p>
      </header>

      {/* Products grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {mockProducts.map((product) => (
          <button
            key={product.id}
            onClick={() => navigate(`/product/${product.id}`)}
            className="text-left rounded-lg border border-border overflow-hidden bg-card shadow-sm"
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={product.images[0]?.url}
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
                  {formatCurrency(product.salePrice)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-muted-foreground line-through">
                  {formatCurrency(product.originalPrice)}
                </span>
                <span className="text-[10px] bg-marketplace-orange-light text-marketplace-orange font-bold px-1 rounded">
                  -{product.discountPercent}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {product.soldCount.toLocaleString('pt-BR')} vendidos
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Index;
