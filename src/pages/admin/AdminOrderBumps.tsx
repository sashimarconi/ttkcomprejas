import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

interface OrderBump {
  id?: string;
  title: string;
  image_url: string;
  price: number;
  active: boolean;
  sort_order: number;
}

const emptyBump: OrderBump = { title: "", image_url: "", price: 0, active: true, sort_order: 0 };

const AdminOrderBumps = () => {
  const queryClient = useQueryClient();
  const [editItem, setEditItem] = useState<OrderBump | null>(null);

  const { data: bumps } = useQuery({
    queryKey: ["admin-order-bumps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("order_bumps").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (item: OrderBump) => {
      const payload = {
        title: item.title,
        image_url: item.image_url || null,
        price: item.price,
        active: item.active,
        sort_order: item.sort_order,
      };
      if (item.id) {
        const { error } = await supabase.from("order_bumps").update(payload).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("order_bumps").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order-bumps"] });
      setEditItem(null);
      toast.success("Order bump salvo!");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("order_bumps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order-bumps"] });
      toast.success("Order bump removido!");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Order Bumps</h2>
        <Button size="sm" onClick={() => setEditItem({ ...emptyBump })}>
          <Plus className="w-4 h-4 mr-1" /> Adicionar
        </Button>
      </div>

      {editItem && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3 max-w-xl">
          <div className="space-y-2">
            <Label className="text-xs">Título</Label>
            <Input value={editItem.title} onChange={(e) => setEditItem({ ...editItem, title: e.target.value })} placeholder="Ex: Jogo de Panelas..." />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">URL da Imagem</Label>
            <Input value={editItem.image_url} onChange={(e) => setEditItem({ ...editItem, image_url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Preço (R$)</Label>
              <Input type="number" step="0.01" value={editItem.price} onChange={(e) => setEditItem({ ...editItem, price: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Ordem</Label>
              <Input type="number" value={editItem.sort_order} onChange={(e) => setEditItem({ ...editItem, sort_order: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={editItem.active} onCheckedChange={(v) => setEditItem({ ...editItem, active: v })} />
            <Label className="text-xs">Ativo</Label>
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
        {bumps?.map((bump) => (
          <div key={bump.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
            {bump.image_url && <img src={bump.image_url} alt={bump.title} className="w-12 h-12 rounded object-cover" />}
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground line-clamp-1">{bump.title}</p>
              <p className="text-xs text-marketplace-red font-semibold">R$ {Number(bump.price).toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditItem(bump as OrderBump)}>Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(bump.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {(!bumps || bumps.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum order bump cadastrado</p>
        )}
      </div>
    </div>
  );
};

export default AdminOrderBumps;
