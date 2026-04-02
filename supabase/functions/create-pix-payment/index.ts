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
      data.transaction_id, data.data?.transaction_id, data.data?.transactionId,
      data.id, data.data?.id, data.payment_id,
    ),
    qrCode: pickString(
      toAbsoluteUrl("https://ghostspaysv1.com", pix.qr_code_url),
      toAbsoluteUrl("https://ghostspaysv1.com", pix.qr_code_image),
      pix.qrCode, pix.code,
    ),
    copyPaste: pickString(pix.code, pix.copyPaste, pix.qrCode, data.pix_code),
    qrCodeBase64: pickString(pix.qrCodeBase64, pix.qr_code_base64),
    expiresAt: pickString(pix.expiration_date, pix.expiresAt),
  };
}

async function callDuck(gateway: any, body: any, items: any[], webhookUrl: string) {
  const identifier = `${Date.now()}${Math.random().toString(36).slice(2, 16).toUpperCase()}`;

  const products = items.map((item, idx) => ({
    id: `prod_${idx}`,
    name: item.title,
    quantity: item.quantity,
    price: item.unitPrice / 100,
  }));

  const res = await fetch("https://api.duckoficial.com/api/v1/gateway/pix/receive", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-secret-key": gateway.secret_key,
      "x-public-key": gateway.public_key,
    },
    body: JSON.stringify({
      identifier,
      amount: body.amount / 100,
      client: {
        name: body.customerName,
        email: body.customerEmail,
        phone: body.customerPhone.replace(/\D/g, ""),
        document: body.customerDocument.replace(/\D/g, ""),
      },
      products,
      callbackUrl: webhookUrl,
      metadata: {
        source: "lovable_checkout",
      },
    }),
  });
  const data = await res.json();
  console.log("Duck response:", JSON.stringify(data));
  if (!res.ok) throw { status: res.status, data };

  const pix = data.pix ?? {};

  return {
    transactionId: pickString(data.transactionId, data.order?.id),
    qrCode: pickString(pix.image),
    copyPaste: pickString(pix.code),
    qrCodeBase64: pickString(pix.base64),
    expiresAt: null,
  };
}

async function callHisoUnique(gateway: any, body: any, items: any[], webhookUrl: string) {
  // Hiso Unique uses Basic Auth: Base64(PUBLIC_KEY:SECRET_KEY)
  const authToken = btoa(`${gateway.public_key}:${gateway.secret_key}`);
  
  const res = await fetch("https://api.hiso.com.br/v1/payment-transaction/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "accept": "application/json",
      "Authorization": `Basic ${authToken}`,
    },
    body: JSON.stringify({
      amount: body.amount, // in cents
      payment_method: "pix",
      postback_url: webhookUrl,
      customer: {
        name: body.customerName,
        email: body.customerEmail,
        phone: body.customerPhone.replace(/\D/g, ""),
        document: body.customerDocument.replace(/\D/g, ""),
      },
      items: items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tangible: false,
      })),
      pix: {
        expires_in_minutes: 30,
      },
      metadata: {
        provider_name: "Lovable Checkout",
      },
    }),
  });
  const data = await res.json();
  console.log("HiSo response:", JSON.stringify(data));
  if (!res.ok) throw { status: res.status, data };

  // HiSo webhook format has Id, Status fields
  // Response likely has transaction id and pix data
  const txn = data.data ?? data.transaction ?? data;
  const pix = txn?.pix ?? txn?.paymentData ?? txn;

  return {
    transactionId: pickString(
      txn?.Id, txn?.id, txn?.transactionId, txn?.transaction_id,
      data?.Id, data?.id, data?.transactionId, data?.transaction_id,
    ),
    qrCode: pickString(
      pix?.qrCode, pix?.qr_code, pix?.qrCodeUrl, pix?.qr_code_url,
    ),
    copyPaste: pickString(
      pix?.copyPaste, pix?.copy_paste, pix?.code,
      pix?.qrCode, pix?.qr_code,
      pix?.pixCode, pix?.pix_code,
    ),
    qrCodeBase64: pickString(
      pix?.qrCodeBase64, pix?.qr_code_base64,
    ),
    expiresAt: pickString(
      pix?.expiresAt, pix?.expires_at, pix?.expiration_date,
    ),
  };
}

async function callParadise(gateway: any, body: any, _items: any[], webhookUrl: string) {
  // Paradise uses X-API-Key header, amount in centavos
  const reference = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const res = await fetch("https://multi.paradisepags.com/api/v1/transaction.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": gateway.secret_key,
    },
    body: JSON.stringify({
      amount: body.amount, // centavos
      description: body.productTitle,
      reference,
      source: "api_externa", // skip productHash validation
      postback_url: webhookUrl,
      customer: {
        name: body.customerName,
        email: body.customerEmail,
        document: body.customerDocument.replace(/\D/g, ""),
        phone: body.customerPhone.replace(/\D/g, ""),
      },
    }),
  });
  const data = await res.json();
  console.log("Paradise response:", JSON.stringify(data));
  if (!res.ok && data?.status !== "success") throw { status: res.status, data };

  // Response: { status:"success", transaction_id:238, id:"REF", qr_code:"EMV...", qr_code_base64:"data:image/png;base64,...", amount, expires_at }
  return {
    transactionId: pickString(data?.transaction_id, data?.id, reference),
    qrCode: null, // qr_code is EMV string not image URL
    copyPaste: pickString(data?.qr_code, data?.pix_code),
    qrCodeBase64: pickString(data?.qr_code_base64),
    expiresAt: pickString(data?.expires_at),
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
        case "hisounique":
          paymentResult = await callHisoUnique(gateway, body, items, webhookUrl);
          break;
        case "paradise":
          paymentResult = await callParadise(gateway, body, items, webhookUrl);
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

    // Sanitize expiresAt
    let safeExpiresAt: string | null = null;
    if (paymentResult.expiresAt) {
      const parsedDate = new Date(paymentResult.expiresAt);
      const maxExpiry = Date.now() + 30 * 60 * 1000;
      if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 2000) {
        safeExpiresAt = parsedDate.getTime() > maxExpiry
          ? new Date(maxExpiry).toISOString()
          : parsedDate.toISOString();
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

    // Dispatch order_created webhook
    if (orderData?.id) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/dispatch-webhooks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            event: "order_created",
            payload: {
              order_id: orderData.id,
              transaction_id: paymentResult.transactionId,
              customer_name: body.customerName,
              customer_email: body.customerEmail,
              customer_phone: body.customerPhone,
              customer_document: body.customerDocument,
              total: body.amount / 100,
              product_id: body.productId,
              product_variant: body.productVariant || null,
              payment_method: "pix",
              selected_bumps: body.selectedBumps,
            },
          }),
        });
      } catch (whErr) {
        console.error("Webhook dispatch error:", whErr);
      }

      // Send push notification for pending order
      try {
        const totalFormatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(body.amount / 100);
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            title: "🔔 PIX gerado!",
            body: `${body.customerName} - ${totalFormatted}`,
            url: "/admin/orders",
            event_type: "order_pending",
          }),
        });
      } catch (pushErr) {
        console.error("Push notification error:", pushErr);
      }
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
