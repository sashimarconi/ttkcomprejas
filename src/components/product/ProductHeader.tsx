import { ArrowLeft, Share2, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

const sections = ["Visão geral", "Avaliações", "Descrição", "Recomendações"];

interface ProductHeaderProps {
  activeSection: string;
  onSectionClick: (section: string) => void;
  cartCount?: number;
}

const ProductHeader = ({ activeSection, onSectionClick, cartCount = 0 }: ProductHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card shadow-sm">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-12">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-4">
          <button className="p-1">
            <Share2 className="w-5 h-5 text-foreground" />
          </button>
          <button className="p-1 relative">
            <ShoppingCart className="w-5 h-5 text-foreground" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-marketplace-red text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-t border-border">
        {sections.map((section) => (
          <button
            key={section}
            onClick={() => onSectionClick(section)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeSection === section
                ? "text-marketplace-red border-b-2 border-marketplace-red"
                : "text-muted-foreground"
            }`}
          >
            {section}
          </button>
        ))}
      </div>
    </header>
  );
};

export default ProductHeader;
