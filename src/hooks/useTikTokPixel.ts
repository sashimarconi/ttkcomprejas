import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    TiktokAnalyticsObject?: string;
    ttq?: any;
  }
}

function loadTikTokPixel(pixelId: string) {
  if (!window.ttq) {
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
      ttq._i[e] = [];
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
  }
  window.ttq.load(pixelId);
  window.ttq.page();
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
    if (pixels && pixels.length > 0) {
      pixels.forEach((p: any) => loadTikTokPixel(p.pixel_id));
    }
  }, [pixels]);

  return { pixels };
}

export function trackTikTokPurchase(value: number, currency = "BRL") {
  try {
    if (window.ttq) {
      console.log("[TikTok Pixel] Firing CompletePayment:", { value, currency });
      window.ttq.track("CompletePayment", {
        content_type: "product",
        value,
        currency,
      });
    } else {
      console.warn("[TikTok Pixel] ttq not available, retrying in 2s...");
      setTimeout(() => {
        if (window.ttq) {
          console.log("[TikTok Pixel] Retry: Firing CompletePayment:", { value, currency });
          window.ttq.track("CompletePayment", {
            content_type: "product",
            value,
            currency,
          });
        } else {
          console.error("[TikTok Pixel] ttq still not available after retry");
        }
      }, 2000);
    }
  } catch (e) {
    console.error("[TikTok Pixel] Error:", e);
  }
}
