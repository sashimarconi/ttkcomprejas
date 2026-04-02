import { Store, MessageCircle } from "lucide-react";

interface FixedFooterProps {
  freeShipping: boolean;
  onBuyNow: () => void;
  buttonText?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonRadius?: string;
  shippingLabel?: string;
}

const FixedFooter = ({
  freeShipping,
  onBuyNow,
  buttonText = "Comprar Agora",
  buttonColor,
  buttonTextColor,
  buttonRadius,
  shippingLabel = "Frete Grátis",
}: FixedFooterProps) => {
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
            className="w-full flex flex-col items-center justify-center h-11"
            style={{
              backgroundColor: buttonColor || undefined,
              color: buttonTextColor || undefined,
              borderRadius: buttonRadius || undefined,
            }}
          >
            {!buttonColor && <span className="absolute inset-0 rounded-lg bg-marketplace-red" />}
            <span className="relative text-sm font-bold" style={{ color: buttonTextColor || undefined }}>
              {buttonText}
            </span>
            {freeShipping && (
              <span className="relative text-[9px] font-normal opacity-90">{shippingLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FixedFooter;
