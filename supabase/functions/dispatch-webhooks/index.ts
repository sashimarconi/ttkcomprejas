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

    const { event, payload } = await req.json();
    if (!event || !payload) {
      return new Response(
        JSON.stringify({ error: "Missing event or payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Dispatching webhook event: ${event}`);

    // Get all active webhooks that listen to this event
    const { data: webhooks, error } = await supabase
      .from("webhooks")
      .select("*")
      .eq("active", true);

    if (error) {
      console.error("Error fetching webhooks:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch webhooks" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const matching = (webhooks || []).filter((wh: any) => {
      const events = Array.isArray(wh.events) ? wh.events : [];
      return events.includes(event);
    });

    console.log(`Found ${matching.length} webhooks for event ${event}`);

    // Fire all webhooks in parallel (fire-and-forget style, but we await)
    const results = await Promise.allSettled(
      matching.map(async (wh: any) => {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (wh.secret_key) {
          headers["X-Webhook-Secret"] = wh.secret_key;
        }

        const body = JSON.stringify({
          event,
          timestamp: new Date().toISOString(),
          data: payload,
        });

        const response = await fetch(wh.url, {
          method: "POST",
          headers,
          body,
        });

        console.log(`Webhook ${wh.name} (${wh.url}): ${response.status}`);
        return { id: wh.id, name: wh.name, status: response.status };
      })
    );

    const summary = results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return { id: matching[i]?.id, name: matching[i]?.name, error: String(r.reason) };
    });

    return new Response(
      JSON.stringify({ success: true, event, dispatched: summary.length, results: summary }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Dispatch error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
