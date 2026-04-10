import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { playRingtone, type RingtoneId } from "@/lib/notification-sounds";
import { getStoredDeviceGroup, isCurrentBrowserMobile } from "@/lib/notification-device-group";
import defaultIcon from "@/assets/notification-icon-default.png";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

interface TypeSettings {
  ringtone: RingtoneId;
  custom_ringtone_url: string | null;
  notification_title: string;
  notification_icon_url: string | null;
}

const NOTIFICATION_SETTINGS_UPDATED_EVENT = "notification-settings-updated";
const GATEWAY_NAMES: Record<string, string> = {
  blackcatpay: "BlackCatPay",
  ghostspay: "GhostsPay",
  duck: "Duck",
  hisounique: "Hiso Unique",
  paradise: "Paradise",
};
const PAID_ORDERS_POLL_INTERVAL_MS = 15000;

export default function SaleNotification() {
  const processedIds = useRef(new Set<string>());
  const notifyPaidRef = useRef(true);
  const notifyPendingRef = useRef(false);
  const gatewayNameRef = useRef("Gateway");
  const paidPollingCursorRef = useRef(new Date().toISOString());
  const paidSettingsRef = useRef<TypeSettings>({
    ringtone: 'cash_register',
    custom_ringtone_url: null,
    notification_title: 'Venda Realizada',
    notification_icon_url: null,
  });
  const pendingSettingsRef = useRef<TypeSettings>({
    ringtone: 'soft_chime',
    custom_ringtone_url: null,
    notification_title: 'Novo Pedido Pendente',
    notification_icon_url: null,
  });

  const loadSettings = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [settingsResult, gatewayResult, latestPaidResult] = await Promise.all([
      supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("gateway_settings")
        .select("gateway_name")
        .eq("active", true)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("orders")
        .select("updated_at")
        .eq("payment_status", "paid")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const data = settingsResult.data;
    const activeGateway = gatewayResult.data;
    const latestPaid = latestPaidResult.data;

    if (activeGateway?.gateway_name) {
      gatewayNameRef.current = GATEWAY_NAMES[activeGateway.gateway_name] || activeGateway.gateway_name;
    }

    if (latestPaid?.updated_at && latestPaid.updated_at > paidPollingCursorRef.current) {
      paidPollingCursorRef.current = latestPaid.updated_at;
    }

    if (data) {
      const d = data as any;
      notifyPaidRef.current = d.notify_paid !== false;
      notifyPendingRef.current = d.notify_pending === true;
      paidSettingsRef.current = {
        ringtone: d.ringtone || 'cash_register',
        custom_ringtone_url: d.custom_ringtone_url || null,
        notification_title: d.notification_title || 'Venda Realizada',
        notification_icon_url: d.notification_icon_url || null,
      };
      pendingSettingsRef.current = {
        ringtone: d.ringtone_pending || 'soft_chime',
        custom_ringtone_url: d.custom_ringtone_url_pending || null,
        notification_title: d.notification_title_pending || 'Novo Pedido Pendente',
        notification_icon_url: d.notification_icon_url_pending || null,
      };
    }

    if (isCurrentBrowserMobile()) {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("notify_paid, notify_pending, device_label, endpoint")
        .eq("user_id", user.id);

      if (subs && subs.length > 0) {
        const mobileSubs = subs.filter((sub: any) => getStoredDeviceGroup(sub) === "mobile");
        if (mobileSubs.length > 0) {
          notifyPaidRef.current = mobileSubs.every((sub: any) => sub.notify_paid !== false);
          notifyPendingRef.current = mobileSubs.every((sub: any) => sub.notify_pending !== false);
        }
      }
    }
  }, []);

  function handlePaidOrder(order: any) {
    if (!notifyPaidRef.current) return;
    if (processedIds.current.has(order.id)) return;
    processedIds.current.add(order.id);
    if (order.updated_at && order.updated_at > paidPollingCursorRef.current) {
      paidPollingCursorRef.current = order.updated_at;
    }
    showToast(paidSettingsRef.current, order, 'paid');
  }

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const handleSettingsUpdated = () => {
      void loadSettings();
    };

    window.addEventListener(NOTIFICATION_SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
    return () => {
      window.removeEventListener(NOTIFICATION_SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
    };
  }, [loadSettings]);

  useEffect(() => {
    const pollPaidOrders = async () => {
      if (document.hidden) return;

      const { data } = await supabase
      .from("notification_settings")
        .select("id, total, payment_status, updated_at")
        .eq("payment_status", "paid")
        .gt("updated_at", paidPollingCursorRef.current)
        .order("updated_at", { ascending: true })
        .limit(10);

      if (!data?.length) return;

      for (const order of data as any[]) {
        handlePaidOrder(order);
      }
    };

    const handleVisibilityGain = () => {
      if (!document.hidden) {
        void pollPaidOrders();
      }
    };

    const intervalId = window.setInterval(() => {
      void pollPaidOrders();
    }, PAID_ORDERS_POLL_INTERVAL_MS);

    document.addEventListener("visibilitychange", handleVisibilityGain);
    window.addEventListener("focus", handleVisibilityGain);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityGain);
      window.removeEventListener("focus", handleVisibilityGain);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-sale-notifications")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        async (payload) => {
          const order = payload.new as any;
          if (order.payment_status === 'paid') {
            handlePaidOrder(order);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          if (!notifyPendingRef.current) return;
          const order = payload.new as any;
          if (order.payment_status !== 'pending') return;
          const key = order.id + '-pending';
          if (processedIds.current.has(key)) return;
          processedIds.current.add(key);
          showToast(pendingSettingsRef.current, order, 'pending', false);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  function showToast(s: TypeSettings, order: any, type: 'paid' | 'pending', playSound = true) {
    if (playSound) {
      playRingtone(s.ringtone, s.custom_ringtone_url);
    }

    const gatewayName = gatewayNameRef.current;
    const iconUrl = s.notification_icon_url || defaultIcon;
    const title = s.notification_title || (type === 'paid' ? 'Venda Realizada' : 'Novo Pedido Pendente');
    const valueColor = type === 'paid' ? 'text-emerald-400' : 'text-amber-400';
    const valueLabel = type === 'paid' ? 'Sua comissão' : 'Valor do pedido';

    toast.custom(
      () => (
        <div className="flex items-center gap-3 bg-black/80 backdrop-blur-xl text-white rounded-xl px-4 py-3 shadow-2xl border border-white/10 min-w-[280px]">
          <img src={iconUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-white/60">from {gatewayName}</p>
            <p className={`text-sm font-bold ${valueColor} mt-0.5`}>
              {valueLabel}: {formatCurrency(order.total || 0)}
            </p>
          </div>
        </div>
      ),
      { duration: 6000, position: "top-right" }
    );
  }

  return null;
}
