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
};

const activeTikTokPixelIds = new Set<string>();
const queuedTikTokEvents: QueuedTikTokEvent[] = [];

function getTikTokQueue() {
  if (typeof window === "undefined") return null;

  window.TiktokAnalyticsObject = "ttq";

  if (window.ttq?.methods) {
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

    const o = document.createElement("script");
    o.type = "text/javascript";
    o.async = true;
    o.src = r + "?sdkid=" + e + "&lib=ttq";

    const a = document.getElementsByTagName("script")[0];
    a?.parentNode?.insertBefore(o, a);
  };

  return ttq;
}

function loadTikTokPixel(pixelId: string) {
  const ttq = getTikTokQueue();
  if (!ttq || !pixelId || activeTikTokPixelIds.has(pixelId)) return;

  activeTikTokPixelIds.add(pixelId);
  ttq.load(pixelId);
}

function trackTikTokEvent(eventName: string, payload: Record<string, unknown>, allowQueue = true) {
  const ttq = getTikTokQueue();
  if (!ttq) return;

  if (!activeTikTokPixelIds.size) {
    if (allowQueue) {
      queuedTikTokEvents.push({ eventName, payload });
      console.warn("[TikTok Pixel] Nenhum pixel ativo carregado ainda. Evento enfileirado.", {
        eventName,
        payload,
      });
    }
    return;
  }

  activeTikTokPixelIds.forEach((pixelId) => {
    const instance = typeof ttq.instance === "function" ? ttq.instance(pixelId) : ttq;
    instance.track(eventName, payload);
  });

  console.log("[TikTok Pixel] Evento enviado para os pixels ativos.", {
    eventName,
    payload,
    pixelIds: Array.from(activeTikTokPixelIds),
  });
}

function flushQueuedTikTokEvents() {
  if (!queuedTikTokEvents.length || !activeTikTokPixelIds.size) return;

  const events = queuedTikTokEvents.splice(0, queuedTikTokEvents.length);
  events.forEach(({ eventName, payload }) => trackTikTokEvent(eventName, payload, false));
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

  try {
    trackTikTokEvent("CompletePayment", payload);
  } catch (e) {
    console.error("[TikTok Pixel] Error firing event:", e);
  }
}
