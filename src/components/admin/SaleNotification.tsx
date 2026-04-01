import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign } from "lucide-react";

// Sound generated via Web Audio API

function playMoneySound() {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const playTone = (freq: number, start: number, duration: number, gain: number) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);
    g.gain.setValueAtTime(gain, audioCtx.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + start + duration);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + start);
    osc.stop(audioCtx.currentTime + start + duration);
  };

  // "tiktin" cash register sound
  playTone(2200, 0, 0.08, 0.3);
  playTone(2800, 0.1, 0.08, 0.3);
  playTone(3400, 0.2, 0.15, 0.25);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function SaleNotification() {
  const processedIds = useRef(new Set<string>());

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

          // Fetch gateway name
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

          playMoneySound();

          toast.custom(
            () => (
              <div className="flex items-center gap-3 bg-black/80 backdrop-blur-xl text-white rounded-xl px-4 py-3 shadow-2xl border border-white/10 min-w-[280px]">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Venda Realizada</p>
                  <p className="text-xs text-white/60">from {gatewayName}</p>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5">
                    Você recebeu {formatCurrency(order.total || 0)}
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
  }, []);

  return null;
}
