import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildVisitorFingerprint,
  getVisitorSessionId,
  hasVerifiedHumanSession,
  isBotEnvironment,
  markVerifiedHumanSession,
  onFirstHumanInteraction,
} from "@/lib/visitor-verification";

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

function isDuplicateSessionWriteError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() || "";
  return error.code === "23505" || message.includes("duplicate key");
}

async function upsertVerifiedSession(pageUrl: string) {
  const geo = await fetchGeoOnce();
  const sessionId = getVisitorSessionId();
  const sessionData: any = {
    session_id: sessionId,
    last_seen_at: new Date().toISOString(),
    page_url: pageUrl,
    user_agent: navigator.userAgent,
    fingerprint_hash: buildVisitorFingerprint(),
    has_interaction: true,
    is_bot: false,
    bot_score: 0,
  };

  if (geo) {
    sessionData.city = geo.city;
    sessionData.region = geo.region;
    sessionData.country = geo.country;
    sessionData.latitude = geo.latitude;
    sessionData.longitude = geo.longitude;
  }

  const { error: insertError } = await supabase.from("visitor_sessions").insert(sessionData);
  if (!insertError) return sessionId;

  if (isDuplicateSessionWriteError(insertError)) {
    const { session_id: _sessionId, ...sessionUpdateData } = sessionData;
    const { error: updateError } = await supabase
      .from("visitor_sessions")
      .update(sessionUpdateData)
      .eq("session_id", sessionId);

    if (!updateError) return sessionId;
    console.error("Failed to update visitor session", updateError);
    return sessionId;
  }

  console.error("Failed to insert visitor session", insertError);
  return sessionId;
}

async function trackVerifiedEvent(eventType: string, pageUrl: string, metadata?: Record<string, unknown>) {
  const sessionId = await upsertVerifiedSession(pageUrl);
  return supabase.from("page_events").insert({
    event_type: eventType,
    page_url: pageUrl,
    session_id: sessionId,
    metadata: metadata || {},
  } as any);
}

export function usePageTracking(eventType: string = "page_view", metadata?: Record<string, unknown>) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current || isBotEnvironment()) return;
    tracked.current = true;

    const pageUrl = window.location.pathname;
    const runTracking = () => {
      void trackVerifiedEvent(eventType, pageUrl, metadata);
    };

    if (hasVerifiedHumanSession()) {
      runTracking();
      return;
    }

    return onFirstHumanInteraction(runTracking);
  }, [eventType, metadata]);
}

export function trackEvent(eventType: string, metadata?: Record<string, unknown>) {
  if (isBotEnvironment()) return Promise.resolve(null);
  markVerifiedHumanSession();
  return trackVerifiedEvent(eventType, window.location.pathname, metadata);
}

export function useVisitorHeartbeat() {
  useEffect(() => {
    if (isBotEnvironment()) return;

    let intervalId: number | null = null;
    let cleanupInteraction: (() => void) | undefined;

    const startHeartbeat = () => {
      if (intervalId !== null) return;

      const beat = () => {
        void upsertVerifiedSession(window.location.pathname);
      };

      beat();
      intervalId = window.setInterval(beat, 30000);
    };

    if (hasVerifiedHumanSession()) {
      startHeartbeat();
    } else {
      cleanupInteraction = onFirstHumanInteraction(startHeartbeat);
    }

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      cleanupInteraction?.();
    };
  }, []);
}
