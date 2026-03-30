import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Eye, EyeOff, Save, CheckCircle } from "lucide-react";

interface GatewayConfig {
  name: string;
  label: string;
  description: string;
  icon: string;
}

const GATEWAYS: GatewayConfig[] = [
  { name: "blackcatpay", label: "BlackCatPay", description: "Gateway de pagamentos PIX", icon: "🐱" },
  { name: "ghostspay", label: "GhostsPay", description: "Gateway de pagamentos PIX", icon: "👻" },
  { name: "duck", label: "Duck", description: "Gateway de pagamentos PIX", icon: "🦆" },
];

interface GatewayState {
  publicKey: string;
  secretKey: string;
  active: boolean;
  showSecret: boolean;
  id?: string;
}

const AdminGateways = () => {
  const queryClient = useQueryClient();
  const [states, setStates] = useState<Record<string, GatewayState>>({});
  const [loaded, setLoaded] = useState(false);

  const { data: gateways } = useQuery({
    queryKey: ["gateway-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gateway_settings")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (gateways && !loaded) {
      const newStates: Record<string, GatewayState> = {};
      GATEWAYS.forEach((gw) => {
        const existing = gateways.find((g) => g.gateway_name === gw.name);
        newStates[gw.name] = {
          publicKey: existing?.public_key || "",
          secretKey: existing?.secret_key || "",
          active: existing?.active ?? false,
          showSecret: false,
          id: existing?.id,
        };
      });
      setStates(newStates);
      setLoaded(true);
    }
  }, [gateways, loaded]);

  const updateState = (name: string, partial: Partial<GatewayState>) => {
    setStates((prev) => ({ ...prev, [name]: { ...prev[name], ...partial } }));
  };

  const handleToggleActive = async (gatewayName: string, newActive: boolean) => {
    // If activating, deactivate all others first
    if (newActive) {
      const newStates = { ...states };
      for (const key of Object.keys(newStates)) {
        if (key !== gatewayName) {
          newStates[key] = { ...newStates[key], active: false };
        }
      }
      newStates[gatewayName] = { ...newStates[gatewayName], active: true };
      setStates(newStates);

      // Deactivate all others in DB
      for (const gw of gateways || []) {
        if (gw.gateway_name !== gatewayName && gw.active) {
          await supabase.from("gateway_settings").update({ active: false }).eq("id", gw.id);
        }
      }
    } else {
      updateState(gatewayName, { active: false });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (gatewayName: string) => {
      const state = states[gatewayName];
      if (!state) return;

      // If setting active, deactivate others in DB
      if (state.active) {
        for (const gw of gateways || []) {
          if (gw.gateway_name !== gatewayName && gw.active) {
            await supabase.from("gateway_settings").update({ active: false }).eq("id", gw.id);
          }
        }
      }

      if (state.id) {
        const { error } = await supabase
          .from("gateway_settings")
          .update({ public_key: state.publicKey, secret_key: state.secretKey, active: state.active })
          .eq("id", state.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gateway_settings").insert({
          gateway_name: gatewayName,
          public_key: state.publicKey,
          secret_key: state.secretKey,
          active: state.active,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gateway-settings"] });
      setLoaded(false);
      toast.success("Gateway salvo com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar gateway"),
  });

  if (!loaded) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-foreground">Gateways de Pagamento</h2>
      <p className="text-sm text-muted-foreground">Apenas um gateway pode estar ativo por vez. Configure as chaves e ative o desejado.</p>

      <div className="grid gap-4 max-w-2xl">
        {GATEWAYS.map((gw) => {
          const state = states[gw.name];
          if (!state) return null;
          const isActive = state.active;

          return (
            <div
              key={gw.name}
              className={`bg-card rounded-xl border p-6 space-y-5 transition-all ${isActive ? "border-primary ring-1 ring-primary/30" : "border-border"}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-foreground/10 flex items-center justify-center text-lg">
                  {gw.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{gw.label}</p>
                    {isActive && <CheckCircle className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{gw.description}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Label htmlFor={`active-${gw.name}`} className="text-xs text-muted-foreground">Ativo</Label>
                  <Switch
                    id={`active-${gw.name}`}
                    checked={isActive}
                    onCheckedChange={(v) => handleToggleActive(gw.name, v)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Public Key (PK)</Label>
                <Input
                  placeholder="pk_..."
                  value={state.publicKey}
                  onChange={(e) => updateState(gw.name, { publicKey: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Secret Key (SK)</Label>
                <div className="relative">
                  <Input
                    type={state.showSecret ? "text" : "password"}
                    placeholder="sk_..."
                    value={state.secretKey}
                    onChange={(e) => updateState(gw.name, { secretKey: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => updateState(gw.name, { showSecret: !state.showSecret })}
                  >
                    {state.showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  A Secret Key é usada no servidor para criar cobranças. Nunca compartilhe.
                </p>
              </div>

              <Button
                onClick={() => saveMutation.mutate(gw.name)}
                disabled={saveMutation.isPending}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Salvando..." : "Salvar configurações"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminGateways;
