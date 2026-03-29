import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

const AdminPixels = () => {
  const [newPixelId, setNewPixelId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pixels, isLoading } = useQuery({
    queryKey: ["admin-tracking-pixels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracking_pixels" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tracking_pixels" as any)
        .insert({ pixel_id: newPixelId.trim(), platform: "tiktok" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracking-pixels"] });
      setNewPixelId("");
      toast({ title: "Pixel adicionado!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("tracking_pixels" as any)
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-tracking-pixels"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tracking_pixels" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracking-pixels"] });
      toast({ title: "Pixel removido!" });
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-lg font-bold text-foreground">Pixels de Rastreamento</h2>

      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <p className="text-sm font-semibold text-foreground">Adicionar Pixel do TikTok</p>
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Label>Pixel ID</Label>
            <Input
              value={newPixelId}
              onChange={(e) => setNewPixelId(e.target.value)}
              placeholder="Ex: CXXXXXXXXXXXXXXXXX"
            />
          </div>
          <Button
            onClick={() => addMutation.mutate()}
            disabled={!newPixelId.trim() || addMutation.isPending}
            className="bg-marketplace-red hover:bg-marketplace-red/90 self-end"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {pixels && pixels.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Pixels Cadastrados</p>
          {pixels.map((pixel: any) => (
            <div key={pixel.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">{pixel.pixel_id}</p>
                <p className="text-xs text-muted-foreground capitalize">{pixel.platform}</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={pixel.active}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: pixel.id, active: checked })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(pixel.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-muted/30 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">
          O evento <strong>Purchase</strong> será disparado automaticamente quando um pagamento PIX for gerado.
        </p>
      </div>
    </div>
  );
};

export default AdminPixels;
