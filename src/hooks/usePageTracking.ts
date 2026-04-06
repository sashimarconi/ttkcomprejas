import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

function getSessionId() {
  let sid = sessionStorage.getItem("visitor_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("visitor_session_id", sid);
  }
  return sid;
}

interface GeoData {
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  ip: string;
}

let cachedGeo: GeoData | null = null;
let geoPromise: Promise<GeoData | null> | null = null;

async function fetchGeoOnce(): Promise<GeoData | null> {
  if (cachedGeo) return cachedGeo;
  if (geoPromise) return geoPromise;

  geoPromise = (async () => {
    try {
      const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return null;
      const data = await res.json();
      cachedGeo = {
        city: data.city || "",
        region: data.region || "",
        country: data.country_name || "",
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        ip: data.ip || "",
      };
      return cachedGeo;
    } catch {
      return null;
    }
  })();

  return geoPromise;
}

// Check if current IP is blocked
let blockedCheckDone = false;
let isBlocked = false;

async function checkBlocked(ip: string): Promise<boolean> {
  if (blockedCheckDone) return isBlocked;
  try {
    const { data } = await supabase
      .from("blocked_ips")
      .select("id")
      .eq("ip", ip)
      .limit(1) as any;
    isBlocked = !!(data && data.length > 0);
  } catch {
    isBlocked = false;
  }
  blockedCheckDone = true;
  return isBlocked;
}

export function usePageTracking(eventType: string = "page_view", metadata?: Record<string, unknown>) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    const sessionId = getSessionId();
    const pageUrl = window.location.pathname;

    // Skip admin pages
    if (pageUrl.startsWith("/admin")) return;

    fetchGeoOnce().then(async (geo) => {
      // Check if IP is blocked
      if (geo?.ip) {
        const blocked = await checkBlocked(geo.ip);
        if (blocked) {
          document.body.innerHTML = "";
          return;
        }
      }

      // Track event
      supabase.from("page_events").insert({
        event_type: eventType,
        page_url: pageUrl,
        session_id: sessionId,
        metadata: metadata || {},
      } as any).then();

      // Upsert visitor session with geo + IP
      const sessionData: any = {
        session_id: sessionId,
        last_seen_at: new Date().toISOString(),
        page_url: pageUrl,
      };
      if (geo) {
        sessionData.city = geo.city;
        sessionData.region = geo.region;
        sessionData.country = geo.country;
        sessionData.latitude = geo.latitude;
        sessionData.longitude = geo.longitude;
        sessionData.ip = geo.ip;
      }
      supabase.from("visitor_sessions").upsert(sessionData, { onConflict: "session_id" }).then();
    });
  }, [eventType, metadata]);
}

export function trackEvent(eventType: string, metadata?: Record<string, unknown>) {
  const sessionId = getSessionId();
  return supabase.from("page_events").insert({
    event_type: eventType,
    page_url: window.location.pathname,
    session_id: sessionId,
    metadata: metadata || {},
  } as any);
}

// Heartbeat to keep session alive
export function useVisitorHeartbeat() {
  useEffect(() => {
    const sessionId = getSessionId();
    const interval = setInterval(() => {
      supabase.from("visitor_sessions").upsert(
        { session_id: sessionId, last_seen_at: new Date().toISOString(), page_url: window.location.pathname },
        { onConflict: "session_id" }
      ).then();
    }, 30000);

    return () => clearInterval(interval);
  }, []);
}
