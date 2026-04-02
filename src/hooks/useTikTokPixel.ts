import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    TiktokAnalyticsObject?: string;
    ttq?: any;
  }
}

type QueuedTikTokEvent = {
  eventName: string;
  payload: Record<string, unknown>;
};

type TrackTikTokPurchaseOptions = {
  orderId?: string;
  contentId?: string;
  contentName?: string;
  quantity?: number;
  email?: string;
  phone?: string;
};

const activeTikTokPixelIds = new Set<string>();
const pixelConfigMap = new Map<string, { fire_on_paid_only: boolean }>();
const queuedTikTokEvents: QueuedTikTokEvent[] = [];
let tikTokLibraryLoaded = false;
let tikTokReadyHandlerRegistered = false;
let retryTimerActive = false;

function markTikTokLibraryLoaded() {
  if (tikTokLibraryLoaded) return;

  tikTokLibraryLoaded = true;
  console.log("[TikTok Pixel] Biblioteca carregada com sucesso.");
  flushQueuedTikTokEvents();
}

function registerTikTokReadyHandler(ttq: any) {
  if (!ttq || tikTokReadyHandlerRegistered || typeof ttq.ready !== "function") return;

  tikTokReadyHandlerRegistered = true;
  ttq.ready(() => {
    markTikTokLibraryLoaded();
  });
}

function getTikTokQueue() {
  if (typeof window === "undefined") return null;

  window.TiktokAnalyticsObject = "ttq";

  if (window.ttq?.methods) {
    registerTikTokReadyHandler(window.ttq);
    return window.ttq;
  }

  const ttq = (window.ttq = window.ttq || []);
  ttq.methods = [
    "page", "track", "identify", "instances", "debug", "on", "off",
    "once", "ready", "alias", "group", "enableCookie", "disableCookie",
  ];
  ttq.setAndDefer = function (t: any, e: string) {
    t[e] = function () {
      t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
    };
  };

  for (let i = 0; i < ttq.methods.length; i++) {
    ttq.setAndDefer(ttq, ttq.methods[i]);
  }

  ttq.instance = function (t: string) {
    const e = ttq._i[t] || [];
    for (let n = 0; n < ttq.methods.length; n++) {
      ttq.setAndDefer(e, ttq.methods[n]);
    }
    return e;
  };

  ttq.load = function (e: string, n?: any) {
    const r = "https://analytics.tiktok.com/i18n/pixel/events.js";
    ttq._i = ttq._i || {};
    ttq._i[e] = ttq._i[e] || [];
    ttq._i[e]._u = r;
    ttq._t = ttq._t || {};
    ttq._t[e] = +new Date();
    ttq._o = ttq._o || {};
    ttq._o[e] = n || {};

    const existingScript = document.querySelector(`script[data-tiktok-pixel-id="${e}"]`) as HTMLScriptElement | null;
    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        markTikTokLibraryLoaded();
      }
      return;
    }

    const o = document.createElement("script");
    o.type = "text/javascript";
    o.async = true;
    o.src = r + "?sdkid=" + e + "&lib=ttq";
    o.dataset.tiktokPixelId = e;
    o.dataset.loaded = "false";
    o.addEventListener("load", () => {
      o.dataset.loaded = "true";
      markTikTokLibraryLoaded();
    }, { once: true });
    o.addEventListener("error", () => {
      console.error("[TikTok Pixel] Falha ao carregar o script do pixel.", { pixelId: e });
    }, { once: true });

    const a = document.getElementsByTagName("script")[0];
    a?.parentNode?.insertBefore(o, a);
  };

  registerTikTokReadyHandler(ttq);
  return ttq;
}

function loadTikTokPixel(pixelId: string, config?: { fire_on_paid_only: boolean }) {
  const ttq = getTikTokQueue();
  if (!ttq || !pixelId || activeTikTokPixelIds.has(pixelId)) return;

  activeTikTokPixelIds.add(pixelId);
  if (config) pixelConfigMap.set(pixelId, config);
  registerTikTokReadyHandler(ttq);
  ttq.load(pixelId);
}

function dispatchTikTokEvent(eventName: string, payload: Record<string, unknown>) {
  const ttq = getTikTokQueue();
  if (!ttq || !activeTikTokPixelIds.size || !tikTokLibraryLoaded || typeof ttq.track !== "function") {
    return false;
  }

  ttq.track(eventName, payload);

  console.log("[TikTok Pixel] Evento enviado para os pixels ativos.", {
    eventName,
    payload,
    pixelIds: Array.from(activeTikTokPixelIds),
  });

  return true;
}

function trackTikTokEvent(eventName: string, payload: Record<string, unknown>, allowQueue = true) {
  if (dispatchTikTokEvent(eventName, payload)) return;

  if (!allowQueue) return;

  queuedTikTokEvents.push({ eventName, payload });
  console.warn("[TikTok Pixel] Evento enfileirado aguardando pixels/lib prontos.", {
    eventName,
    payload,
    pixelIds: Array.from(activeTikTokPixelIds),
    libraryLoaded: tikTokLibraryLoaded,
  });

  // Auto-retry: poll until SDK is ready (max 30s)
  if (!retryTimerActive) {
    retryTimerActive = true;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      flushQueuedTikTokEvents();
      if (queuedTikTokEvents.length === 0 || attempts >= 30) {
        clearInterval(interval);
        retryTimerActive = false;
        if (queuedTikTokEvents.length > 0) {
          console.error("[TikTok Pixel] Desistiu de enviar eventos após 30 tentativas.");
        }
      }
    }, 1000);
  }
}

function flushQueuedTikTokEvents() {
  if (!queuedTikTokEvents.length || !activeTikTokPixelIds.size || !tikTokLibraryLoaded) return;

  const events = queuedTikTokEvents.splice(0, queuedTikTokEvents.length);
  events.forEach(({ eventName, payload }) => {
    const sent = dispatchTikTokEvent(eventName, payload);
    if (!sent) {
      queuedTikTokEvents.push({ eventName, payload });
    }
  });
}

export function useTikTokPixel() {
  const { data: pixels } = useQuery({
    queryKey: ["tracking-pixels-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracking_pixels" as any)
        .select("*")
        .eq("active", true)
        .eq("platform", "tiktok");
      if (error) throw error;
      return data as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    getTikTokQueue();
  }, []);

  useEffect(() => {
    if (pixels && pixels.length > 0) {
      pixels.forEach((p: any) => loadTikTokPixel(p.pixel_id));
      window.ttq?.page();
      flushQueuedTikTokEvents();
    }
  }, [pixels]);

  return { pixels };
}

export function trackTikTokPurchase(
  value: number,
  currency = "BRL",
  options: TrackTikTokPurchaseOptions = {},
) {
  const normalizedValue = Number(value);
  const payload: Record<string, unknown> = {
    content_type: "product",
    value: Number.isFinite(normalizedValue) ? normalizedValue : 0,
    currency,
  };

  if (options.orderId) payload.order_id = options.orderId;
  if (options.contentId) payload.content_id = options.contentId;
  if (options.contentName) payload.content_name = options.contentName;
  if (typeof options.quantity === "number") payload.quantity = options.quantity;

  if (options.contentId || options.contentName || typeof options.quantity === "number") {
    payload.contents = [{
      content_type: "product",
      ...(options.contentId ? { content_id: options.contentId } : {}),
      ...(options.contentName ? { content_name: options.contentName } : {}),
      ...(typeof options.quantity === "number" ? { quantity: options.quantity } : {}),
      price: Number.isFinite(normalizedValue) ? normalizedValue : 0,
    }];
  }

  console.log("[TikTok Pixel] trackTikTokPurchase called:", {
    payload,
    pixelCount: activeTikTokPixelIds.size,
    ttqExists: typeof window !== "undefined" && !!window.ttq,
  });

  // Identify user with email/phone before tracking
  try {
    const ttq = getTikTokQueue();
    if (ttq && typeof ttq.identify === "function") {
      const identifyData: Record<string, string> = {};
      if (options.email) identifyData.email = options.email;
      if (options.phone) identifyData.phone_number = options.phone;
      if (Object.keys(identifyData).length > 0) {
        ttq.identify(identifyData);
        console.log("[TikTok Pixel] identify called:", identifyData);
      }
    }
    trackTikTokEvent("CompletePayment", payload);
  } catch (e) {
    console.error("[TikTok Pixel] Error firing event:", e);
  }
}
