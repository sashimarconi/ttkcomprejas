export type NotificationDeviceGroup = "computer" | "mobile";

const MOBILE_USER_AGENT_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
const MOBILE_LABEL_REGEX = /celular|mobile|iphone|android|ipad|ios/i;

function getNavigatorMeta() {
  if (typeof navigator === "undefined") return null;
  return navigator as Navigator & {
    userAgentData?: { mobile?: boolean };
  };
}

export function isCurrentBrowserMobile() {
  const meta = getNavigatorMeta();
  if (!meta) return false;

  if (typeof meta.userAgentData?.mobile === "boolean") {
    return meta.userAgentData.mobile;
  }

  const isTouchMac = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return MOBILE_USER_AGENT_REGEX.test(navigator.userAgent) || isTouchMac;
}

export function getCurrentDeviceGroup(): NotificationDeviceGroup {
  return isCurrentBrowserMobile() ? "mobile" : "computer";
}

export function getCurrentDeviceLabel() {
  return getCurrentDeviceGroup() === "mobile" ? "Celular" : "Computador";
}

export function getStoredDeviceGroup(device: {
  device_label?: string | null;
  endpoint?: string | null;
}): NotificationDeviceGroup {
  const label = (device.device_label ?? "").toLowerCase();
  const isMobile = MOBILE_LABEL_REGEX.test(label);

  return isMobile ? "mobile" : "computer";
}