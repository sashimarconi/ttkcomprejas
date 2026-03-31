import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAID_STATUS_TOKENS = new Set([
  "paid",
  "approved",
  "completed",
  "complete",
  "success",
  "succeeded",
  "confirmed",
  "confirmado",
  "payment_received",
  "pix_paid",
  "received",
  "recebido",
]);

const PAID_EVENT_TOKENS = new Set([
  "payment.paid",
  "payment_paid",
  "payment_confirmed",
  "payment.confirmed",
  "payment_received",
  "payment.received",
  "payment_approved",
  "payment.approved",
  "transaction.paid",
  "transaction_paid",
  "pix_paid",
  "pix.received",
  "pix_received",
]);

function normalizeToken(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function extractTransactionId(body: any) {
  return firstString(
    body?.transactionId,
    body?.transaction_id,
    body?.id,
    body?.paymentId,
    body?.payment_id,
    body?.data?.transactionId,
    body?.data?.transaction_id,
    body?.data?.id,
    body?.data?.paymentId,
    body?.data?.payment_id,
    body?.transaction?.id,
    body?.transaction?.transactionId,
    body?.transaction?.transaction_id,
    body?.payment?.id,
    body?.payment?.transactionId,
    body?.payment?.transaction_id,
    body?.charge?.id,
    body?.resource?.id,
    body?.data?.transaction?.id,
    body?.data?.payment?.id,
  );
}

function isPaidPayload(body: any) {
  const candidates = [
    body?.event,
    body?.type,
    body?.status,
    body?.payment_status,
    body?.paymentStatus,
    body?.transaction_status,
    body?.transactionStatus,
    body?.data?.event,
    body?.data?.type,
    body?.data?.status,
    body?.data?.payment_status,
    body?.data?.paymentStatus,
    body?.data?.transaction_status,
    body?.data?.transactionStatus,
    body?.payment?.status,
    body?.transaction?.status,
    body?.transaction?.payment_status,
    body?.charge?.status,
    body?.pix?.status,
    body?.data?.payment?.status,
    body?.data?.transaction?.status,
    body?.data?.charge?.status,
    body?.data?.pix?.status,
  ]
    .map(normalizeToken)
    .filter(Boolean);

  return candidates.some((token) => PAID_EVENT_TOKENS.has(token) || PAID_STATUS_TOKENS.has(token));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    const transactionId = extractTransactionId(body);
    const isPaid = isPaidPayload(body);

    if (!transactionId) {
      console.error("Could not extract transaction ID from webhook:", JSON.stringify(body));
      return new Response(
        JSON.stringify({ error: "Transaction ID not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Transaction: ${transactionId}, isPaid: ${isPaid}`);

    if (isPaid) {
      let { data: order, error } = await supabase
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("transaction_id", transactionId)
        .select("id")
        .maybeSingle();

      if ((!order || error) && isUuid(transactionId)) {
        const fallback = await supabase
          .from("orders")
          .update({ payment_status: "paid" })
          .eq("id", transactionId)
          .select("id")
          .maybeSingle();

        order = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.error("Error updating order:", error);
      } else if (order) {
        console.log(`Order ${order.id} marked as paid`);
      } else {
        console.warn(`No order matched transaction ${transactionId}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, transactionId, isPaid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
