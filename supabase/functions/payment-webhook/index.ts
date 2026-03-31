import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Try to extract transaction ID and status from different gateway formats
    let transactionId: string | null = null;
    let isPaid = false;

    // Check event-level flags first
    if (body.event === "payment.paid" || body.event === "payment_confirmed" || body.event === "transaction.paid" || body.event === "PAYMENT_RECEIVED") {
      isPaid = true;
    }

    // BlackCatPay format - various field names
    if (body.transactionId) {
      transactionId = body.transactionId;
      if (!isPaid) isPaid = body.status === "paid" || body.status === "approved" || body.status === "completed";
    }
    if (body.data?.transactionId) {
      transactionId = body.data.transactionId;
      if (!isPaid) isPaid = body.data.status === "paid" || body.data.status === "approved" || body.data.status === "completed" || body.status === "paid";
    }

    // GhostsPay format
    if (!transactionId && body.id && body.payment_status) {
      transactionId = body.id;
      if (!isPaid) isPaid = body.payment_status === "paid" || body.payment_status === "approved" || body.payment_status === "completed";
    }
    if (!transactionId && body.data?.id) {
      transactionId = body.data.id;
      const s = body.data.payment_status || body.data.status;
      if (!isPaid && s) isPaid = s === "paid" || s === "approved" || s === "completed";
    }

    // Duck format
    if (!transactionId && body.transaction_id) {
      transactionId = body.transaction_id;
      if (!isPaid) isPaid = body.status === "paid" || body.status === "approved" || body.status === "completed";
    }
    if (!transactionId && body.data?.transaction_id) {
      transactionId = body.data.transaction_id;
      const s = body.data?.status || body.status;
      if (!isPaid && s) isPaid = s === "paid" || s === "approved" || s === "completed";
    }

    // Fallback: try common patterns
    if (!transactionId) {
      transactionId = body.transaction_id || body.transactionId || body.id || body.data?.transaction_id || body.data?.transactionId || body.data?.id || null;
    }

    if (!transactionId) {
      console.error("Could not extract transaction ID from webhook:", JSON.stringify(body));
      return new Response(
        JSON.stringify({ error: "Transaction ID not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Transaction: ${transactionId}, isPaid: ${isPaid}`);

    if (isPaid) {
      const { data: order, error } = await supabase
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("transaction_id", transactionId)
        .select("id")
        .single();

      if (error) {
        console.error("Error updating order:", error);
        // Try without .single() in case no match
        const { error: error2 } = await supabase
          .from("orders")
          .update({ payment_status: "paid" })
          .eq("transaction_id", transactionId);
        if (error2) console.error("Retry error:", error2);
      } else {
        console.log(`Order ${order.id} marked as paid`);
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
