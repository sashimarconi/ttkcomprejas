import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const AdminCheckoutSettings = () => {
  const [form, setForm] = useState({
    pix_payment_title: "Pagamento Seguro",
    pix_expiration_minutes: 30,
    checkout_header_text: "Resumo do pedido",
    checkout_security_text: "Finalização da compra segura garantida",
    checkout_button_text: "Fazer pedido",
    pix_instruction_text: "Efetue o pagamento agora mesmo escaneando o QR Code",
  });
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-checkout-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkout_settings" as any)
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (data) {
      setSettingsId(data.id);
      setForm({
        pix_payment_title: data.pix_payment_title || "Pagamento Seguro",
        pix_expiration_minutes: data.pix_expiration_minutes || 30,
        checkout_header_text: data.checkout_header_text || "Resumo do pedido",
        checkout_security_text: data.checkout_security_text || "Finalização da compra segura garantida",
        checkout_button_text: data.checkout_button_text || "Fazer pedido",
        pix_instruction_text: data.pix_instruction_text || "Efetue o pagamento agora mesmo escaneando o QR Code",
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (settingsId) {
        const { error } = await supabase
          .from("checkout_settings" as any)
          .update(form)
          .eq("id", settingsId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-checkout-settings"] });
      toast({ title: "Configurações do checkout salvas!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-lg font-bold text-foreground">Configurações do Checkout</h2>

      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <p className="text-sm font-semibold text-foreground">Textos do Checkout</p>
        <div className="space-y-1">
          <Label>Título do cabeçalho</Label>
          <Input value={form.checkout_header_text} onChange={(e) => setForm((p) => ({ ...p, checkout_header_text: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Texto de segurança</Label>
          <Input value={form.checkout_security_text} onChange={(e) => setForm((p) => ({ ...p, checkout_security_text: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Texto do botão de pedido</Label>
          <Input value={form.checkout_button_text} onChange={(e) => setForm((p) => ({ ...p, checkout_button_text: e.target.value }))} />
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <p className="text-sm font-semibold text-foreground">Tela do PIX</p>
        <div className="space-y-1">
          <Label>Nome da empresa (aparece na tela do PIX)</Label>
          <Input value={form.pix_payment_title} onChange={(e) => setForm((p) => ({ ...p, pix_payment_title: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Tempo para pagamento (minutos)</Label>
          <Input
            type="number"
            min={1}
            value={form.pix_expiration_minutes}
            onChange={(e) => setForm((p) => ({ ...p, pix_expiration_minutes: parseInt(e.target.value) || 30 }))}
          />
        </div>
        <div className="space-y-1">
          <Label>Instrução do QR Code</Label>
          <Input value={form.pix_instruction_text} onChange={(e) => setForm((p) => ({ ...p, pix_instruction_text: e.target.value }))} />
        </div>
      </div>

      <Button onClick={() => saveMutation.mutate()} className="bg-marketplace-red hover:bg-marketplace-red/90" disabled={saveMutation.isPending}>
        {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
};

export default AdminCheckoutSettings;
