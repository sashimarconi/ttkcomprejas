import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchProductBySlug } from "@/lib/supabase-queries";
import { formatCurrency } from "@/data/mockData";
import { ArrowLeft, Minus, Plus, Check, ShieldCheck, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface ShippingOption {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  estimated_days: string | null;
  price: number;
  free: boolean | null;
}

interface OrderBump {
  id: string;
  title: string;
  image_url: string | null;
  price: number;
}

const CheckoutPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerDocument, setCustomerDocument] = useState("");
  const [customerCep, setCustomerCep] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [customerComplement, setCustomerComplement] = useState("");
  const [customerNeighborhood, setCustomerNeighborhood] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeBase64: string; copyPaste: string; expiresAt: string } | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug!),
    enabled: !!slug,
  });

  const { data: shippingOptions } = useQuery({
    queryKey: ["shipping-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_options")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data as ShippingOption[];
    },
  });

  const { data: orderBumps } = useQuery({
    queryKey: ["order-bumps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_bumps")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data as OrderBump[];
    },
  });

  useEffect(() => {
    if (shippingOptions?.length && !selectedShipping) {
      setSelectedShipping(shippingOptions[0].id);
    }
  }, [shippingOptions, selectedShipping]);

  const selectedShippingOption = shippingOptions?.find((s) => s.id === selectedShipping);
  const shippingCost = selectedShippingOption?.free ? 0 : Number(selectedShippingOption?.price || 0);

  const bumpsTotal = useMemo(() => {
    return (orderBumps || [])
      .filter((b) => selectedBumps.includes(b.id))
      .reduce((sum, b) => sum + Number(b.price), 0);
  }, [orderBumps, selectedBumps]);

  const productSubtotal = Number(product?.sale_price || 0) * quantity;
  const originalSubtotal = Number(product?.original_price || 0) * quantity;
  const discount = originalSubtotal - productSubtotal;
  const total = productSubtotal + shippingCost + bumpsTotal;

  const toggleBump = (id: string) => {
    setSelectedBumps((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const handleSubmitOrder = async () => {
    if (!customerName || !customerEmail || !customerPhone || !customerDocument) {
      setShowForm(true);
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (!product) return;

    setSubmitting(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/create-pix-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            productTitle: product.title,
            quantity,
            amount: Math.round(total * 100),
            customerName,
            customerEmail,
            customerPhone,
            customerDocument,
            shippingOptionId: selectedShipping,
            shippingCost: Math.round(shippingCost * 100),
            selectedBumps: (orderBumps || [])
              .filter((b) => selectedBumps.includes(b.id))
              .map((b) => ({ id: b.id, title: b.title, price: Math.round(Number(b.price) * 100) })),
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao gerar pagamento");

      setPixData({
        qrCodeBase64: result.paymentData.qrCodeBase64,
        copyPaste: result.paymentData.copyPaste,
        expiresAt: result.paymentData.expiresAt,
      });
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar pagamento");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (pixData) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="flex items-center h-12 px-4">
            <button onClick={() => setPixData(null)}>
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-sm font-semibold text-foreground">Pagamento PIX</p>
              <p className="text-[10px] text-marketplace-green flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Pagamento seguro
              </p>
            </div>
            <div className="w-5" />
          </div>
        </header>

        <div className="max-w-lg mx-auto p-4 space-y-4">
          <div className="bg-card rounded-xl p-6 text-center space-y-4 border border-border">
            <p className="text-sm text-muted-foreground">Escaneie o QR Code ou copie o código</p>
            <div className="flex justify-center">
              <img src={pixData.qrCodeBase64} alt="QR Code PIX" className="w-48 h-48 rounded-lg" />
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(pixData.copyPaste);
                toast.success("Código copiado!");
              }}
              className="w-full py-3 rounded-full bg-marketplace-green text-white text-sm font-bold"
            >
              Copiar código PIX
            </button>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              Expira em {new Date(pixData.expiresAt).toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-xs text-muted-foreground">Total pago</p>
            <p className="text-lg font-bold text-marketplace-red">{formatCurrency(total)}</p>
          </div>
        </div>
      </div>
    );
  }

  const mainImage = product.product_images?.[0]?.url || "/placeholder.svg";

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center h-12 px-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-foreground">Resumo do pedido</p>
            <p className="text-[10px] text-marketplace-green flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Finalização da compra segura garantida
            </p>
          </div>
          <div className="w-5" />
        </div>
        {/* Progress bar */}
        <div className="flex gap-1 px-4 pb-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full bg-marketplace-green" />
          ))}
        </div>
      </header>

      {/* Customer info toggle */}
      <button
        onClick={() => setShowForm(true)}
        className="w-full bg-card border-b border-border px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
            <span className="text-[10px]">📍</span>
          </div>
          <span className="text-sm text-foreground">
            {customerName ? `${customerName} — ${customerDocument}` : "Adicionar informações do pedido"}
          </span>
        </div>
        <span className="text-muted-foreground text-lg">›</span>
      </button>

      {/* Customer info sheet */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">Informações do pedido</h2>
            <button onClick={() => setShowForm(false)}>
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">CPF</label>
              <input
                className="w-full border-b border-border pb-2 text-sm bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none"
                placeholder="000.000.000-00"
                value={customerDocument}
                onChange={(e) => setCustomerDocument(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">E-mail</label>
              <input
                className="w-full border-b border-border pb-2 text-sm bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none"
                placeholder="seu@email.com"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome completo</label>
              <input
                className="w-full border-b border-border pb-2 text-sm bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none"
                placeholder="Seu nome"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefone</label>
              <input
                className="w-full border-b border-border pb-2 text-sm bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none"
                placeholder="(99) 99999-9999"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">CEP</label>
              <input
                className="w-full border-b border-border pb-2 text-sm bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none"
                placeholder="00000-000"
                value={customerCep}
                onChange={(e) => setCustomerCep(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereço</label>
              <input
                className="w-full border-b border-border pb-2 text-sm bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none"
                placeholder="Rua, Avenida..."
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Número</label>
                <input
                  className="w-full border-b border-border pb-2 text-sm bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none"
                  placeholder="123"
                  value={customerNumber}
                  onChange={(e) => setCustomerNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Complemento (opcional)</label>
                <input
                  className="w-full border-b border-border pb-2 text-sm bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none"
                  placeholder="Apto, Bloco..."
                  value={customerComplement}
                  onChange={(e) => setCustomerComplement(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Bairro</label>
              <input
                className="w-full border-b border-border pb-2 text-sm bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none"
                placeholder="Centro"
                value={customerNeighborhood}
                onChange={(e) => setCustomerNeighborhood(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade</label>
              <input
                className="w-full border-b border-border pb-2 text-sm bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none"
                placeholder="São Paulo"
                value={customerCity}
                onChange={(e) => setCustomerCity(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="w-full py-3 rounded-full bg-marketplace-red text-white text-sm font-bold mt-4"
            >
              Salvar informações
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Store name */}
      <div className="bg-card px-4 py-3 mt-2 border-b border-border flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Seu pedido</p>
        <span className="text-xs text-muted-foreground">Adicionar nota ›</span>
      </div>

      {/* Product card */}
      <div className="bg-card px-4 py-3 border-b border-border">
        <div className="flex gap-3">
          <img src={mainImage} alt={product.title} className="w-16 h-16 rounded-lg object-cover bg-muted" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground line-clamp-2 leading-snug">{product.title}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm font-bold text-marketplace-red">{formatCurrency(Number(product.sale_price))}</span>
              <span className="text-xs text-muted-foreground line-through">{formatCurrency(Number(product.original_price))}</span>
              <span className="text-[10px] text-marketplace-green font-semibold">-{product.discount_percent}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="w-7 h-7 rounded-full border border-border flex items-center justify-center"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-medium w-5 text-center">{quantity}</span>
            <button
              className="w-7 h-7 rounded-full border border-border flex items-center justify-center"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Shipping options */}
      {shippingOptions && shippingOptions.length > 0 && (
        <div className="mt-2">
          <div className="bg-card px-4 py-2.5 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Método de entrega</p>
          </div>
          {shippingOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedShipping(option.id)}
              className={`w-full bg-card px-4 py-3 border-b border-border flex items-center gap-3 transition-colors ${
                selectedShipping === option.id ? "ring-1 ring-marketplace-red" : ""
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedShipping === option.id
                    ? "border-marketplace-red"
                    : "border-muted-foreground/30"
                }`}
              >
                {selectedShipping === option.id && (
                  <div className="w-2 h-2 rounded-full bg-marketplace-red" />
                )}
              </div>
              {option.logo_url && (
                <img src={option.logo_url} alt={option.name} className="w-8 h-8 rounded object-contain" />
              )}
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">{option.name}</p>
                {option.estimated_days && (
                  <p className="text-[11px] text-muted-foreground">Chega em {option.estimated_days}</p>
                )}
              </div>
              <span className={`text-sm font-semibold ${option.free ? "text-marketplace-green" : "text-foreground"}`}>
                {option.free ? "GRÁTIS" : formatCurrency(Number(option.price))}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Order bumps */}
      {orderBumps && orderBumps.length > 0 && (
        <div className="mt-2">
          <div className="bg-marketplace-red/10 px-4 py-2.5 flex items-center gap-2">
            <span className="text-marketplace-red text-sm">⚡</span>
            <p className="text-sm font-bold text-marketplace-red uppercase">Ofertas especiais selecionadas</p>
          </div>
          {orderBumps.map((bump) => (
            <button
              key={bump.id}
              onClick={() => toggleBump(bump.id)}
              className="w-full bg-card px-4 py-3 border-b border-border flex items-center gap-3"
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedBumps.includes(bump.id)
                    ? "border-marketplace-red bg-marketplace-red"
                    : "border-muted-foreground/30"
                }`}
              >
                {selectedBumps.includes(bump.id) && <Check className="w-3 h-3 text-white" />}
              </div>
              {bump.image_url && (
                <img src={bump.image_url} alt={bump.title} className="w-12 h-12 rounded object-cover" />
              )}
              <div className="flex-1 text-left">
                <p className="text-xs text-foreground line-clamp-2">{bump.title}</p>
                <p className="text-sm font-bold text-marketplace-red mt-0.5">Por {formatCurrency(Number(bump.price))}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Order summary */}
      <div className="bg-card px-4 py-3 mt-2 space-y-2 border-b border-border">
        <p className="text-sm font-semibold text-foreground">Resumo do pedido</p>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Subtotal do produto</span>
          <span>{formatCurrency(productSubtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-xs text-marketplace-green">
            <span>Desconto no produto</span>
            <span>- {formatCurrency(discount)}</span>
          </div>
        )}
        {shippingCost > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Taxa de envio</span>
            <span>{formatCurrency(shippingCost)}</span>
          </div>
        )}
        {shippingCost === 0 && selectedShippingOption && (
          <div className="flex justify-between text-xs text-marketplace-green">
            <span>Frete</span>
            <span>Grátis</span>
          </div>
        )}
        {bumpsTotal > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Ofertas extras</span>
            <span>{formatCurrency(bumpsTotal)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold text-foreground pt-2 border-t border-border">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <p className="text-[10px] text-muted-foreground text-right">Impostos inclusos</p>
      </div>

      {/* Payment method */}
      <div className="bg-card px-4 py-3 mt-2 border-b border-border">
        <p className="text-sm font-semibold text-foreground mb-2">Forma de pagamento</p>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-marketplace-green/10 border border-marketplace-green/30">
          <div className="w-5 h-5 rounded-full border-2 border-marketplace-green flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-marketplace-green" />
          </div>
          <span className="text-sm font-semibold text-foreground">Pix</span>
        </div>
      </div>

      {/* Savings banner */}
      {discount > 0 && (
        <div className="bg-card px-4 py-3 mt-2 text-center border-b border-border">
          <p className="text-xs text-marketplace-green font-medium">
            😊 Você está economizando {formatCurrency(discount)} nesse pedido.
          </p>
        </div>
      )}

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
        <div className="max-w-screen-lg mx-auto px-4 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">Total ({quantity} {quantity === 1 ? "item" : "itens"})</p>
            <p className="text-lg font-bold text-marketplace-red">{formatCurrency(total)}</p>
          </div>
          <button
            onClick={handleSubmitOrder}
            disabled={submitting}
            className="flex-1 ml-4 py-3 rounded-full bg-marketplace-red text-white text-sm font-bold disabled:opacity-50 flex flex-col items-center"
          >
            <span>{submitting ? "Processando..." : "Fazer pedido"}</span>
            {product.flash_sale && (
              <span className="text-[9px] font-normal opacity-90">Oferta Relâmpago termina em breve</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
