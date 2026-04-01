import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const AdminStoreSettings = () => {
  const [form, setForm] = useState({ name: "", avatar_url: "", total_sales: "", rating: 4.9, product_page_logo_url: "" });
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("*").limit(1).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setSettingsId(data.id);
      setForm({
        name: data.name,
        avatar_url: data.avatar_url || "",
        total_sales: data.total_sales || "",
        rating: Number(data.rating) || 4.9,
        product_page_logo_url: (data as any).product_page_logo_url || "",
        checkout_logo_url: (data as any).checkout_logo_url || "",
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (settingsId) {
        const { error } = await supabase.from("store_settings").update(form).eq("id", settingsId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-store-settings"] });
      toast({ title: "Configurações salvas!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-lg font-bold text-foreground">Configurações da Loja</h2>

      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <div className="space-y-1">
          <Label>Nome da Loja</Label>
          <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>URL do Avatar/Logo</Label>
          <Input value={form.avatar_url} onChange={(e) => setForm((p) => ({ ...p, avatar_url: e.target.value }))} placeholder="https://..." />
          {form.avatar_url && <img src={form.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover mt-2" />}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Total de Vendas</Label>
            <Input value={form.total_sales} onChange={(e) => setForm((p) => ({ ...p, total_sales: e.target.value }))} placeholder="35.4K" />
          </div>
          <div className="space-y-1">
            <Label>Avaliação</Label>
            <Input type="number" step="0.1" value={form.rating} onChange={(e) => setForm((p) => ({ ...p, rating: parseFloat(e.target.value) }))} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Logo na Página do Produto (opcional)</Label>
          <Input value={form.product_page_logo_url} onChange={(e) => setForm((p) => ({ ...p, product_page_logo_url: e.target.value }))} placeholder="https://... (deixe vazio para não exibir)" />
          {form.product_page_logo_url && <img src={form.product_page_logo_url} alt="" className="h-8 object-contain mt-2" />}
        </div>
        <div className="space-y-1">
          <Label>Logo no Checkout (opcional)</Label>
          <Input value={form.checkout_logo_url} onChange={(e) => setForm((p) => ({ ...p, checkout_logo_url: e.target.value }))} placeholder="https://... (deixe vazio para não exibir)" />
          {form.checkout_logo_url && <img src={form.checkout_logo_url} alt="" className="h-8 object-contain mt-2" />}
        </div>
        <Button onClick={() => saveMutation.mutate()} className="bg-marketplace-red hover:bg-marketplace-red/90" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
};

export default AdminStoreSettings;
