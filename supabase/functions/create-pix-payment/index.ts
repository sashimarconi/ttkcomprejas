import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  productId: z.string().uuid(),
  productTitle: z.string().min(1).max(500),
  productVariant: z.string().max(255).nullable().optional(),
  quantity: z.number().int().min(1).max(100),
  amount: z.number().int().min(1),
  customerName: z.string().min(1).max(255),
  customerEmail: z.string().email().max(255),
  customerPhone: z.string().min(8).max(20),
  customerDocument: z.string().min(11).max(14),
  shippingOptionId: z.string().uuid().nullable().optional(),
  shippingCost: z.number().int().min(0).optional(),
  selectedBumps: z
    .array(
      z.object({
        id: z.string().uuid(),
        title: z.string(),
        price: z.number().int().min(0),
      })
    )
    .optional()
    .default([]),
});

function getWebhookFields(webhookUrl: string) {
  return {
    webhookUrl,
    webhook_url: webhookUrl,
    callbackUrl: webhookUrl,
    callback_url: webhookUrl,
    notificationUrl: webhookUrl,
    notification_url: webhookUrl,
    post_back_url: webhookUrl,
    postbackUrl: webhookUrl,
    postback_url: webhookUrl,
  };
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function toAbsoluteUrl(baseUrl: string, value?: string | null) {
  if (!value?.trim()) return null;

  const normalized = value.trim();
  if (/^https?:\/\//i.test(normalized)) return normalized;

  const base = baseUrl.replace(/\/+$/, "");
  const path = normalized.startsWith("/") ? normalized : `/${normalized.replace(/^\/+/, "")}`;
  return `${base}${path}`;
}

// ─── Gateway-specific payment callers ───

async function callBlackCatPay(gateway: any, body: any, items: any[], webhookUrl: string) {
  const webhookFields = getWebhookFields(webhookUrl);
  const res = await fetch("https://api.blackcatpay.com.br/api/sales/create-sale", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": gateway.secret_key,
    },
    body: JSON.stringify({
      amount: body.amount,
      currency: "BRL",
      paymentMethod: "pix",
      items,
      customer: {
        name: body.customerName,
        email: body.customerEmail,
        phone: body.customerPhone.replace(/\D/g, ""),
        document: {
          number: body.customerDocument.replace(/\D/g, ""),
          type: body.customerDocument.replace(/\D/g, "").length <= 11 ? "cpf" : "cnpj",
        },
      },
      pix: { expiresInDays: 1 },
      ...webhookFields,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return {
    transactionId: data.data?.transactionId,
    qrCode: data.data?.paymentData?.qrCode,
    copyPaste: data.data?.paymentData?.copyPaste,
    qrCodeBase64: data.data?.paymentData?.qrCodeBase64,
    expiresAt: data.data?.paymentData?.expiresAt,
  };
}

async function callGhostsPay(gateway: any, body: any, items: any[], webhookUrl: string) {
  const webhookFields = getWebhookFields(webhookUrl);
  const products = items.map((item) => ({
    product_name: item.title,
    quantity: item.quantity,
    value: item.unitPrice / 100,
  }));

  const res = await fetch("https://api.ghostspaysv1.com/api/generate-transaction", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Secret-Key": gateway.secret_key,
      "X-Public-Key": gateway.public_key,
    },
    body: JSON.stringify({
      client_name: body.customerName,
      client_email: body.customerEmail,
      client_document: body.customerDocument.replace(/\D/g, ""),
      client_mobile_phone: body.customerPhone.replace(/\D/g, ""),
      products,
      ...webhookFields,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };

  const pix = data.pix ?? data.data?.pix ?? {};

  return {
    transactionId: pickString(
      data.transaction_id,
      data.data?.transaction_id,
      data.data?.transactionId,
      data.id,
      data.data?.id,
      data.payment_id,
    ),
    qrCode: pickString(
      toAbsoluteUrl("https://ghostspaysv1.com", pix.qr_code_url),
      toAbsoluteUrl("https://ghostspaysv1.com", pix.qr_code_image),
      pix.qrCode,
      pix.code,
    ),
    copyPaste: pickString(
      pix.code,
      pix.copyPaste,
      pix.qrCode,
      data.pix_code,
    ),
    qrCodeBase64: pickString(
      pix.qrCodeBase64,
      pix.qr_code_base64,
    ),
    expiresAt: pickString(
      pix.expiration_date,
      pix.expiresAt,
    ),
  };
}

async function callDuck(gateway: any, body: any, items: any[], webhookUrl: string) {
  const webhookFields = getWebhookFields(webhookUrl);
  const res = await fetch("https://api.duckoficial.com/api/v1/gateway/pix/receive", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-secret-key": gateway.secret_key,
      "x-public-key": gateway.public_key,
    },
    body: JSON.stringify({
      amount: body.amount / 100,
      customer: {
        name: body.customerName,
        email: body.customerEmail,
        phone: body.customerPhone.replace(/\D/g, ""),
        document: body.customerDocument.replace(/\D/g, ""),
      },
      items: items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        unitPrice: item.unitPrice / 100,
      })),
      ...webhookFields,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return {
    transactionId: data.data?.transactionId || data.data?.id,
    qrCode: data.data?.pix?.qrCode || data.data?.paymentData?.qrCode,
    copyPaste: data.data?.pix?.copyPaste || data.data?.pix?.qrCode || data.data?.paymentData?.copyPaste,
    qrCodeBase64: data.data?.pix?.qrCodeBase64 || data.data?.paymentData?.qrCodeBase64,
    expiresAt: data.data?.pix?.expiresAt || data.data?.paymentData?.expiresAt,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get active gateway
    const { data: gateway, error: gwError } = await supabase
      .from("gateway_settings")
      .select("*")
      .eq("active", true)
      .limit(1)
      .single();

    if (gwError || !gateway?.secret_key) {
      return new Response(
        JSON.stringify({ error: "Gateway de pagamento não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build items
    const items = [
      {
        title: body.productTitle,
        unitPrice: Math.round(body.amount - (body.shippingCost || 0) - body.selectedBumps.reduce((s, b) => s + b.price, 0)),
        quantity: body.quantity,
        tangible: false,
      },
      ...body.selectedBumps.map((b) => ({
        title: b.title,
        unitPrice: b.price,
        quantity: 1,
        tangible: false,
      })),
    ];

    if (body.shippingCost && body.shippingCost > 0) {
      items.push({
        title: "Frete",
        unitPrice: body.shippingCost,
        quantity: 1,
        tangible: false,
      });
    }

    // Build webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/payment-webhook`;

    // Route to correct gateway
    let paymentResult;
    try {
      switch (gateway.gateway_name) {
        case "blackcatpay":
          paymentResult = await callBlackCatPay(gateway, body, items, webhookUrl);
          break;
        case "ghostspay":
          paymentResult = await callGhostsPay(gateway, body, items, webhookUrl);
          break;
        case "duck":
          paymentResult = await callDuck(gateway, body, items, webhookUrl);
          break;
        default:
          return new Response(
            JSON.stringify({ error: `Gateway desconhecido: ${gateway.gateway_name}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
      }
    } catch (err: any) {
      console.error(`${gateway.gateway_name} error:`, JSON.stringify(err.data || err));
      return new Response(
        JSON.stringify({ error: "Erro no gateway de pagamento", details: err.data }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize expiresAt - fallback to 30 min from now if invalid
    let safeExpiresAt: string | null = null;
    if (paymentResult.expiresAt) {
      const parsed = new Date(paymentResult.expiresAt);
      const maxExpiry = Date.now() + 30 * 60 * 1000;
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) {
        // Cap expiration at 30 minutes from now (some gateways return 30-day expiry)
        safeExpiresAt = parsed.getTime() > maxExpiry
          ? new Date(maxExpiry).toISOString()
          : parsed.toISOString();
      }
    }
    if (!safeExpiresAt) {
      safeExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    }

    // Save order
    const { data: orderData, error: orderError } = await supabase.from("orders").insert({
      product_id: body.productId,
      quantity: body.quantity,
      subtotal: body.amount / 100,
      shipping_cost: (body.shippingCost || 0) / 100,
      shipping_option_id: body.shippingOptionId || null,
      bumps_total: body.selectedBumps.reduce((s, b) => s + b.price, 0) / 100,
      total: body.amount / 100,
      customer_name: body.customerName,
      customer_email: body.customerEmail,
      customer_phone: body.customerPhone,
      customer_document: body.customerDocument,
      payment_method: "pix",
      payment_status: "pending",
      transaction_id: paymentResult.transactionId,
      pix_qr_code: paymentResult.qrCode,
      pix_copy_paste: paymentResult.copyPaste,
      pix_qr_code_base64: paymentResult.qrCodeBase64,
      pix_expires_at: safeExpiresAt,
      selected_bumps: body.selectedBumps,
      product_variant: body.productVariant || null,
    }).select("id").single();

    if (orderError) {
      console.error("Order save error:", orderError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: paymentResult.transactionId,
        paymentData: {
          qrCode: paymentResult.qrCode,
          copyPaste: paymentResult.copyPaste,
          qrCodeBase64: paymentResult.qrCodeBase64,
          expiresAt: safeExpiresAt,
        },
        orderId: orderData?.id || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
