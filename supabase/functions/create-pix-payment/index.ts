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

    // Get gateway settings
    const { data: gateway, error: gwError } = await supabase
      .from("gateway_settings")
      .select("*")
      .eq("active", true)
      .eq("gateway_name", "blackcatpay")
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

    // Call BlackCatPay API
    const paymentRes = await fetch("https://api.blackcatpay.com.br/api/sales/create-sale", {
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
      }),
    });

    const paymentData = await paymentRes.json();

    if (!paymentRes.ok) {
      console.error("BlackCatPay error:", JSON.stringify(paymentData));
      return new Response(
        JSON.stringify({ error: "Erro no gateway de pagamento", details: paymentData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save order
    const { error: orderError } = await supabase.from("orders").insert({
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
      transaction_id: paymentData.data?.transactionId,
      pix_qr_code: paymentData.data?.paymentData?.qrCode,
      pix_copy_paste: paymentData.data?.paymentData?.copyPaste,
      pix_qr_code_base64: paymentData.data?.paymentData?.qrCodeBase64,
      pix_expires_at: paymentData.data?.paymentData?.expiresAt,
      selected_bumps: body.selectedBumps,
    });

    if (orderError) {
      console.error("Order save error:", orderError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: paymentData.data?.transactionId,
        paymentData: paymentData.data?.paymentData,
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
