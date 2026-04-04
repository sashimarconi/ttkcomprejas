export type NotificationDeviceGroup = "computer" | "mobile";

const MOBILE_USER_AGENT_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
const MOBILE_LABEL_REGEX = /celular|mobile|iphone|android|ipad|ios/i;
const MOBILE_ENDPOINT_MARKERS = ["web.push.apple.com", "fcm.googleapis.com"];

export function isCurrentBrowserMobile() {
  if (typeof navigator === "undefined") return false;
  return MOBILE_USER_AGENT_REGEX.test(navigator.userAgent);
}

export function getStoredDeviceGroup(device: {
  device_label?: string | null;
  endpoint?: string | null;
}): NotificationDeviceGroup {
  const label = (device.device_label ?? "").toLowerCase();
  const endpoint = (device.endpoint ?? "").toLowerCase();
  const isMobile =
    MOBILE_LABEL_REGEX.test(label) ||
    MOBILE_ENDPOINT_MARKERS.some((marker) => endpoint.includes(marker));

  return isMobile ? "mobile" : "computer";
}