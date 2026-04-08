import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Save, CheckCircle, Search, Zap, Shield, Settings2, Lock, History, KeyRound, Power, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
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
  const [showAuditLog, setShowAuditLog] = useState(false);

  const [configOpen, setConfigOpen] = useState<string | null>(null);

  // PIN verification state
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: string; gatewayName: string; activate?: boolean } | null>(null);

  const { data: gateways } = useQuery({
    queryKey: ["gateway-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gateway_settings").select("*");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (gateways) {
      const newStates: Record<string, GatewayState> = {};
      GATEWAYS.forEach((gw) => {
        const existing = gateways.find((g) => g.gateway_name === gw.name);
        const prev = states[gw.name];
        newStates[gw.name] = {
          publicKey: existing?.public_key || "",
          secretKey: existing?.secret_key || "",
          active: existing?.active ?? false,
          showSecret: prev?.showSecret ?? false,
          id: existing?.id,
        };
      });
      setStates(newStates);
      setLoaded(true);
    }
  }, [gateways]);

  const updateState = (name: string, partial: Partial<GatewayState>) => {
    setStates((prev) => ({ ...prev, [name]: { ...prev[name], ...partial } }));
  };

  const isConfigured = (name: string) => {
    const s = states[name];
    return s && s.id && (s.publicKey || s.secretKey);
  };

  // Request PIN before executing action
  const requirePin = (actionPayload: { action: string; gatewayName: string; activate?: boolean }) => {
    setPinValue("");
    setPendingAction(actionPayload);
    setPinDialogOpen(true);
  };

  const executeWithPin = async (pin: string) => {
    if (!pendingAction) return;
    setPinLoading(true);

    const state = states[pendingAction.gatewayName];
    let edgeAction = pendingAction.action;

    const payload: any = {
      action: edgeAction,
      pin,
      gateway_name: pendingAction.gatewayName,
    };

    if (edgeAction === "save_keys" || edgeAction === "save_and_activate") {
      payload.public_key = state?.publicKey || "";
      payload.secret_key = state?.secretKey || "";
    }

    try {
      const { data, error } = await supabase.functions.invoke("manage-gateway", {
        body: payload,
      });

      if (error) {
        const msg = typeof error === "object" && "message" in error ? error.message : String(error);
        toast.error(msg || "Erro ao processar");
        setPinValue("");
        setPinLoading(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setPinValue("");
        setPinLoading(false);
        return;
      }

      // Success - optimistic update
      if (edgeAction === "activate" || edgeAction === "save_and_activate") {
        setStates((prev) => {
          const updated = { ...prev };
          for (const key of Object.keys(updated)) {
            updated[key] = { ...updated[key], active: key === pendingAction.gatewayName };
          }
          return updated;
        });
      }

      queryClient.invalidateQueries({ queryKey: ["gateway-settings"] });
      queryClient.invalidateQueries({ queryKey: ["gateway-audit-log"] });
      setConfigOpen(null);
      setPinDialogOpen(false);
      setPinValue("");
      setPendingAction(null);
      toast.success(
        edgeAction === "activate"
          ? "Gateway ativado!"
          : edgeAction === "save_and_activate"
          ? "Gateway salvo e ativado!"
          : "Gateway salvo com sucesso!"
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro inesperado");
      setPinValue("");
    } finally {
      setPinLoading(false);
    }
  };

  useEffect(() => {
    if (pinDialogOpen && pinValue.length === 6) {
      executeWithPin(pinValue);
    }
  }, [pinValue, pinDialogOpen]);

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
          Selecione o gateway ativo e configure suas chaves de API.
        </p>
      </div>

      {activeGateway && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-primary/5 rounded-full -ml-6 -mb-6" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center overflow-hidden shadow-sm">
              <img src={activeGateway.logoUrl} alt={activeGateway.label} className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Gateway Ativo</span>
              </div>
              <p className="text-lg font-bold text-foreground mt-0.5">{activeGateway.label}</p>
              <p className="text-xs text-muted-foreground">{activeGateway.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Online</span>
            </div>
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

      <div className="space-y-3">
        {filteredGateways.map((gw) => {
          const state = states[gw.name];
          if (!state) return null;
          const configured = isConfigured(gw.name);
          const active = state.active;

          return (
            <div
              key={gw.name}
              className={cn(
                "group bg-card rounded-xl border p-4 flex items-center gap-4 transition-all cursor-pointer hover:shadow-md",
                active ? "border-primary ring-2 ring-primary/20 shadow-sm" : "border-border hover:border-muted-foreground/30"
              )}
              onClick={() => {
                if (configured && !active) {
                  requirePin({ action: "activate", gatewayName: gw.name });
                } else if (!configured) {
                  setConfigOpen(gw.name);
                }
              }}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                  active ? "border-primary bg-primary" : "border-muted-foreground/30 group-hover:border-muted-foreground/50"
                )}
              >
                {active && (
                  <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                )}
              </div>

              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={gw.logoUrl}
                  alt={gw.label}
                  className="w-9 h-9 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">{gw.label}</p>
                  {configured && (
                    <span className="text-[9px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" />
                      Configurado
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{gw.description}</p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfigOpen(gw.name);
                }}
              >
                <Settings2 className="w-4 h-4" />
              </Button>
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

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => {
                      const gn = configOpen!;
                      requirePin(() => saveMutation.mutate({ gatewayName: gn, activate: false }));
                    }}
                    variant="outline"
                    disabled={saveMutation.isPending}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                  <Button
                    onClick={() => {
                      const gn = configOpen!;
                      requirePin(() => saveMutation.mutate({ gatewayName: gn, activate: true }));
                    }}
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

      {/* PIN Verification Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setPinDialogOpen(false);
          setPinValue("");
          setPendingAction(null);
        }
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <div>
                <DialogTitle>Confirme seu PIN</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Digite seu PIN de 6 dígitos para confirmar esta ação
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <InputOTP maxLength={6} value={pinValue} onChange={setPinValue} autoFocus>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} className="w-11 h-13 text-lg" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          {pinLoading && (
            <p className="text-center text-sm text-muted-foreground mt-2">Verificando...</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Audit Log Section */}
      <div className="mt-8">
        <button
          onClick={() => setShowAuditLog(!showAuditLog)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <History className="w-4 h-4" />
          {showAuditLog ? "Ocultar" : "Ver"} Log de Alterações
        </button>

        {showAuditLog && <AuditLogViewer />}
      </div>
    </div>
  );
};

const ACTION_LABELS: Record<string, { label: string; icon: typeof KeyRound; color: string }> = {
  keys_updated: { label: "Chaves alteradas", icon: KeyRound, color: "text-yellow-500" },
  activated: { label: "Ativado", icon: Power, color: "text-emerald-500" },
  deactivated: { label: "Desativado", icon: Power, color: "text-red-500" },
  created: { label: "Criado", icon: Plus, color: "text-blue-500" },
};

const AuditLogViewer = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["gateway-audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gateway_audit_log" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground mt-3">Carregando...</p>;
  if (!logs?.length) return <p className="text-sm text-muted-foreground mt-3">Nenhuma alteração registrada.</p>;

  return (
    <div className="mt-3 space-y-2">
      {logs.map((log: any) => {
        const actionInfo = ACTION_LABELS[log.action] || { label: log.action, icon: History, color: "text-muted-foreground" };
        const Icon = actionInfo.icon;
        const date = new Date(log.created_at);

        return (
          <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
            <div className={cn("mt-0.5", actionInfo.color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{log.gateway_name}</span>
                <span className={cn("text-xs font-medium", actionInfo.color)}>{actionInfo.label}</span>
              </div>
              {log.details && Object.keys(log.details).length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {log.details.reason || ""}
                  {log.details.public_key_changed && " • Chave pública alterada"}
                  {log.details.secret_key_changed && " • Chave secreta alterada"}
                  {log.details.previous && ` • Anterior: ${log.details.previous}`}
                </p>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {date.toLocaleDateString("pt-BR")} {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default AdminGateways;
