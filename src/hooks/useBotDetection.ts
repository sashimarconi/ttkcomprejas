import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Generate a browser fingerprint hash from stable properties
function generateFingerprint(): string {
  const components: string[] = [];

  // Screen
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  components.push(String(window.devicePixelRatio || 1));

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || "");

  // Language
  components.push(navigator.language || "");
  components.push(String(navigator.languages?.length || 0));

  // Platform
  components.push(navigator.platform || "");

  // Hardware concurrency
  components.push(String(navigator.hardwareConcurrency || 0));

  // Touch support
  components.push(String(navigator.maxTouchPoints || 0));

  // Canvas fingerprint (fast, doesn't require image rendering)
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(0, 0, 100, 50);
      ctx.fillStyle = "#069";
      ctx.fillText("Lovable Bot Check", 2, 15);
      ctx.fillStyle = "rgba(102,204,0,0.7)";
      ctx.fillText("Lovable Bot Check", 4, 17);
      components.push(canvas.toDataURL().slice(-50));
    }
  } catch {
    components.push("no-canvas");
  }

  // WebGL renderer
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      if (ext) {
        components.push(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "");
      }
    }
  } catch {
    components.push("no-webgl");
  }

  // Simple hash
  const raw = components.join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// Calculate bot score (0 = definitely human, 100 = definitely bot)
function calculateBotScore(): number {
  let score = 0;

  // No mouse/touch capability on desktop = suspicious
  if (navigator.maxTouchPoints === 0 && !matchMedia("(pointer: fine)").matches) {
    score += 20;
  }

  // WebDriver property (headless browser)
  if ((navigator as any).webdriver === true) {
    score += 50;
  }

  // Plugins array empty on desktop (bots usually have 0)
  if (navigator.plugins && navigator.plugins.length === 0 && navigator.maxTouchPoints === 0) {
    score += 10;
  }

  // Screen size 0x0 or very unusual
  if (screen.width === 0 || screen.height === 0) {
    score += 30;
  }

  // No languages
  if (!navigator.languages || navigator.languages.length === 0) {
    score += 15;
  }

  // Headless indicators in user agent
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("headless") || ua.includes("phantomjs") || ua.includes("puppeteer")) {
    score += 40;
  }

  // Chrome without chrome object
  if (ua.includes("chrome") && !(window as any).chrome) {
    score += 20;
  }

  return Math.min(score, 100);
}

// Track human interactions
export function useHumanInteractionTracker(sessionId: string) {
  const interacted = useRef(false);
  const reported = useRef(false);

  useEffect(() => {
    if (!sessionId) return;

    const markInteraction = () => {
      if (interacted.current) return;
      interacted.current = true;

      // Debounce the report
      if (reported.current) return;
      reported.current = true;

      supabase.from("visitor_sessions").update({
        has_interaction: true,
      } as any).eq("session_id", sessionId).then();
    };

    // Listen for human-only events
    const events = ["mousemove", "touchstart", "scroll", "click", "keydown"] as const;
    const opts = { passive: true, once: true } as const;

    events.forEach(evt => {
      window.addEventListener(evt, markInteraction, opts);
    });

    return () => {
      events.forEach(evt => {
        window.removeEventListener(evt, markInteraction);
      });
    };
  }, [sessionId]);
}

// Get fingerprint and bot score (cached)
let cachedFingerprint: string | null = null;
let cachedBotScore: number | null = null;

export function getFingerprint(): string {
  if (!cachedFingerprint) {
    cachedFingerprint = generateFingerprint();
  }
  return cachedFingerprint;
}

export function getBotScore(): number {
  if (cachedBotScore === null) {
    cachedBotScore = calculateBotScore();
  }
  return cachedBotScore;
}
