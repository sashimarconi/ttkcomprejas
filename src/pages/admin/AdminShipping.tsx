import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

interface ShippingOption {
  id?: string;
  name: string;
  logo_url: string;
  estimated_days: string;
  price: number;
  free: boolean;
  active: boolean;
  sort_order: number;
}

const emptyOption: ShippingOption = {
  name: "",
  logo_url: "",
  estimated_days: "",
  price: 0,
  free: false,
  active: true,
  sort_order: 0,
};

const AdminShipping = () => {
  const queryClient = useQueryClient();
  const [editItem, setEditItem] = useState<ShippingOption | null>(null);

  const { data: options } = useQuery({
    queryKey: ["admin-shipping"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipping_options").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (item: ShippingOption) => {
      if (item.id) {
        const { error } = await supabase.from("shipping_options").update({
          name: item.name,
          logo_url: item.logo_url || null,
          estimated_days: item.estimated_days || null,
          price: item.price,
          free: item.free,
          active: item.active,
          sort_order: item.sort_order,
        }).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("shipping_options").insert({
          name: item.name,
          logo_url: item.logo_url || null,
          estimated_days: item.estimated_days || null,
          price: item.price,
          free: item.free,
          active: item.active,
          sort_order: item.sort_order,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shipping"] });
      setEditItem(null);
      toast.success("Opção de frete salva!");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipping_options").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shipping"] });
      toast.success("Opção removida!");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Opções de Frete</h2>
        <Button size="sm" onClick={() => setEditItem({ ...emptyOption })}>
          <Plus className="w-4 h-4 mr-1" /> Adicionar
        </Button>
      </div>

      {editItem && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3 max-w-xl">
          <div className="space-y-2">
            <Label className="text-xs">Nome</Label>
            <Input value={editItem.name} onChange={(e) => setEditItem({ ...editItem, name: e.target.value })} placeholder="Ex: Sedex" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">URL do Logo</Label>
            <Input value={editItem.logo_url} onChange={(e) => setEditItem({ ...editItem, logo_url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Prazo estimado</Label>
              <Input value={editItem.estimated_days} onChange={(e) => setEditItem({ ...editItem, estimated_days: e.target.value })} placeholder="3-5 dias" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Preço (R$)</Label>
              <Input type="number" step="0.01" value={editItem.price} onChange={(e) => setEditItem({ ...editItem, price: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={editItem.free} onCheckedChange={(v) => setEditItem({ ...editItem, free: v })} />
              <Label className="text-xs">Frete grátis</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editItem.active} onCheckedChange={(v) => setEditItem({ ...editItem, active: v })} />
              <Label className="text-xs">Ativo</Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => saveMutation.mutate(editItem)} disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-1" /> Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditItem(null)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {options?.map((opt) => (
          <div key={opt.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
            {opt.logo_url && <img src={opt.logo_url} alt={opt.name} className="w-8 h-8 rounded object-contain" />}
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{opt.name}</p>
              <p className="text-xs text-muted-foreground">{opt.estimated_days} • {opt.free ? "Grátis" : `R$ ${Number(opt.price).toFixed(2)}`}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditItem(opt as ShippingOption)}>Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(opt.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {(!options || options.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma opção de frete cadastrada</p>
        )}
      </div>
    </div>
  );
};

export default AdminShipping;
