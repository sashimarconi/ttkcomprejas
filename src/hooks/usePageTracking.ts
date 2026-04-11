import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const BOT_UA_PATTERN = /bot|crawl|spider|slurp|baidu|yandex|bing|google|facebook|twitter|linkedin|pinterest|whatsapp|telegram|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|anthropic|headless|phantom|selenium|puppeteer|playwright|wget|curl|httpie|python-requests|java\/|go-http|node-fetch|axios/i;

function isBot(): boolean {
  const ua = navigator.userAgent;
  if (!ua || ua.length < 10) return true;
  if (BOT_UA_PATTERN.test(ua)) return true;
  return false;
}

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
      };
      return cachedGeo;
    } catch {
      return null;
    }
  })();

  return geoPromise;
}

export function usePageTracking(eventType: string = "page_view", metadata?: Record<string, unknown>) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    // Skip tracking for bots
    if (isBot()) return;

    const sessionId = getSessionId();
    const pageUrl = window.location.pathname;

    // Track event
    supabase.from("page_events").insert({
      event_type: eventType,
      page_url: pageUrl,
      session_id: sessionId,
      metadata: metadata || {},
    } as any).then();

    // Upsert visitor session with geo data + user_agent
    fetchGeoOnce().then(geo => {
      const sessionData: any = {
        session_id: sessionId,
        last_seen_at: new Date().toISOString(),
        page_url: pageUrl,
        user_agent: navigator.userAgent,
        is_bot: false,
      };
      if (geo) {
        sessionData.city = geo.city;
        sessionData.region = geo.region;
        sessionData.country = geo.country;
        sessionData.latitude = geo.latitude;
        sessionData.longitude = geo.longitude;
      }
      supabase.from("visitor_sessions").upsert(sessionData, { onConflict: "session_id" }).then();
    });
  }, [eventType, metadata]);
}

export function trackEvent(eventType: string, metadata?: Record<string, unknown>) {
  if (isBot()) return Promise.resolve();
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
    if (isBot()) return;
    const sessionId = getSessionId();
    const interval = setInterval(() => {
      supabase.from("visitor_sessions").upsert(
        {
          session_id: sessionId,
          last_seen_at: new Date().toISOString(),
          page_url: window.location.pathname,
          user_agent: navigator.userAgent,
        },
        { onConflict: "session_id" }
      ).then();
    }, 30000);

    return () => clearInterval(interval);
  }, []);
}
