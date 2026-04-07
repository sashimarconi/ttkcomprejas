import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getFingerprint, getBotScore, useHumanInteractionTracker } from "./useBotDetection";

function getSessionId() {
  let sid = sessionStorage.getItem("visitor_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("visitor_session_id", sid);
  }
  return sid;
}

// Known bot user-agents
const BOT_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
  /googlebot/i, /bingbot/i, /yandex/i, /baidu/i, /duckduckbot/i,
  /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
  /whatsapp/i, /telegrambot/i, /discordbot/i,
  /ahrefsbot/i, /semrushbot/i, /mj12bot/i, /dotbot/i,
  /rogerbot/i, /seznambot/i, /ia_archiver/i,
  /headlesschrome/i, /phantomjs/i, /puppeteer/i,
  /python-requests/i, /python-urllib/i, /curl\//i, /wget\//i,
  /httpclient/i, /java\//i, /libwww/i, /lwp-trivial/i,
  /go-http-client/i, /node-fetch/i, /axios/i,
];

function isBotByUA(): boolean {
  const ua = navigator.userAgent;
  if (!ua || ua.length < 10) return false;
  return BOT_PATTERNS.some(p => p.test(ua));
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
let isBlockedResult = false;

async function checkBlocked(ip: string): Promise<boolean> {
  if (blockedCheckDone) return isBlockedResult;
  try {
    const { data } = await supabase
      .from("blocked_ips")
      .select("id")
      .eq("ip", ip)
      .limit(1) as any;
    isBlockedResult = !!(data && data.length > 0);
  } catch {
    isBlockedResult = false;
  }
  blockedCheckDone = true;
  return isBlockedResult;
}

export function usePageTracking(eventType: string = "page_view", metadata?: Record<string, unknown>) {
  const tracked = useRef(false);
  const sessionId = getSessionId();

  // Track human interactions (mouse, touch, scroll, click, keyboard)
  useHumanInteractionTracker(sessionId);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    const pageUrl = window.location.pathname;

    // Skip admin pages
    if (pageUrl.startsWith("/admin")) return;

    // Detect bot by user-agent
    const botByUA = isBotByUA();
    const fingerprint = getFingerprint();
    const botScore = getBotScore();

    // Final bot determination: UA match OR high bot score
    const isBot = botByUA || botScore >= 50;

    fetchGeoOnce().then(async (geo) => {
      // Check if IP is manually blocked
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

      // Upsert visitor session with all detection data
      const sessionData: Record<string, unknown> = {
        session_id: sessionId,
        last_seen_at: new Date().toISOString(),
        page_url: pageUrl,
        is_bot: isBot,
        user_agent: navigator.userAgent || null,
        fingerprint_hash: fingerprint,
        bot_score: botScore,
      };
      if (geo) {
        sessionData.city = geo.city;
        sessionData.region = geo.region;
        sessionData.country = geo.country;
        sessionData.latitude = geo.latitude;
        sessionData.longitude = geo.longitude;
        sessionData.ip = geo.ip;
      }
      supabase.from("visitor_sessions").upsert(sessionData as any, { onConflict: "session_id" }).then();
    });
  }, [eventType, metadata, sessionId]);
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
    if (!cachedGeo?.ip) return;

    const sessionId = getSessionId();
    const interval = setInterval(() => {
      supabase.from("visitor_sessions").upsert(
        { session_id: sessionId, last_seen_at: new Date().toISOString(), page_url: window.location.pathname } as any,
        { onConflict: "session_id" }
      ).then();
    }, 30000);

    return () => clearInterval(interval);
  }, []);
}
