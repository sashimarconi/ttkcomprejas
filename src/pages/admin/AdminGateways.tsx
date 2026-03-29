import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Eye, EyeOff, Save } from "lucide-react";

const AdminGateways = () => {
  const queryClient = useQueryClient();
  const [showSecret, setShowSecret] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [active, setActive] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const { data: gateway } = useQuery({
    queryKey: ["gateway-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gateway_settings")
        .select("*")
        .eq("gateway_name", "blackcatpay")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (gateway && !loaded) {
    setPublicKey(gateway.public_key || "");
    setSecretKey(gateway.secret_key || "");
    setActive(gateway.active ?? true);
    setLoaded(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (gateway) {
        const { error } = await supabase
          .from("gateway_settings")
          .update({ public_key: publicKey, secret_key: secretKey, active })
          .eq("id", gateway.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gateway_settings").insert({
          gateway_name: "blackcatpay",
          public_key: publicKey,
          secret_key: secretKey,
          active,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gateway-settings"] });
      toast.success("Gateway salvo com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar gateway"),
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-foreground">Gateways de Pagamento</h2>

      <div className="bg-card rounded-xl border border-border p-6 space-y-5 max-w-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-foreground/10 flex items-center justify-center text-lg">🐱</div>
          <div>
            <p className="text-sm font-semibold text-foreground">BlackCatPay</p>
            <p className="text-xs text-muted-foreground">Gateway de pagamentos PIX</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Label htmlFor="active" className="text-xs text-muted-foreground">Ativo</Label>
            <Switch id="active" checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Public Key (PK)</Label>
          <Input
            placeholder="pk_..."
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Secret Key (SK)</Label>
          <div className="relative">
            <Input
              type={showSecret ? "text" : "password"}
              placeholder="sk_..."
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowSecret(!showSecret)}
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            A Secret Key é usada no servidor para criar cobranças. Nunca compartilhe.
          </p>
        </div>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </div>
  );
};

export default AdminGateways;
