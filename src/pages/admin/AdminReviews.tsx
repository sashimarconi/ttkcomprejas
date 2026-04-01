import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Star, Upload, Pencil } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReviewForm {
  id?: string;
  product_id: string;
  user_name: string;
  user_avatar_url: string;
  city: string;
  rating: number;
  comment: string;
  photos: string[];
  selected_product_ids: string[];
}

const emptyForm: ReviewForm = {
  product_id: "",
  user_name: "",
  user_avatar_url: "",
  city: "",
  rating: 5,
  comment: "",
  photos: [],
  selected_product_ids: [],
};

const AdminReviews = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ReviewForm>(emptyForm);
  const [photoInput, setPhotoInput] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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

      // Fetch review_products for each review
      const reviewIds = (data || []).map((r: any) => r.id);
      let reviewProductsMap: Record<string, string[]> = {};
      if (reviewIds.length) {
        const { data: rp } = await supabase
          .from("review_products")
          .select("review_id, product_id")
          .in("review_id", reviewIds);
        (rp || []).forEach((item: any) => {
          if (!reviewProductsMap[item.review_id]) reviewProductsMap[item.review_id] = [];
          reviewProductsMap[item.review_id].push(item.product_id);
        });
      }

      return (data || []).map((r: any) => ({
        ...r,
        selected_product_ids: reviewProductsMap[r.id] || [],
      }));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ReviewForm) => {
      if (data.id) {
        // Update existing review
        const { error } = await supabase.from("reviews").update({
          product_id: data.product_id,
          user_name: data.user_name,
          user_avatar_url: data.user_avatar_url,
          city: data.city,
          rating: data.rating,
          comment: data.comment,
          photos: data.photos,
        }).eq("id", data.id);
        if (error) throw error;

        // Update review_products
        await supabase.from("review_products").delete().eq("review_id", data.id);
        if (data.selected_product_ids.length) {
          const { error: rpError } = await supabase.from("review_products").insert(
            data.selected_product_ids.map((pid) => ({ review_id: data.id!, product_id: pid }))
          );
          if (rpError) throw rpError;
        }
      } else {
        // Insert new review
        const { data: newReview, error } = await supabase.from("reviews").insert({
          product_id: data.product_id,
          user_name: data.user_name,
          user_avatar_url: data.user_avatar_url,
          city: data.city,
          rating: data.rating,
          comment: data.comment,
          photos: data.photos,
        }).select("id").single();
        if (error) throw error;

        // Insert review_products
        if (data.selected_product_ids.length && newReview) {
          await supabase.from("review_products").insert(
            data.selected_product_ids.map((pid) => ({ review_id: newReview.id, product_id: pid }))
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      setDialogOpen(false);
      setForm(emptyForm);
      toast({ title: form.id ? "Avaliação atualizada!" : "Avaliação cadastrada!" });
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    setUploadingPhoto(true);
    const ext = file.name.split(".").pop();
    const path = `reviews/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
      setUploadingPhoto(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm((prev) => ({ ...prev, photos: [...prev.photos, urlData.publicUrl] }));
    setUploadingPhoto(false);
    e.target.value = "";
  };

  const openEdit = (review: any) => {
    setForm({
      id: review.id,
      product_id: review.product_id,
      user_name: review.user_name,
      user_avatar_url: review.user_avatar_url || "",
      city: review.city || "",
      rating: review.rating,
      comment: review.comment || "",
      photos: review.photos || [],
      selected_product_ids: review.selected_product_ids || [],
    });
    setDialogOpen(true);
  };

  const toggleProductSelection = (productId: string) => {
    setForm((prev) => {
      const ids = prev.selected_product_ids.includes(productId)
        ? prev.selected_product_ids.filter((id) => id !== productId)
        : [...prev.selected_product_ids, productId];
      return { ...prev, selected_product_ids: ids };
    });
  };

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Avaliações</h2>
        <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }} className="bg-primary hover:bg-primary/90">
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
                      <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-border"}`} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(review)}>
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { if (confirm("Remover?")) deleteMutation.mutate(review.id); }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-foreground mt-2">{review.comment}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="text-[10px] text-muted-foreground">Produto principal: {review.products?.title}</span>
              {review.selected_product_ids?.length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  · Aparece em {review.selected_product_ids.length} produto(s)
                </span>
              )}
            </div>
          </div>
        ))}
        {reviews?.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma avaliação</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Avaliação" : "Nova Avaliação"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-3">
            <div className="space-y-1">
              <Label>Produto principal</Label>
              <Select value={form.product_id} onValueChange={(v) => setForm((p) => ({ ...p, product_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {products?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Exibir também nos produtos</Label>
              <div className="max-h-32 overflow-y-auto border border-border rounded-md p-2 space-y-1">
                {products?.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.selected_product_ids.includes(p.id)}
                      onCheckedChange={() => toggleProductSelection(p.id)}
                    />
                    {p.title}
                  </label>
                ))}
              </div>
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
              <div className="flex gap-2 items-center">
                <label className="cursor-pointer flex items-center gap-1 text-xs text-muted-foreground border border-border rounded px-3 py-1.5 hover:bg-accent transition">
                  <Upload className="w-3 h-3" />
                  {uploadingPhoto ? "Enviando..." : "Upload foto"}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                </label>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending || !form.product_id}>
              {saveMutation.isPending ? "Salvando..." : form.id ? "Atualizar" : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReviews;
