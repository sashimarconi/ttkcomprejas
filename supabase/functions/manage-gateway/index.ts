import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ACTION_LABELS: Record<string, string> = {
  save_keys: "🔑 Chaves alteradas",
  activate: "✅ Gateway ativado",
  save_and_activate: "🔑✅ Chaves salvas e gateway ativado",
};

async function notifyGatewayChange(supabaseUrl: string, serviceKey: string, action: string, gatewayName: string, ip: string) {
  try {
    const label = ACTION_LABELS[action] || `⚙️ ${action}`;
    await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        title: "⚠️ Alerta de Segurança",
        body: `${label} — ${gatewayName.toUpperCase()} (IP: ${ip})`,
        url: "/ctrl9k/gateways",
        event_type: "order_paid",
      }),
    });
  } catch (e) {
    console.error("Gateway push notification error:", e);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user-level client to verify identity
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, pin, gateway_name, public_key, secret_key } = body;

    if (!pin || typeof pin !== "string" || pin.length !== 6) {
      return new Response(JSON.stringify({ error: "PIN obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify PIN server-side using service role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: pinValid, error: pinError } = await adminClient.rpc(
      "verify_admin_pin_for_user",
      { p_user_id: user.id, p_pin: pin }
    );

    if (pinError || !pinValid) {
      return new Response(JSON.stringify({ error: "PIN incorreto" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (action === "save_keys") {
      if (!gateway_name) {
        return new Response(
          JSON.stringify({ error: "gateway_name obrigatório" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if exists
      const { data: existing } = await adminClient
        .from("gateway_settings")
        .select("id")
        .eq("gateway_name", gateway_name)
        .maybeSingle();

      if (existing) {
        const { error: updateErr } = await adminClient
          .from("gateway_settings")
          .update({
            public_key: public_key || "",
            secret_key: secret_key || "",
          })
          .eq("id", existing.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await adminClient
          .from("gateway_settings")
          .insert({
            gateway_name,
            public_key: public_key || "",
            secret_key: secret_key || "",
            active: false,
          });
        if (insertErr) throw insertErr;
      }

      await notifyGatewayChange(supabaseUrl, supabaseServiceKey, "save_keys", gateway_name, clientIp);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "activate") {
      if (!gateway_name) {
        return new Response(
          JSON.stringify({ error: "gateway_name obrigatório" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check gateway has keys
      const { data: gw } = await adminClient
        .from("gateway_settings")
        .select("id, public_key, secret_key")
        .eq("gateway_name", gateway_name)
        .maybeSingle();

      if (!gw || (!gw.public_key && !gw.secret_key)) {
        return new Response(
          JSON.stringify({ error: "Configure as chaves antes de ativar" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Deactivate all others
      await adminClient
        .from("gateway_settings")
        .update({ active: false })
        .neq("gateway_name", gateway_name);

      // Activate this one
      const { error: activateErr } = await adminClient
        .from("gateway_settings")
        .update({ active: true })
        .eq("gateway_name", gateway_name);
      if (activateErr) throw activateErr;

      await notifyGatewayChange(supabaseUrl, supabaseServiceKey, "activate", gateway_name, clientIp);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save_and_activate") {
      if (!gateway_name) {
        return new Response(
          JSON.stringify({ error: "gateway_name obrigatório" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Deactivate all others
      await adminClient
        .from("gateway_settings")
        .update({ active: false })
        .neq("gateway_name", gateway_name);

      const { data: existing } = await adminClient
        .from("gateway_settings")
        .select("id")
        .eq("gateway_name", gateway_name)
        .maybeSingle();

      if (existing) {
        const { error: updateErr } = await adminClient
          .from("gateway_settings")
          .update({
            public_key: public_key || "",
            secret_key: secret_key || "",
            active: true,
          })
          .eq("id", existing.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await adminClient
          .from("gateway_settings")
          .insert({
            gateway_name,
            public_key: public_key || "",
            secret_key: secret_key || "",
            active: true,
          });
        if (insertErr) throw insertErr;
      }

      await notifyGatewayChange(supabaseUrl, supabaseServiceKey, "save_and_activate", gateway_name, clientIp);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("manage-gateway error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno", details: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
