import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Store, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface StoreForm {
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  active: boolean;
  rating: number;
  total_sales: string;
}

const emptyForm: StoreForm = {
  name: "",
  slug: "",
  description: "",
  logo_url: "",
  active: true,
  rating: 5.0,
  total_sales: "0",
};

const AdminStores = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StoreForm>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productsDialogOpen, setProductsDialogOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const { data: stores, isLoading } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, slug")
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: storeProducts } = useQuery({
    queryKey: ["store-products", selectedStoreId],
    queryFn: async () => {
      if (!selectedStoreId) return [];
      const { data, error } = await supabase
        .from("store_products")
        .select("product_id")
        .eq("store_id", selectedStoreId);
      if (error) throw error;
      return data.map((sp) => sp.product_id);
    },
    enabled: !!selectedStoreId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: StoreForm & { id?: string }) => {
      const { id, ...rest } = data;
      if (id) {
        const { error } = await supabase.from("stores").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("stores").insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      toast({ title: editingId ? "Loja atualizada" : "Loja criada" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      toast({ title: "Loja removida" });
    },
  });

  const toggleProductMutation = useMutation({
    mutationFn: async ({ storeId, productId, add }: { storeId: string; productId: string; add: boolean }) => {
      if (add) {
        const { error } = await supabase.from("store_products").insert({ store_id: storeId, product_id: productId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_products").delete().eq("store_id", storeId).eq("product_id", productId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-products", selectedStoreId] });
    },
  });

  const handleEdit = (store: any) => {
    setEditingId(store.id);
    setForm({
      name: store.name,
      slug: store.slug,
      description: store.description || "",
      logo_url: store.logo_url || "",
      active: store.active ?? true,
      rating: Number(store.rating) || 5.0,
      total_sales: store.total_sales || "0",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.slug) {
      toast({ title: "Preencha nome e slug", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ ...form, id: editingId || undefined });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lojas</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas vitrines</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) { setEditingId(null); setForm(emptyForm); }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nova Loja</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Loja" : "Nova Loja"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name,
                      slug: editingId ? f.slug : generateSlug(name),
                    }));
                  }}
                  placeholder="Minha Loja"
                />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="minha-loja"
                />
                <p className="text-xs text-muted-foreground mt-1">/loja/{form.slug || "..."}</p>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Descrição da loja"
                />
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input
                  value={form.logo_url}
                  onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
                <Label>Ativa</Label>
              </div>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products assignment dialog */}
      <Dialog open={productsDialogOpen} onOpenChange={setProductsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Produtos da Loja</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {products?.map((product) => {
              const isLinked = storeProducts?.includes(product.id) ?? false;
              return (
                <label key={product.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                  <Checkbox
                    checked={isLinked}
                    onCheckedChange={(checked) => {
                      if (selectedStoreId) {
                        toggleProductMutation.mutate({
                          storeId: selectedStoreId,
                          productId: product.id,
                          add: !!checked,
                        });
                      }
                    }}
                  />
                  <span className="text-sm">{product.title}</span>
                </label>
              );
            })}
            {(!products || products.length === 0) && (
              <p className="text-sm text-muted-foreground">Nenhum produto cadastrado</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {stores?.map((store) => (
          <Card key={store.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt={store.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Store className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base">{store.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">/loja/{store.slug}</p>
                  </div>
                  <Badge variant={store.active ? "default" : "secondary"}>
                    {store.active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedStoreId(store.id);
                      setProductsDialogOpen(true);
                    }}
                  >
                    Produtos
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleEdit(store)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (confirm("Remover esta loja?")) deleteMutation.mutate(store.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={`/loja/${store.slug}`} target="_blank" rel="noopener">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardHeader>
            {store.description && (
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">{store.description}</p>
              </CardContent>
            )}
          </Card>
        ))}
        {(!stores || stores.length === 0) && (
          <p className="text-muted-foreground text-center py-8">Nenhuma loja criada ainda</p>
        )}
      </div>
    </div>
  );
};

export default AdminStores;
