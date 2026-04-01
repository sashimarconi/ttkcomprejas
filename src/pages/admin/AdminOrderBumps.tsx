import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Package, Edit2, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface OrderBumpForm {
  id?: string;
  title: string;
  bump_type: "existing" | "independent";
  product_id: string | null;
  image_url: string;
  price: number;
  original_price: number;
  active: boolean;
  sort_order: number;
  auto_add: boolean;
  mandatory: boolean;
  max_quantity: number;
  position: number;
  min_cart_value: number;
  max_cart_value: number;
  apply_to_all: boolean;
}

const emptyForm: OrderBumpForm = {
  title: "",
  bump_type: "existing",
  product_id: null,
  image_url: "",
  price: 0,
  original_price: 0,
  active: true,
  sort_order: 1,
  auto_add: false,
  mandatory: false,
  max_quantity: 1,
  position: 1,
  min_cart_value: 0,
  max_cart_value: 0,
  apply_to_all: true,
};

const AdminOrderBumps = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<OrderBumpForm>({ ...emptyForm });
  const [selectedTriggerProducts, setSelectedTriggerProducts] = useState<string[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [triggerSearch, setTriggerSearch] = useState("");

  const { data: bumps } = useQuery({
    queryKey: ["admin-order-bumps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_bumps")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, slug, sale_price, product_images(url)")
        .eq("active", true)
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (item: OrderBumpForm) => {
      const payload: any = {
        title: item.title,
        bump_type: item.bump_type,
        product_id: item.bump_type === "existing" ? item.product_id : null,
        image_url: item.bump_type === "independent" ? (item.image_url || null) : null,
        price: item.price,
        original_price: item.original_price,
        active: item.active,
        sort_order: item.sort_order,
        auto_add: item.auto_add,
        mandatory: item.mandatory,
        max_quantity: item.max_quantity,
        position: item.position,
        min_cart_value: item.min_cart_value,
        max_cart_value: item.max_cart_value,
        apply_to_all: item.apply_to_all,
      };

      let bumpId = item.id;

      if (item.id) {
        const { error } = await supabase.from("order_bumps").update(payload).eq("id", item.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("order_bumps").insert(payload).select("id").single();
        if (error) throw error;
        bumpId = data.id;
      }

      // Save trigger products
      if (!item.apply_to_all && bumpId) {
        await supabase.from("order_bump_products").delete().eq("order_bump_id", bumpId);
        if (selectedTriggerProducts.length > 0) {
          const rows = selectedTriggerProducts.map((pid) => ({ order_bump_id: bumpId!, product_id: pid }));
          const { error: insError } = await supabase.from("order_bump_products").insert(rows);
          if (insError) throw insError;
        }
      } else if (item.apply_to_all && bumpId) {
        await supabase.from("order_bump_products").delete().eq("order_bump_id", bumpId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order-bumps"] });
      setDialogOpen(false);
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

  const openCreate = () => {
    setForm({ ...emptyForm });
    setSelectedTriggerProducts([]);
    setAdvancedOpen(false);
    setTriggerSearch("");
    setDialogOpen(true);
  };

  const openEdit = async (bump: any) => {
    setForm({
      id: bump.id,
      title: bump.title,
      bump_type: bump.bump_type || "independent",
      product_id: bump.product_id || null,
      image_url: bump.image_url || "",
      price: Number(bump.price),
      original_price: Number(bump.original_price || 0),
      active: bump.active ?? true,
      sort_order: bump.sort_order ?? 1,
      auto_add: bump.auto_add ?? false,
      mandatory: bump.mandatory ?? false,
      max_quantity: bump.max_quantity ?? 1,
      position: bump.position ?? 1,
      min_cart_value: Number(bump.min_cart_value || 0),
      max_cart_value: Number(bump.max_cart_value || 0),
      apply_to_all: bump.apply_to_all ?? true,
    });
    // Load trigger products
    const { data } = await supabase
      .from("order_bump_products")
      .select("product_id")
      .eq("order_bump_id", bump.id);
    setSelectedTriggerProducts(data?.map((r: any) => r.product_id as string) || []);
    setAdvancedOpen(false);
    setTriggerSearch("");
    setDialogOpen(true);
  };

  const toggleTriggerProduct = (pid: string) => {
    setSelectedTriggerProducts((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  const handleProductSelect = (productId: string) => {
    const product = products?.find((p) => p.id === productId);
    setForm((prev) => ({
      ...prev,
      product_id: productId,
      title: prev.title || product?.title || "",
      price: prev.price || product?.sale_price || 0,
    }));
  };

  const filteredTriggerProducts = products?.filter(
    (p) => !triggerSearch || p.title.toLowerCase().includes(triggerSearch.toLowerCase())
  );

  const getProductImage = (product: any) => {
    return product?.product_images?.[0]?.url || "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Order Bumps</h2>
          <p className="text-sm text-muted-foreground">Gerencie ofertas adicionais para aumentar o valor médio dos pedidos</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Novo Order Bump
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {bumps?.map((bump) => {
          const linkedProduct = bump.product_id ? products?.find((p) => p.id === bump.product_id) : null;
          const imgUrl = bump.image_url || (linkedProduct ? getProductImage(linkedProduct) : "");
          return (
            <div key={bump.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
              {imgUrl && <img src={imgUrl} alt={bump.title} className="w-12 h-12 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-1">{bump.title}</p>
                <div className="flex items-center gap-2">
                  {Number(bump.original_price) > 0 && (
                    <span className="text-xs text-muted-foreground line-through">R$ {Number(bump.original_price).toFixed(2)}</span>
                  )}
                  <span className="text-xs text-primary font-semibold">R$ {Number(bump.price).toFixed(2)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${bump.active ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                    {bump.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(bump)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(bump.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
        {(!bumps || bumps.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum order bump cadastrado</p>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Order Bump" : "Criar Order Bump"}</DialogTitle>
            <p className="text-sm text-muted-foreground">Configure uma oferta adicional para aumentar suas vendas</p>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status */}
            <div className="bg-muted/30 border border-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Status da Oferta</p>
                <p className="text-xs text-muted-foreground">Defina se a oferta estará ativa ou inativa</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${form.active ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                  {form.active ? "Ativo" : "Inativo"}
                </span>
              </div>
            </div>

            {/* Tipo de Produto */}
            <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Tipo de Produto</p>
                <p className="text-xs text-muted-foreground">Escolha como você quer configurar sua oferta</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, bump_type: "existing" })}
                  className={`text-left p-4 rounded-xl border-2 transition-colors ${form.bump_type === "existing" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Package className="w-5 h-5 text-primary" />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.bump_type === "existing" ? "border-primary" : "border-muted-foreground/40"}`}>
                      {form.bump_type === "existing" && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-foreground">Produto Existente</p>
                  <p className="text-xs text-muted-foreground mt-1">Usar um produto já cadastrado na sua loja</p>
                  <div className="mt-2 space-y-1 text-xs text-green-400">
                    <p>✓ Mantém consistência com seu catálogo</p>
                    <p>✓ Controle de estoque unificado</p>
                    <p>✓ Ideal para cross-selling</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, bump_type: "independent" })}
                  className={`text-left p-4 rounded-xl border-2 transition-colors ${form.bump_type === "independent" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Plus className="w-5 h-5 text-primary" />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.bump_type === "independent" ? "border-primary" : "border-muted-foreground/40"}`}>
                      {form.bump_type === "independent" && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-foreground">Produto Independente</p>
                  <p className="text-xs text-muted-foreground mt-1">Criar um produto exclusivo para este order bump</p>
                  <div className="mt-2 space-y-1 text-xs text-green-400">
                    <p>✓ Configuração totalmente personalizada</p>
                    <p>✓ Não afeta seu catálogo principal</p>
                    <p>✓ Perfeito para ofertas exclusivas</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Informações Básicas */}
            <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Informações Básicas</p>
                <p className="text-xs text-muted-foreground">Configure o título que será exibido no checkout</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Título do OrderBump</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Oferta Especial de Verão"
                />
                <p className="text-[11px] text-muted-foreground">Este título aparecerá no checkout para seus clientes</p>
              </div>
            </div>

            {/* Produto Existente */}
            {form.bump_type === "existing" && (
              <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Produto Existente</p>
                  <p className="text-xs text-muted-foreground">Selecione um produto do seu catálogo</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Selecionar Produto</Label>
                  <Select value={form.product_id || ""} onValueChange={handleProductSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Produto Independente - imagem */}
            {form.bump_type === "independent" && (
              <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Imagem do Produto</p>
                  <p className="text-xs text-muted-foreground">URL da imagem para exibir no checkout</p>
                </div>
                <Input
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            )}

            {/* Configuração de Preços */}
            <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Configuração de Preços</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Preço Original (De:)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.original_price}
                    onChange={(e) => setForm({ ...form, original_price: Number(e.target.value) })}
                    placeholder="R$ 0,00"
                  />
                  <p className="text-[11px] text-muted-foreground">Opcional - preço riscado para comparação</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Preço da Oferta</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    placeholder="R$ 0,00"
                  />
                  <p className="text-[11px] text-muted-foreground">Preço que o cliente vai pagar</p>
                </div>
              </div>
            </div>

            {/* Produtos Gatilho */}
            <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Produtos Gatilho</p>
                <p className="text-xs text-muted-foreground">Defina quando esta oferta será exibida aos clientes. Selecione um ou mais produtos.</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.apply_to_all}
                  onCheckedChange={(v) => setForm({ ...form, apply_to_all: v })}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Aplicar em todos os produtos</p>
                  <p className="text-xs text-muted-foreground">Se desativado, você poderá escolher um ou mais produtos específicos</p>
                </div>
              </div>

              {!form.apply_to_all && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Buscar produto..."
                      value={triggerSearch}
                      onChange={(e) => setTriggerSearch(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {products?.length || 0} produto(s) na loja
                    </span>
                  </div>
                  <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                    {filteredTriggerProducts?.map((p) => (
                      <label key={p.id} className="flex items-center gap-3 p-2.5 hover:bg-muted/50 cursor-pointer">
                        <Checkbox
                          checked={selectedTriggerProducts.includes(p.id)}
                          onCheckedChange={() => toggleTriggerProduct(p.id)}
                        />
                        {getProductImage(p) && (
                          <img src={getProductImage(p)} alt={p.title} className="w-8 h-8 rounded object-cover" />
                        )}
                        <span className="text-sm text-foreground flex-1 line-clamp-1">{p.title}</span>
                        <span className="text-xs text-muted-foreground font-medium">R$ {Number(p.sale_price).toFixed(2)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Configurações Avançadas */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <div className="bg-muted/30 border border-border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Configurações Avançadas</p>
                    <p className="text-xs text-muted-foreground">Opções adicionais para personalizar o comportamento</p>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm">
                      {advancedOpen ? "▼ Ocultar" : "▶ Mostrar"}
                    </Button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent className="mt-4 space-y-4">
                  {/* Comportamento */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Comportamento</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border border-border rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <Switch checked={form.auto_add} onCheckedChange={(v) => setForm({ ...form, auto_add: v })} />
                          <span className="text-sm font-medium text-foreground">Adicionar automaticamente</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Adiciona o produto automaticamente ao carrinho</p>
                      </div>
                      <div className="border border-border rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <Switch checked={form.mandatory} onCheckedChange={(v) => setForm({ ...form, mandatory: v })} />
                          <span className="text-sm font-medium text-foreground">Oferta obrigatória</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Cliente deve aceitar para continuar</p>
                      </div>
                    </div>
                  </div>

                  {/* Limites e Restrições */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Limites e Restrições</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Qtd. Máxima</Label>
                        <Input type="number" value={form.max_quantity} onChange={(e) => setForm({ ...form, max_quantity: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Posição</Label>
                        <Input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Ordem</Label>
                        <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                      </div>
                    </div>
                  </div>

                  {/* Condições do Carrinho */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Condições do Carrinho</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Valor Mínimo</Label>
                        <Input type="number" step="0.01" value={form.min_cart_value} onChange={(e) => setForm({ ...form, min_cart_value: Number(e.target.value) })} />
                        <p className="text-[11px] text-muted-foreground">Valor mínimo do carrinho para exibir</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor Máximo</Label>
                        <Input type="number" step="0.01" value={form.max_cart_value} onChange={(e) => setForm({ ...form, max_cart_value: Number(e.target.value) })} />
                        <p className="text-[11px] text-muted-foreground">Valor máximo do carrinho para exibir</p>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                {form.id ? "Salvar Alterações" : "Criar Order Bump"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrderBumps;
