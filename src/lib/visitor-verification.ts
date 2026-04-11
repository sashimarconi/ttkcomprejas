const VERIFIED_VISITOR_KEY = "visitor_human_verified";
const SESSION_ID_KEY = "visitor_session_id";
const HUMAN_INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart", "wheel"] as const;

const BOT_UA_PATTERN = /bot|crawl|spider|slurp|baidu|yandex|bingpreview|google|facebookexternalhit|twitterbot|linkedinbot|pinterest|whatsapp|telegrambot|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|chatgpt-user|claudebot|anthropic|cohere-ai|headless|phantom|selenium|puppeteer|playwright|wget|curl|httpie|python-requests|go-http-client|apache-httpclient|node-fetch|axios/i;

function readSessionStorage(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorage(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in hardened/private environments
  }
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function isBotEnvironment() {
  if (typeof window === "undefined") return true;

  const userAgent = window.navigator.userAgent || "";
  if (!userAgent || userAgent.length < 10) return true;
  if (BOT_UA_PATTERN.test(userAgent)) return true;
  if (window.navigator.webdriver) return true;

  return false;
}

export function getVisitorSessionId() {
  let sessionId = readSessionStorage(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    writeSessionStorage(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

export function hasVerifiedHumanSession() {
  if (typeof window === "undefined") return false;
  return readSessionStorage(VERIFIED_VISITOR_KEY) === "1";
}

export function markVerifiedHumanSession() {
  if (typeof window === "undefined") return;
  writeSessionStorage(VERIFIED_VISITOR_KEY, "1");
}

export function buildVisitorFingerprint() {
  if (typeof window === "undefined") return null;

  const nav = window.navigator;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  const screenInfo = window.screen
    ? `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`
    : "0x0x0";

  const fingerprintSeed = [
    nav.userAgent,
    nav.language,
    nav.platform,
    String(nav.hardwareConcurrency || 0),
    screenInfo,
    timezone,
  ].join("|");

  return `fp_${hashString(fingerprintSeed)}`;
}

export function onFirstHumanInteraction(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  if (hasVerifiedHumanSession()) {
    callback();
    return () => undefined;
  }

  const listenerOptions: AddEventListenerOptions = {
    capture: true,
    once: true,
    passive: true,
  };

  let fired = false;

  const cleanup = () => {
    HUMAN_INTERACTION_EVENTS.forEach((eventName) => {
      window.removeEventListener(eventName, handleInteraction, listenerOptions);
    });
  };

  const handleInteraction = () => {
    if (fired) return;
    fired = true;
    markVerifiedHumanSession();
    cleanup();
    callback();
  };

  HUMAN_INTERACTION_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, handleInteraction, listenerOptions);
  });

  return cleanup;
}
