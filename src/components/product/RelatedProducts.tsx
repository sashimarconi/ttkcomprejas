import { formatCurrency, type Product } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

interface RelatedProductsProps {
  title: string;
  products: Product[];
}

const RelatedProducts = ({ title, products }: RelatedProductsProps) => {
  const navigate = useNavigate();

  if (products.length === 0) return null;

  return (
    <div className="bg-card px-4 py-3 mt-2">
      <p className="text-sm font-semibold text-foreground mb-3">{title}</p>
      <div className="grid grid-cols-2 gap-2.5">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => navigate(`/product/${product.id}`)}
            className="text-left rounded-lg border border-border overflow-hidden bg-card"
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={product.images[0]?.url}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-2">
              <p className="text-[11px] text-foreground line-clamp-2 leading-tight">{product.title}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-sm font-bold text-marketplace-red">
                  {formatCurrency(product.salePrice)}
                </span>
                {product.discountPercent > 0 && (
                  <span className="text-[10px] bg-marketplace-orange-light text-marketplace-orange font-bold px-1 rounded">
                    -{product.discountPercent}%
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {product.soldCount.toLocaleString('pt-BR')} vendidos
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;
