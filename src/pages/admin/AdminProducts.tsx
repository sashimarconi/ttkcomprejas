import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Image as ImageIcon, Palette, ChevronDown, ChevronUp } from "lucide-react";

interface ProductForm {
  slug: string;
  title: string;
  description: string;
  original_price: number;
  sale_price: number;
  discount_percent: number;
  promo_tag: string;
  flash_sale: boolean;
  flash_sale_ends_in: string;
  free_shipping: boolean;
  shipping_cost: number;
  estimated_delivery: string;
  checkout_type: string;
  external_checkout_url: string;
  thank_you_url: string;
  rating: number;
  review_count: number;
  sold_count: number;
  active: boolean;
  video_url: string;
}

const emptyForm: ProductForm = {
  slug: "",
  title: "",
  description: "",
  original_price: 0,
  sale_price: 0,
  discount_percent: 0,
  promo_tag: "",
  flash_sale: false,
  flash_sale_ends_in: "",
  free_shipping: true,
  shipping_cost: 0,
  estimated_delivery: "",
  checkout_type: "external",
  external_checkout_url: "",
  thank_you_url: "",
  rating: 5.0,
  review_count: 0,
  sold_count: 0,
  active: true,
  video_url: "",
};

const AdminProducts = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageAlt, setNewImageAlt] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantColor, setNewVariantColor] = useState("");
  const [newVariantThumbnail, setNewVariantThumbnail] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(id, url, alt, sort_order)")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: productImages } = useQuery({
    queryKey: ["product-images", selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return [];
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", selectedProductId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProductId,
  });

  const { data: variantGroups } = useQuery({
    queryKey: ["variant-groups", selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return [];
      const { data, error } = await supabase
        .from("variant_groups")
        .select("*")
        .eq("product_id", selectedProductId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProductId,
  });

  const { data: productVariants } = useQuery({
    queryKey: ["product-variants", selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return [];
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", selectedProductId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProductId,
  });

  const invalidateVariants = () => {
    queryClient.invalidateQueries({ queryKey: ["variant-groups", selectedProductId] });
    queryClient.invalidateQueries({ queryKey: ["product-variants", selectedProductId] });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      if (editingId) {
        const { error } = await supabase.from("products").update(data).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? "Produto atualizado!" : "Produto criado!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "Produto removido!" });
    },
  });

  const addImageMutation = useMutation({
    mutationFn: async ({ product_id, url, alt }: { product_id: string; url: string; alt: string }) => {
      const { error } = await supabase.from("product_images").insert({ product_id, url, alt });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-images", selectedProductId] });
      setNewImageUrl("");
      setNewImageAlt("");
      toast({ title: "Imagem adicionada!" });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_images").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-images", selectedProductId] });
    },
  });

  const addGroupMutation = useMutation({
    mutationFn: async ({ product_id, name }: { product_id: string; name: string }) => {
      const { error } = await supabase.from("variant_groups").insert({ product_id, name });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateVariants();
      setNewGroupName("");
      toast({ title: "Categoria criada!" });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("variant_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateVariants();
      toast({ title: "Categoria removida!" });
    },
  });

  const addVariantMutation = useMutation({
    mutationFn: async ({ product_id, name, color, thumbnail_url, variant_group_id }: {
      product_id: string; name: string; color: string; thumbnail_url: string; variant_group_id: string;
    }) => {
      const { error } = await supabase.from("product_variants").insert({
        product_id,
        name,
        color: color || null,
        thumbnail_url: thumbnail_url || null,
        variant_group_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateVariants();
      setNewVariantName("");
      setNewVariantColor("");
      setNewVariantThumbnail("");
      toast({ title: "Opção adicionada!" });
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_variants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateVariants();
    },
  });

  const openEdit = (product: any) => {
    setEditingId(product.id);
    setForm({
      slug: product.slug,
      title: product.title,
      description: product.description || "",
      original_price: product.original_price,
      sale_price: product.sale_price,
      discount_percent: product.discount_percent,
      promo_tag: product.promo_tag || "",
      flash_sale: product.flash_sale || false,
      flash_sale_ends_in: product.flash_sale_ends_in || "",
      free_shipping: product.free_shipping ?? true,
      shipping_cost: product.shipping_cost || 0,
      estimated_delivery: product.estimated_delivery || "",
      checkout_type: product.checkout_type,
      external_checkout_url: product.external_checkout_url || "",
      thank_you_url: product.thank_you_url || "",
      rating: product.rating || 5,
      review_count: product.review_count || 0,
      sold_count: product.sold_count || 0,
      active: product.active ?? true,
      video_url: product.video_url || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const updateField = (field: keyof ProductForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Produtos</h2>
        <Button onClick={() => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); }} className="bg-marketplace-red hover:bg-marketplace-red/90">
          <Plus className="w-4 h-4 mr-1" /> Novo Produto
        </Button>
      </div>

      {/* Products list */}
      <div className="grid gap-3">
        {products?.map((product) => (
          <div key={product.id} className="bg-card rounded-lg border border-border p-4 flex items-center gap-4">
            {product.product_images?.[0] ? (
              <img src={product.product_images[0].url} alt="" className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{product.title}</p>
              <p className="text-xs text-muted-foreground">
                R$ {Number(product.sale_price).toFixed(2).replace(".", ",")} • {product.sold_count} vendidos
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${product.active ? "bg-marketplace-green/10 text-marketplace-green" : "bg-muted text-muted-foreground"}`}>
                  {product.active ? "Ativo" : "Inativo"}
                </span>
                <span className="text-[10px] text-muted-foreground">{product.checkout_type === "pix" ? "PIX" : "Link externo"}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedProductId(product.id); setVariantDialogOpen(true); }} title="Variantes">
                <Palette className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedProductId(product.id); setImageDialogOpen(true); }}>
                <ImageIcon className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openEdit(product)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { if (confirm("Remover este produto?")) deleteMutation.mutate(product.id); }}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {products?.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhum produto cadastrado</p>
        )}
      </div>

      {/* Product form dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Slug (URL)</Label>
                <Input value={form.slug} onChange={(e) => updateField("slug", e.target.value)} placeholder="meu-produto" required />
              </div>
              <div className="space-y-1">
                <Label>Tag Promo</Label>
                <Input value={form.promo_tag} onChange={(e) => updateField("promo_tag", e.target.value)} placeholder="Promo do Mês" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => updateField("title", e.target.value)} required />
            </div>

            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={3} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Preço original</Label>
                <Input type="number" step="0.01" value={form.original_price} onChange={(e) => updateField("original_price", parseFloat(e.target.value))} required />
              </div>
              <div className="space-y-1">
                <Label>Preço venda</Label>
                <Input type="number" step="0.01" value={form.sale_price} onChange={(e) => updateField("sale_price", parseFloat(e.target.value))} required />
              </div>
              <div className="space-y-1">
                <Label>Desconto %</Label>
                <Input type="number" value={form.discount_percent} onChange={(e) => updateField("discount_percent", parseInt(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Avaliação</Label>
                <Input type="number" step="0.1" value={form.rating} onChange={(e) => updateField("rating", parseFloat(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Nº Avaliações</Label>
                <Input type="number" value={form.review_count} onChange={(e) => updateField("review_count", parseInt(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Vendidos</Label>
                <Input type="number" value={form.sold_count} onChange={(e) => updateField("sold_count", parseInt(e.target.value))} />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.flash_sale} onCheckedChange={(v) => updateField("flash_sale", v)} />
                <Label>Oferta Relâmpago</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.free_shipping} onCheckedChange={(v) => updateField("free_shipping", v)} />
                <Label>Frete Grátis</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={(v) => updateField("active", v)} />
                <Label>Ativo</Label>
              </div>
            </div>

            {form.flash_sale && (
              <div className="space-y-1">
                <Label>Termina em</Label>
                <Input value={form.flash_sale_ends_in} onChange={(e) => updateField("flash_sale_ends_in", e.target.value)} placeholder="2 dia(s)" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Custo frete</Label>
                <Input type="number" step="0.01" value={form.shipping_cost} onChange={(e) => updateField("shipping_cost", parseFloat(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Entrega estimada</Label>
                <Input value={form.estimated_delivery} onChange={(e) => updateField("estimated_delivery", e.target.value)} placeholder="20 de março" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Tipo de Checkout</Label>
              <Select value={form.checkout_type} onValueChange={(v) => updateField("checkout_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">Link Externo</SelectItem>
                  <SelectItem value="pix">PIX (API)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.checkout_type === "external" && (
              <div className="space-y-1">
                <Label>URL do Checkout</Label>
                <Input value={form.external_checkout_url} onChange={(e) => updateField("external_checkout_url", e.target.value)} placeholder="https://pay.hotmart.com/..." />
              </div>
            )}

            <div className="space-y-1">
              <Label>Página de Obrigado (Upsell)</Label>
              <Input value={form.thank_you_url} onChange={(e) => updateField("thank_you_url", e.target.value)} placeholder="https://seusite.com/obrigado" />
              <p className="text-xs text-muted-foreground">Link externo para redirecionar o cliente após o pagamento ser confirmado</p>
            </div>

              <Label>Vídeo (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  value={form.video_url}
                  onChange={(e) => updateField("video_url", e.target.value)}
                  placeholder="https://exemplo.com/video.mp4"
                  className="flex-1"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/ogg"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 50 * 1024 * 1024) {
                        toast({ title: "Arquivo muito grande", description: "Máximo 50MB", variant: "destructive" });
                        return;
                      }
                      const ext = file.name.split(".").pop();
                      const fileName = `videos/${Date.now()}.${ext}`;
                      const { error } = await supabase.storage.from("product-images").upload(fileName, file);
                      if (error) {
                        toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
                        return;
                      }
                      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
                      updateField("video_url", urlData.publicUrl);
                      toast({ title: "Vídeo enviado!" });
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" className="h-9" asChild>
                    <span>Upload</span>
                  </Button>
                </label>
              </div>
              {form.video_url && (
                <video src={form.video_url} className="w-full h-32 rounded-lg object-cover" muted />
              )}
              <p className="text-[10px] text-muted-foreground">Cole uma URL ou faça upload. Será exibido como primeiro item na galeria.</p>
            </div>

            <Button type="submit" className="w-full bg-marketplace-red hover:bg-marketplace-red/90" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Images dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Imagens do Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {productImages?.map((img) => (
              <div key={img.id} className="flex items-center gap-3 bg-muted/50 p-2 rounded-lg">
                <img src={img.url} alt={img.alt || ""} className="w-14 h-14 rounded object-cover" />
                <span className="flex-1 text-xs text-muted-foreground truncate">{img.alt || img.url}</span>
                <Button variant="ghost" size="sm" onClick={() => deleteImageMutation.mutate(img.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}

            <div className="border-t border-border pt-3 space-y-2">
              <Input placeholder="URL da imagem" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} />
              <Input placeholder="Texto alternativo" value={newImageAlt} onChange={(e) => setNewImageAlt(e.target.value)} />
              <Button
                className="w-full"
                disabled={!newImageUrl || !selectedProductId}
                onClick={() => selectedProductId && addImageMutation.mutate({ product_id: selectedProductId, url: newImageUrl, alt: newImageAlt })}
              >
                <Plus className="w-4 h-4 mr-1" /> Adicionar Imagem
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Variants dialog - grouped */}
      <Dialog open={variantDialogOpen} onOpenChange={(open) => {
        setVariantDialogOpen(open);
        if (!open) {
          setExpandedGroupId(null);
          setNewGroupName("");
          setNewVariantName("");
          setNewVariantColor("");
          setNewVariantThumbnail("");
        }
      }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Variantes do Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Create new group */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Nova categoria de variante</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Tamanho, Cor, Voltagem..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  disabled={!newGroupName || !selectedProductId}
                  onClick={() => selectedProductId && addGroupMutation.mutate({ product_id: selectedProductId, name: newGroupName })}
                >
                  <Plus className="w-4 h-4 mr-1" /> Criar
                </Button>
              </div>
            </div>

            {/* Existing groups */}
            {variantGroups?.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Crie uma categoria (ex: "Tamanho", "Cor") para adicionar opções de variante.
              </p>
            )}

            {variantGroups?.map((group) => {
              const groupVariants = (productVariants || []).filter((v) => v.variant_group_id === group.id);
              const isExpanded = expandedGroupId === group.id;

              return (
                <div key={group.id} className="border border-border rounded-lg overflow-hidden">
                  {/* Group header */}
                  <div
                    className="flex items-center justify-between px-3 py-2.5 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      <span className="text-sm font-semibold text-foreground">{group.name}</span>
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {groupVariants.length} opções
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remover categoria "${group.name}" e todas suas opções?`)) {
                          deleteGroupMutation.mutate(group.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>

                  {/* Group content */}
                  {isExpanded && (
                    <div className="p-3 space-y-3">
                      {/* Existing variants in this group */}
                      {groupVariants.map((v) => (
                        <div key={v.id} className="flex items-center gap-3 bg-muted/20 p-2 rounded-lg">
                          {v.thumbnail_url ? (
                            <img src={v.thumbnail_url} alt={v.name} className="w-10 h-10 rounded object-cover border" />
                          ) : v.color ? (
                            <div className="w-10 h-10 rounded border" style={{ backgroundColor: v.color }} />
                          ) : (
                            <div className="w-10 h-10 rounded border border-border bg-muted flex items-center justify-center">
                              <span className="text-xs font-medium text-muted-foreground">{v.name.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{v.name}</p>
                            {v.color && <p className="text-[10px] text-muted-foreground">{v.color}</p>}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => deleteVariantMutation.mutate(v.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}

                      {/* Add new variant to this group */}
                      <div className="border-t border-border pt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Adicionar opção</p>
                        <Input
                          placeholder="Nome (ex: P, M, G, Preta, 110V...)"
                          value={expandedGroupId === group.id ? newVariantName : ""}
                          onChange={(e) => setNewVariantName(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <Label className="text-[10px] whitespace-nowrap text-muted-foreground">Cor (opcional)</Label>
                            <Input
                              type="color"
                              value={newVariantColor || "#000000"}
                              onChange={(e) => setNewVariantColor(e.target.value)}
                              className="w-8 h-8 p-0.5 cursor-pointer"
                            />
                            <Input
                              value={newVariantColor}
                              onChange={(e) => setNewVariantColor(e.target.value)}
                              placeholder="Deixe vazio"
                              className="flex-1 text-xs"
                            />
                          </div>
                        </div>
                        <Input
                          placeholder="URL da thumbnail (opcional)"
                          value={expandedGroupId === group.id ? newVariantThumbnail : ""}
                          onChange={(e) => setNewVariantThumbnail(e.target.value)}
                          className="text-xs"
                        />
                        <Button
                          className="w-full"
                          size="sm"
                          disabled={!newVariantName || !selectedProductId}
                          onClick={() => {
                            if (selectedProductId) {
                              addVariantMutation.mutate({
                                product_id: selectedProductId,
                                name: newVariantName,
                                color: newVariantColor,
                                thumbnail_url: newVariantThumbnail,
                                variant_group_id: group.id,
                              });
                            }
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" /> Adicionar Opção
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
