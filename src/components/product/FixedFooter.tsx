import { Store, MessageCircle } from "lucide-react";

interface FixedFooterProps {
  freeShipping: boolean;
  onBuyNow: () => void;
}

const FixedFooter = ({ freeShipping, onBuyNow }: FixedFooterProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
      <div className="flex items-center h-14 px-3 max-w-screen-lg mx-auto">
        <div className="flex items-center gap-1">
          <button className="flex flex-col items-center justify-center w-12 h-full text-muted-foreground">
            <Store className="w-5 h-5" />
            <span className="text-[9px] mt-0.5">Loja</span>
          </button>
          <button className="flex flex-col items-center justify-center w-12 h-full text-muted-foreground">
            <MessageCircle className="w-5 h-5" />
            <span className="text-[9px] mt-0.5">Chat</span>
          </button>
        </div>

        <div className="flex-1 ml-2">
          <button
            onClick={onBuyNow}
            className="w-full flex flex-col items-center justify-center h-11 rounded-lg bg-marketplace-red text-primary-foreground"
          >
            <span className="text-sm font-bold">Comprar Agora</span>
            {freeShipping && (
              <span className="text-[9px] font-normal opacity-90">Frete Grátis</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FixedFooter;
