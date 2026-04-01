import { ArrowLeft, ShoppingCart, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProductHeaderProps {
  activeSection?: string;
  onSectionClick?: (section: string) => void;
  cartCount?: number;
  logoUrl?: string;
}

const ProductHeader = ({ cartCount = 0, logoUrl }: ProductHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
      <div className="flex items-center justify-between px-4 h-12">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        {logoUrl && (
          <img src={logoUrl} alt="Logo" className="h-7 object-contain max-w-[140px]" />
        )}
        <div className="flex items-center gap-3">
          <button className="p-1 relative">
            <ShoppingCart className="w-5 h-5 text-foreground" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-marketplace-red text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
          <button className="p-1">
            <MoreHorizontal className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default ProductHeader;
