import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Star } from "lucide-react";

interface ReviewForm {
  product_id: string;
  user_name: string;
  user_avatar_url: string;
  city: string;
  rating: number;
  comment: string;
  photos: string[];
}

const emptyForm: ReviewForm = {
  product_id: "",
  user_name: "",
  user_avatar_url: "",
  city: "",
  rating: 5,
  comment: "",
  photos: [],
};

const AdminReviews = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ReviewForm>(emptyForm);
  const [photoInput, setPhotoInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, title").order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, products(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ReviewForm) => {
      const { error } = await supabase.from("reviews").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      setDialogOpen(false);
      setForm(emptyForm);
      toast({ title: "Avaliação cadastrada!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: "Avaliação removida!" });
    },
  });

  const addPhoto = () => {
    if (photoInput.trim()) {
      setForm((prev) => ({ ...prev, photos: [...prev.photos, photoInput.trim()] }));
      setPhotoInput("");
    }
  };

  const removePhoto = (index: number) => {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
  };

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Avaliações</h2>
        <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }} className="bg-marketplace-red hover:bg-marketplace-red/90">
          <Plus className="w-4 h-4 mr-1" /> Nova Avaliação
        </Button>
      </div>

      <div className="grid gap-3">
        {reviews?.map((review: any) => (
          <div key={review.id} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {review.user_avatar_url && (
                  <img src={review.user_avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">{review.user_name}</p>
                  <p className="text-xs text-muted-foreground">{review.city}</p>
                  <div className="flex gap-0.5 mt-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-marketplace-yellow text-marketplace-yellow" : "text-border"}`} />
                    ))}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { if (confirm("Remover?")) deleteMutation.mutate(review.id); }}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
            <p className="text-xs text-foreground mt-2">{review.comment}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Produto: {review.products?.title}</p>
          </div>
        ))}
        {reviews?.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma avaliação</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Avaliação</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-3">
            <div className="space-y-1">
              <Label>Produto</Label>
              <Select value={form.product_id} onValueChange={(v) => setForm((p) => ({ ...p, product_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {products?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input value={form.user_name} onChange={(e) => setForm((p) => ({ ...p, user_name: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="São Paulo, SP" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>URL do Avatar</Label>
              <Input value={form.user_avatar_url} onChange={(e) => setForm((p) => ({ ...p, user_avatar_url: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Nota (1-5)</Label>
              <Select value={String(form.rating)} onValueChange={(v) => setForm((p) => ({ ...p, rating: parseInt(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} estrela{n > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Comentário</Label>
              <Textarea value={form.comment} onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Fotos</Label>
              {form.photos.map((photo, i) => (
                <div key={i} className="flex items-center gap-2">
                  <img src={photo} alt="" className="w-10 h-10 rounded object-cover" />
                  <span className="flex-1 text-xs truncate">{photo}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removePhoto(i)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input placeholder="URL da foto" value={photoInput} onChange={(e) => setPhotoInput(e.target.value)} />
                <Button type="button" variant="outline" size="sm" onClick={addPhoto}>+</Button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-marketplace-red hover:bg-marketplace-red/90" disabled={saveMutation.isPending || !form.product_id}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReviews;
