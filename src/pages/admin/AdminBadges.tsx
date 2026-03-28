import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

const AdminBadges = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", icon: "shield", color: "blue", active: true, sort_order: 0 });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: badges, isLoading } = useQuery({
    queryKey: ["admin-badges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trust_badges").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("trust_badges").update(form).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trust_badges").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-badges"] });
      setDialogOpen(false);
      setEditingId(null);
      toast({ title: "Badge salvo!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trust_badges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-badges"] });
      toast({ title: "Badge removido!" });
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Trust Badges</h2>
        <Button onClick={() => { setEditingId(null); setForm({ title: "", description: "", icon: "shield", color: "blue", active: true, sort_order: 0 }); setDialogOpen(true); }} className="bg-marketplace-red hover:bg-marketplace-red/90">
          <Plus className="w-4 h-4 mr-1" /> Novo Badge
        </Button>
      </div>

      <div className="grid gap-3">
        {badges?.map((badge) => (
          <div key={badge.id} className="bg-card rounded-lg border border-border p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{badge.title}</p>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
              <span className="text-[10px] text-muted-foreground">Ícone: {badge.icon} • Cor: {badge.color}</span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => {
                setEditingId(badge.id);
                setForm({ title: badge.title, description: badge.description || "", icon: badge.icon, color: badge.color || "blue", active: badge.active ?? true, sort_order: badge.sort_order || 0 });
                setDialogOpen(true);
              }}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { if (confirm("Remover?")) deleteMutation.mutate(badge.id); }}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Badge" : "Novo Badge"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-3">
            <div className="space-y-1"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Ícone (Lucide)</Label><Input value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Cor</Label><Input value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm((p) => ({ ...p, active: v }))} />
              <Label>Ativo</Label>
            </div>
            <Button type="submit" className="w-full bg-marketplace-red hover:bg-marketplace-red/90" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBadges;
