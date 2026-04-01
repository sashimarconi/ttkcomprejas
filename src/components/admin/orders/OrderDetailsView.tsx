import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CalendarDays, CheckCircle2, CircleAlert, CopyCheck, CreditCard, ExternalLink, FileDigit, Mail, Phone, QrCode, RefreshCw, ShoppingBag, TimerReset, Truck, UserRound } from "lucide-react";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { formatCurrency, formatDate, formatDateTime, getCustomerInitials, getDisplayVariantLabel, getPaymentMethodLabel, getShortOrderId, isQrImageSource } from "./order-utils";
import type { AdminOrderRecord } from "./types";

interface OrderDetailsViewProps {
  order: AdminOrderRecord;
  onBack: () => void;
  onRefresh: () => void;
}

const SummaryRow = ({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) => (
  <div className="flex items-center justify-between gap-4 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className={emphasized ? "font-semibold text-foreground" : "text-foreground"}>{value}</span>
  </div>
);

export const OrderDetailsView = ({ order, onBack, onRefresh }: OrderDetailsViewProps) => {
  const variantLabel = getDisplayVariantLabel(order);
  const unitPrice = order.quantity > 0 ? Number(order.subtotal || 0) / order.quantity : Number(order.subtotal || 0);
  const qrPreviewSrc = isQrImageSource(order.pix_qr_code) ? order.pix_qr_code?.trim() || null : null;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3 gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Pedido</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{getShortOrderId(order.id)}</h1>
              <p className="mt-2 text-sm text-muted-foreground">Criado em {formatDateTime(order.created_at)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge order={order} />

            {order.pix_copied ? (
              <Badge variant="outline" className="rounded-full border-marketplace-green/20 bg-marketplace-green-light text-marketplace-green">
                <CopyCheck className="mr-1 h-3.5 w-3.5" />
                Clique PIX registrado
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-full border-marketplace-yellow/20 bg-marketplace-yellow/10 text-marketplace-yellow">
                <CircleAlert className="mr-1 h-3.5 w-3.5" />
                PIX não clicado
              </Badge>
            )}

            <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr_0.95fr]">
        <Card className="rounded-[28px] border-border/80 shadow-sm">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-foreground">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Informações do cliente</h2>
                <p className="text-sm text-muted-foreground">Dados usados no checkout</p>
              </div>
            </div>

            <div className="rounded-[22px] border border-border bg-muted/40 p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-sm font-semibold text-foreground shadow-sm">
                  {getCustomerInitials(order.customer_name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{order.customer_name}</p>
                  <p className="truncate text-sm text-muted-foreground">{order.customer_email}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[20px] border border-border bg-background p-4">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  Telefone
                </p>
                <p className="font-medium text-foreground">{order.customer_phone || "Não informado"}</p>
              </div>

              <div className="rounded-[20px] border border-border bg-background p-4">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <FileDigit className="h-3.5 w-3.5" />
                  Documento
                </p>
                <p className="font-medium text-foreground">{order.customer_document || "Não informado"}</p>
              </div>

              <div className="rounded-[20px] border border-border bg-background p-4 md:col-span-2">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  E-mail
                </p>
                <p className="break-all font-medium text-foreground">{order.customer_email || "Não informado"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-border/80 shadow-sm">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-foreground">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Detalhes do pagamento</h2>
                <p className="text-sm text-muted-foreground">Método, QR Code e resumo</p>
              </div>
            </div>

            <div className="rounded-[22px] border border-border bg-background p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Método</p>
                  <p className="mt-2 font-semibold text-foreground">{getPaymentMethodLabel(order.payment_method)}</p>
                </div>
                <OrderStatusBadge order={order} className="shrink-0" />
              </div>

              <div className="rounded-[18px] bg-muted/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Transação</p>
                <p className="mt-1 break-all text-sm font-medium text-foreground">{order.transaction_id || "Não informado"}</p>
              </div>
            </div>

            {(qrPreviewSrc || order.pix_copy_paste) ? (
              <div className="rounded-[22px] border border-border bg-background p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">QR Code do Pix</p>
                    <p className="mt-1 text-sm text-muted-foreground">Visualização do pagamento gerado</p>
                  </div>

                  {qrPreviewSrc ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.open(qrPreviewSrc, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir QR
                    </Button>
                  ) : null}
                </div>

                {qrPreviewSrc ? (
                  <div className="flex justify-center rounded-[20px] border border-border bg-card p-4">
                    <img src={qrPreviewSrc} alt="QR Code do pedido" className="h-36 w-36 rounded-xl object-contain" loading="lazy" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 rounded-[20px] border border-dashed border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                    <QrCode className="h-4 w-4" />
                    QR Code indisponível para visualização
                  </div>
                )}

                {order.pix_copy_paste ? (
                  <div className="rounded-[20px] border border-border bg-muted/40 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pix copia e cola</p>
                    <p className="break-all font-mono text-[11px] leading-5 text-foreground">{order.pix_copy_paste}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-[22px] border border-border bg-background p-4 space-y-3">
              <SummaryRow label="Subtotal" value={formatCurrency(order.subtotal)} />
              <SummaryRow label="Frete" value={formatCurrency(order.shipping_cost)} />
              {Number(order.bumps_total || 0) > 0 ? <SummaryRow label="Order bump" value={formatCurrency(order.bumps_total)} /> : null}
              <div className="border-t border-border pt-3">
                <SummaryRow label="Total" value={formatCurrency(order.total)} emphasized />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-border/80 shadow-sm">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-foreground">
                <TimerReset className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Sinais do pedido</h2>
                <p className="text-sm text-muted-foreground">Status do PIX e logística</p>
              </div>
            </div>

            <div className="space-y-3 rounded-[22px] border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-4 rounded-[18px] bg-muted/40 p-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pix copiado</p>
                  <p className="mt-1 font-medium text-foreground">
                    {order.pix_copied ? "Cliente clicou no botão de copiar PIX" : "Cliente ainda não clicou no botão de copiar PIX"}
                  </p>
                </div>
                {order.pix_copied ? <CheckCircle2 className="h-5 w-5 text-marketplace-green" /> : <CircleAlert className="h-5 w-5 text-marketplace-yellow" />}
              </div>

              <div className="grid gap-3">
                <div className="rounded-[18px] border border-border p-3">
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Última atualização
                  </p>
                  <p className="font-medium text-foreground">{formatDateTime(order.updated_at)}</p>
                </div>

                {order.pix_expires_at ? (
                  <div className="rounded-[18px] border border-border p-3">
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <TimerReset className="h-3.5 w-3.5" />
                      Expiração do Pix
                    </p>
                    <p className="font-medium text-foreground">{formatDateTime(order.pix_expires_at)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(order.pix_expires_at)}</p>
                  </div>
                ) : null}

                <div className="rounded-[18px] border border-border p-3">
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Truck className="h-3.5 w-3.5" />
                    Entrega
                  </p>
                  <p className="font-medium text-foreground">{order.shipping_option?.name || "Frete não informado"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[28px] border-border/80 shadow-sm">
        <CardContent className="space-y-5 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-foreground">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Produtos do pedido</h2>
              <p className="text-sm text-muted-foreground">Resumo do item comprado</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[22px] border border-border bg-background">
            <div className="grid gap-4 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:grid-cols-[1.8fr_0.6fr_0.8fr_0.8fr]">
              <span>Produto</span>
              <span>Qtd</span>
              <span>Preço unit.</span>
              <span>Total</span>
            </div>

            <div className="grid gap-4 px-4 py-4 md:grid-cols-[1.8fr_0.6fr_0.8fr_0.8fr]">
              <div>
                <p className="font-semibold text-foreground">{order.product?.title || "Produto removido"}</p>
                {variantLabel ? <p className="mt-1 text-sm text-muted-foreground">Variante: {variantLabel}</p> : null}
                <p className="mt-1 text-sm text-muted-foreground">Pagamento: {getPaymentMethodLabel(order.payment_method)}</p>
              </div>
              <p className="font-medium text-foreground">{order.quantity}</p>
              <p className="font-medium text-foreground">{formatCurrency(unitPrice)}</p>
              <p className="font-semibold text-foreground">{formatCurrency(order.subtotal)}</p>
            </div>
          </div>

          <div className="rounded-[22px] border border-border bg-background p-4 space-y-3">
            <SummaryRow label="Subtotal" value={formatCurrency(order.subtotal)} />
            <SummaryRow label={`Frete${order.shipping_option?.name ? ` (${order.shipping_option.name})` : ""}`} value={formatCurrency(order.shipping_cost)} />
            {Number(order.bumps_total || 0) > 0 ? <SummaryRow label="Order bump" value={formatCurrency(order.bumps_total)} /> : null}
            <div className="border-t border-border pt-3">
              <SummaryRow label="Total" value={formatCurrency(order.total)} emphasized />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
