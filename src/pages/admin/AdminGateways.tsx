import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Save, CheckCircle, Search, X, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface GatewayConfig {
  name: string;
  label: string;
  description: string;
  logoUrl: string;
}

const GATEWAYS: GatewayConfig[] = [
  {
    name: "blackcatpay",
    label: "BlackCatPay",
    description: "Gateway de pagamentos PIX rápido e seguro",
    logoUrl: "https://app.cloudfycheckout.com/_next/image?url=%2Fgateways%2FblackCat.png&w=3840&q=75",
  },
  {
    name: "ghostspay",
    label: "GhostsPay",
    description: "Gateway de pagamentos PIX com alta conversão",
    logoUrl: "https://app.cloudfycheckout.com/gateways/ghostPay.svg",
  },
  {
    name: "duck",
    label: "Duck",
    description: "Gateway de pagamentos PIX simples e eficiente",
    logoUrl: "https://app.usecorvex.com.br/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fduni5gxk4%2Fimage%2Fupload%2Fv1773135358%2Facquirers%2Flogos%2Fvgsat7jyqfqtbnby8zwg.jpg&w=3840&q=75",
  },
  {
    name: "hisounique",
    label: "Hiso Unique",
    description: "Plataforma moderna e segura para pagamentos digitais",
    logoUrl: "https://hisoftware-assets.s3.us-east-2.amazonaws.com/uploads/1768398933749-HIGH-SOFTWARE-LOGO-3-01.png",
  },
  {
    name: "paradise",
    label: "Paradise",
    description: "Gateway PIX com checkout otimizado para conversão",
    logoUrl: "https://multi.paradisepags.com/assets/images/a.png",
  },
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
  const [search, setSearch] = useState("");
  const [configOpen, setConfigOpen] = useState<string | null>(null);

  const { data: gateways } = useQuery({
    queryKey: ["gateway-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gateway_settings").select("*");
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

  const isConfigured = (name: string) => {
    const s = states[name];
    return s && s.id && (s.publicKey || s.secretKey);
  };

  const saveMutation = useMutation({
    mutationFn: async ({ gatewayName, activate }: { gatewayName: string; activate?: boolean }) => {
      const state = states[gatewayName];
      if (!state) return;

      const shouldActivate = activate ?? state.active;

      // If activating, deactivate all others
      if (shouldActivate) {
        for (const gw of gateways || []) {
          if (gw.gateway_name !== gatewayName && gw.active) {
            await supabase.from("gateway_settings").update({ active: false }).eq("id", gw.id);
          }
        }
      }

      if (state.id) {
        const { error } = await supabase
          .from("gateway_settings")
          .update({
            public_key: state.publicKey,
            secret_key: state.secretKey,
            active: shouldActivate,
          })
          .eq("id", state.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gateway_settings").insert({
          gateway_name: gatewayName,
          public_key: state.publicKey,
          secret_key: state.secretKey,
          active: shouldActivate,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gateway-settings"] });
      setLoaded(false);
      setConfigOpen(null);
      toast.success("Gateway salvo com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar gateway"),
  });

  const filteredGateways = GATEWAYS.filter(
    (gw) =>
      gw.label.toLowerCase().includes(search.toLowerCase()) ||
      gw.description.toLowerCase().includes(search.toLowerCase())
  );

  const activeGateway = GATEWAYS.find((gw) => states[gw.name]?.active);

  if (!loaded) return null;

  const currentConfig = configOpen ? GATEWAYS.find((g) => g.name === configOpen) : null;
  const currentState = configOpen ? states[configOpen] : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Gateways de Pagamento</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure e ative gateways de pagamento. Apenas um pode estar ativo por vez.
        </p>
      </div>

      {activeGateway && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
          <CheckCircle className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Gateway ativo: {activeGateway.label}</p>
            <p className="text-xs text-muted-foreground">Processando pagamentos PIX</p>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar Gateways"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredGateways.map((gw) => {
          const state = states[gw.name];
          if (!state) return null;
          const configured = isConfigured(gw.name);
          const active = state.active;

          return (
            <div
              key={gw.name}
              className={cn(
                "bg-card rounded-xl border p-5 flex flex-col gap-4 transition-all hover:shadow-md",
                active ? "border-primary ring-1 ring-primary/30" : "border-border"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={gw.logoUrl}
                    alt={gw.label}
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                {active && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                    Ativo
                  </span>
                )}
              </div>

              <div>
                <p className="text-sm font-bold text-foreground">{gw.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{gw.description}</p>
              </div>

              <div className="mt-auto">
                <Button
                  variant={configured ? "outline" : "ghost"}
                  className={cn(
                    "w-full justify-between",
                    configured && "border-primary/30 text-primary hover:bg-primary/5"
                  )}
                  onClick={() => setConfigOpen(gw.name)}
                >
                  {configured ? "Configurado" : "Configurar Gateway"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Config Modal */}
      <Dialog open={!!configOpen} onOpenChange={(open) => !open && setConfigOpen(null)}>
        <DialogContent className="sm:max-w-lg">
          {currentConfig && currentState && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    <img src={currentConfig.logoUrl} alt={currentConfig.label} className="w-8 h-8 object-contain" />
                  </div>
                  <div>
                    <DialogTitle>{currentConfig.label}</DialogTitle>
                    <p className="text-xs text-muted-foreground">{currentConfig.description}</p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-xs">Chave pública</Label>
                  <Input
                    placeholder="Insira sua chave pública"
                    value={currentState.publicKey}
                    onChange={(e) => updateState(configOpen!, { publicKey: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Chave secreta</Label>
                  <div className="relative">
                    <Input
                      type={currentState.showSecret ? "text" : "password"}
                      placeholder="Insira sua chave secreta"
                      value={currentState.secretKey}
                      onChange={(e) => updateState(configOpen!, { secretKey: e.target.value })}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => updateState(configOpen!, { showSecret: !currentState.showSecret })}
                    >
                      {currentState.showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">Processar Pix</p>
                    <p className="text-xs text-muted-foreground">Pagamentos via PIX</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-4 rounded-full bg-primary relative">
                      <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-primary-foreground" />
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => saveMutation.mutate({ gatewayName: configOpen!, activate: false })}
                    variant="outline"
                    disabled={saveMutation.isPending}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                  <Button
                    onClick={() => saveMutation.mutate({ gatewayName: configOpen!, activate: true })}
                    disabled={saveMutation.isPending}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Salvar e Ativar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGateways;
