import { useEffect, useRef, useState } from "react";
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

export default function SaleNotification() {
  const processedIds = useRef(new Set<string>());
  const [notifyPaid, setNotifyPaid] = useState(true);
  const [notifyPending, setNotifyPending] = useState(false);
  const [paidSettings, setPaidSettings] = useState<TypeSettings>({
    ringtone: 'cash_register',
    custom_ringtone_url: null,
    notification_title: 'Venda Realizada',
    notification_icon_url: null,
  });
  const [pendingSettings, setPendingSettings] = useState<TypeSettings>({
    ringtone: 'soft_chime',
    custom_ringtone_url: null,
    notification_title: 'Novo Pedido Pendente',
    notification_icon_url: null,
  });

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const d = data as any;
        setNotifyPaid(d.notify_paid !== false);
        setNotifyPending(d.notify_pending === true);
        setPaidSettings({
          ringtone: d.ringtone || 'cash_register',
          custom_ringtone_url: d.custom_ringtone_url || null,
          notification_title: d.notification_title || 'Venda Realizada',
          notification_icon_url: d.notification_icon_url || null,
        });
        setPendingSettings({
          ringtone: d.ringtone_pending || 'soft_chime',
          custom_ringtone_url: d.custom_ringtone_url_pending || null,
          notification_title: d.notification_title_pending || 'Novo Pedido Pendente',
          notification_icon_url: d.notification_icon_url_pending || null,
        });
      }

      if (isCurrentBrowserMobile()) {
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("notify_paid, notify_pending, device_label, endpoint")
          .eq("user_id", user.id);

        if (subs && subs.length > 0) {
          const mobileSubs = subs.filter((sub: any) => getStoredDeviceGroup(sub) === "mobile");
          if (mobileSubs.length > 0) {
            setNotifyPaid(mobileSubs.every((sub: any) => sub.notify_paid !== false));
            setNotifyPending(mobileSubs.every((sub: any) => sub.notify_pending !== false));
          }
        }
      }
    }
    loadSettings();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-sale-notifications")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: "payment_status=eq.paid" },
        async (payload) => {
          if (!notifyPaid) return;
          const order = payload.new as any;
          if (processedIds.current.has(order.id)) return;
          processedIds.current.add(order.id);
          showToast(paidSettings, order, 'paid');
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          if (!notifyPending) return;
          const order = payload.new as any;
          if (order.payment_status !== 'pending') return;
          const key = order.id + '-pending';
          if (processedIds.current.has(key)) return;
          processedIds.current.add(key);
          showToast(pendingSettings, order, 'pending', false);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [paidSettings, pendingSettings, notifyPaid, notifyPending]);

  async function showToast(s: TypeSettings, order: any, type: 'paid' | 'pending', playSound = true) {
    let gatewayName = "Gateway";
    try {
      const { data } = await supabase
        .from("gateway_settings")
        .select("gateway_name")
        .eq("active", true)
        .limit(1)
        .maybeSingle();
      if (data?.gateway_name) {
        const names: Record<string, string> = {
          blackcatpay: "BlackCatPay", ghostspay: "GhostsPay",
          duck: "Duck", hisounique: "Hiso Unique", paradise: "Paradise",
        };
        gatewayName = names[data.gateway_name] || data.gateway_name;
      }
    } catch {}

    if (playSound) {
      playRingtone(s.ringtone, s.custom_ringtone_url);
    }

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
