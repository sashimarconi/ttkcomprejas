import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const RETENTION_DAYS = 2;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffISO = cutoffDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // Find dates that need aggregation (older than retention, not yet summarized)
    const { data: existingSummaries } = await supabase
      .from("daily_analytics_summary")
      .select("summary_date");
    const summarizedDates = new Set(
      (existingSummaries || []).map((s: any) => s.summary_date)
    );

    // Get distinct dates from page_events that need aggregation
    const { data: eventDates } = await supabase
      .from("page_events")
      .select("created_at")
      .lt("created_at", cutoffISO + "T00:00:00Z")
      .order("created_at", { ascending: true })
      .limit(1);

    if (!eventDates || eventDates.length === 0) {
      return new Response(
        JSON.stringify({ message: "No old data to aggregate" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process day by day
    const oldestDate = new Date(eventDates[0].created_at);
    const results: string[] = [];
    const currentDate = new Date(
      oldestDate.getFullYear(),
      oldestDate.getMonth(),
      oldestDate.getDate()
    );

    while (currentDate.toISOString().split("T")[0] < cutoffISO) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayStart = `${dateStr}T00:00:00Z`;
      const dayEnd = `${dateStr}T23:59:59.999Z`;

      if (!summarizedDates.has(dateStr)) {
        // Fetch all events for this day with pagination
        let allEvents: any[] = [];
        let page = 0;
        const pageSize = 1000;
        while (true) {
          const { data } = await supabase
            .from("page_events")
            .select("session_id, event_type, page_url")
            .gte("created_at", dayStart)
            .lte("created_at", dayEnd)
            .range(page * pageSize, (page + 1) * pageSize - 1);
          if (!data || data.length === 0) break;
          allEvents = allEvents.concat(data);
          if (data.length < pageSize) break;
          page++;
        }

        // Fetch sessions for this day
        let allSessions: any[] = [];
        page = 0;
        while (true) {
          const { data } = await supabase
            .from("visitor_sessions")
            .select("session_id, city, region, country")
            .gte("created_at", dayStart)
            .lte("created_at", dayEnd)
            .eq("has_interaction", true)
            .range(page * pageSize, (page + 1) * pageSize - 1);
          if (!data || data.length === 0) break;
          allSessions = allSessions.concat(data);
          if (data.length < pageSize) break;
          page++;
        }

        // Fetch orders for this day
        const { data: orders } = await supabase
          .from("orders")
          .select("id, total, payment_status")
          .gte("created_at", dayStart)
          .lte("created_at", dayEnd);

        const uniqueSessions = new Set(
          allSessions.map((s: any) => s.session_id)
        );
        const pageViews = allEvents.filter(
          (e: any) => e.event_type === "page_view"
        ).length;
        const checkoutViews = allEvents.filter(
          (e: any) => e.event_type === "checkout_view"
        ).length;
        const pixGenerated = allEvents.filter(
          (e: any) => e.event_type === "pix_generated"
        ).length;

        const ordersList = orders || [];
        const paid = ordersList.filter(
          (o: any) =>
            o.payment_status === "paid" || o.payment_status === "approved"
        );
        const pending = ordersList.filter(
          (o: any) => o.payment_status === "pending"
        );
        const revenue = paid.reduce(
          (sum: number, o: any) => sum + Number(o.total),
          0
        );

        // Sessions by location
        const locationMap = new Map<string, number>();
        allSessions.forEach((s: any) => {
          const loc = [s.country, s.region, s.city]
            .filter(Boolean)
            .join(" - ");
          if (loc) locationMap.set(loc, (locationMap.get(loc) || 0) + 1);
        });
        const sessionsByLocation = Array.from(locationMap.entries())
          .map(([location, count]) => ({ location, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 50);

        // Pages visited
        const pageMap = new Map<string, number>();
        allEvents
          .filter((e: any) => e.event_type === "page_view" && e.page_url)
          .forEach((e: any) => {
            pageMap.set(
              e.page_url,
              (pageMap.get(e.page_url) || 0) + 1
            );
          });
        const pagesVisited = Array.from(pageMap.entries())
          .map(([page, count]) => ({ page, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 50);

        await supabase.from("daily_analytics_summary").upsert(
          {
            summary_date: dateStr,
            page_views: pageViews,
            unique_visitors: uniqueSessions.size,
            checkout_views: checkoutViews,
            pix_generated: pixGenerated,
            paid_orders: paid.length,
            pending_orders: pending.length,
            revenue,
            sessions_by_location: sessionsByLocation,
            pages_visited: pagesVisited,
          },
          { onConflict: "summary_date" }
        );

        results.push(
          `${dateStr}: ${pageViews} views, ${uniqueSessions.size} visitors, ${checkoutViews} checkouts, ${paid.length} paid`
        );
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Delete old raw data
    const { count: deletedEvents } = await supabase
      .from("page_events")
      .delete({ count: "exact" })
      .lt("created_at", cutoffISO + "T00:00:00Z");

    const { count: deletedSessions } = await supabase
      .from("visitor_sessions")
      .delete({ count: "exact" })
      .lt("created_at", cutoffISO + "T00:00:00Z");

    return new Response(
      JSON.stringify({
        message: "Cleanup complete",
        aggregated: results,
        deleted_events: deletedEvents,
        deleted_sessions: deletedSessions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
