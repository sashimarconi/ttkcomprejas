import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { playRingtone, type RingtoneId } from "@/lib/notification-sounds";
import defaultIcon from "@/assets/notification-icon-default.png";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function SaleNotification() {
  const processedIds = useRef(new Set<string>());
  const [notifSettings, setNotifSettings] = useState<{
    ringtone: RingtoneId;
    custom_ringtone_url: string | null;
    notification_title: string;
    notification_icon_url: string | null;
  }>({
    ringtone: 'cash_register',
    custom_ringtone_url: null,
    notification_title: 'Venda Realizada',
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
        setNotifSettings({
          ringtone: (data as any).ringtone || 'cash_register',
          custom_ringtone_url: (data as any).custom_ringtone_url || null,
          notification_title: (data as any).notification_title || 'Venda Realizada',
          notification_icon_url: (data as any).notification_icon_url || null,
        });
      }
    }
    loadSettings();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-sale-notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: "payment_status=eq.paid",
        },
        async (payload) => {
          const order = payload.new as any;
          if (processedIds.current.has(order.id)) return;
          processedIds.current.add(order.id);

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
                blackcatpay: "BlackCatPay",
                ghostspay: "GhostsPay",
                duck: "Duck",
                hisounique: "Hiso Unique",
                paradise: "Paradise",
              };
              gatewayName = names[data.gateway_name] || data.gateway_name;
            }
          } catch {}

          playRingtone(notifSettings.ringtone, notifSettings.custom_ringtone_url);

          const iconUrl = notifSettings.notification_icon_url || defaultIcon;
          const title = notifSettings.notification_title || "Venda Realizada";

          toast.custom(
            () => (
              <div className="flex items-center gap-3 bg-black/80 backdrop-blur-xl text-white rounded-xl px-4 py-3 shadow-2xl border border-white/10 min-w-[280px]">
                <img src={iconUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-white/60">from {gatewayName}</p>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5">
                    Sua comissão: {formatCurrency(order.total || 0)}
                  </p>
                </div>
              </div>
            ),
            { duration: 6000, position: "top-right" }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notifSettings]);

  return null;
}
