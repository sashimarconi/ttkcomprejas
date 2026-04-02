import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowRight, Search, Settings, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Platform definitions for future expansion
const PLATFORMS = [
  {
    id: "tiktok",
    name: "TikTok Pixel",
    description: "Rastreie conversões e otimize campanhas no TikTok Ads",
    icon: "🎵",
    color: "bg-black text-white",
    enabled: true,
  },
  {
    id: "meta",
    name: "Meta Pixel",
    description: "Rastreie conversões e otimize campanhas no Meta Ads",
    icon: "📘",
    color: "bg-blue-600 text-white",
    enabled: false,
  },
  {
    id: "google_ads",
    name: "Google Ads",
    description: "Rastreie conversões e otimize campanhas no Google Ads",
    icon: "📊",
    color: "bg-yellow-500 text-white",
    enabled: false,
  },
  {
    id: "google_analytics",
    name: "Google Analytics 4",
    description: "Rastreie e analise o comportamento dos usuários em seu site",
    icon: "📈",
    color: "bg-orange-500 text-white",
    enabled: false,
  },
  {
    id: "kwai",
    name: "Kwai Pixel",
    description: "Rastreie conversões e otimize campanhas no Kwai Ads",
    icon: "🎬",
    color: "bg-orange-600 text-white",
    enabled: false,
  },
  {
    id: "gtm",
    name: "Google Tag Manager",
    description: "Gerencie tags e scripts do Google Analytics e outros serviços",
    icon: "🏷️",
    color: "bg-blue-500 text-white",
    enabled: false,
  },
];

type View = "grid" | "list" | "create" | "edit";

const AdminPixels = () => {
  const [view, setView] = useState<View>("grid");
  const [activePlatform, setActivePlatform] = useState<string>("tiktok");
  const [searchQuery, setSearchQuery] = useState("");
  const [newPixelName, setNewPixelName] = useState("");
  const [newPixelId, setNewPixelId] = useState("");
  const [newPixelActive, setNewPixelActive] = useState(true);
  const [fireOnPaidOnly, setFireOnPaidOnly] = useState(false);
  const [editingPixel, setEditingPixel] = useState<any>(null);
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
        .insert({
          pixel_id: newPixelId.trim(),
          platform: activePlatform,
          active: newPixelActive,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracking-pixels"] });
      setNewPixelId("");
      setNewPixelName("");
      setNewPixelActive(true);
      setFireOnPaidOnly(false);
      setView("list");
      toast({ title: "Pixel adicionado com sucesso!" });
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, pixel_id, active }: { id: string; pixel_id: string; active: boolean }) => {
      const { error } = await supabase
        .from("tracking_pixels" as any)
        .update({ pixel_id, active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracking-pixels"] });
      setEditingPixel(null);
      setView("list");
      toast({ title: "Pixel atualizado com sucesso!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const openEdit = (pixel: any) => {
    setEditingPixel({ ...pixel });
    setView("edit");
  };

  const platformPixels = (pixels || []).filter((p: any) => p.platform === activePlatform);
  const filteredPixels = platformPixels.filter((p: any) =>
    p.pixel_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const platform = PLATFORMS.find(p => p.id === activePlatform)!;

  // ─── Grid view (main integrations page) ───
  if (view === "grid") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rastreamento</h1>
          <p className="text-sm text-muted-foreground mt-1">Integrações com pixels e ferramentas de rastreamento</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORMS.map((p) => (
            <Card
              key={p.id}
              className={`border-border transition-all ${p.enabled ? "hover:border-primary/50 cursor-pointer" : "opacity-60"}`}
              onClick={() => {
                if (!p.enabled) {
                  toast({ title: "Em breve", description: `${p.name} será implementado em breve!` });
                  return;
                }
                setActivePlatform(p.id);
                setView("list");
              }}
            >
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl ${p.color} flex items-center justify-center text-lg shrink-0`}>
                    {p.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                  </div>
                </div>
                <div className="mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs gap-1.5"
                    disabled={!p.enabled}
                  >
                    Configurar <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Create pixel form ───
  if (view === "create") {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => setView("grid")} className="hover:text-foreground transition-colors">Integrações</button>
          <span>/</span>
          <button onClick={() => setView("list")} className="hover:text-foreground transition-colors">{platform.name}</button>
          <span>/</span>
          <span className="text-foreground">Criar</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground">Criar {platform.name}</h1>

        <Card className="border-border">
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-primary">Nome</Label>
              <Input
                value={newPixelName}
                onChange={(e) => setNewPixelName(e.target.value)}
                placeholder="Ex: Campanha Principal"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-primary">Pixel ID</Label>
              <Input
                value={newPixelId}
                onChange={(e) => setNewPixelId(e.target.value)}
                placeholder="Ex: CXXXXXXXXXXXXXXXXX"
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Disparar apenas quando a venda estiver paga</p>
                <p className="text-xs text-muted-foreground mt-0.5">Dispara o pixel SOMENTE quando o pagamento for confirmado (não dispara na criação)</p>
              </div>
              <Switch checked={fireOnPaidOnly} onCheckedChange={setFireOnPaidOnly} />
            </div>

            <div className="flex items-center justify-between py-3">
              <p className="text-sm font-semibold text-foreground">Conversão Ativa</p>
              <Switch checked={newPixelActive} onCheckedChange={setNewPixelActive} />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => addMutation.mutate()}
                disabled={!newPixelId.trim() || addMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Edit pixel form ───
  if (view === "edit" && editingPixel) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => setView("grid")} className="hover:text-foreground transition-colors">Integrações</button>
          <span>/</span>
          <button onClick={() => { setView("list"); setEditingPixel(null); }} className="hover:text-foreground transition-colors">{platform.name}</button>
          <span>/</span>
          <span className="text-foreground">Editar</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground">Editar Pixel</h1>

        <Card className="border-border">
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-primary">Pixel ID</Label>
              <Input
                value={editingPixel.pixel_id}
                onChange={(e) => setEditingPixel({ ...editingPixel, pixel_id: e.target.value })}
                placeholder="Ex: CXXXXXXXXXXXXXXXXX"
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <p className="text-sm font-semibold text-foreground">Conversão Ativa</p>
              <Switch
                checked={editingPixel.active}
                onCheckedChange={(checked) => setEditingPixel({ ...editingPixel, active: checked })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => { setView("list"); setEditingPixel(null); }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => updateMutation.mutate({ id: editingPixel.id, pixel_id: editingPixel.pixel_id.trim(), active: editingPixel.active })}
                disabled={!editingPixel.pixel_id.trim() || updateMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── List view (pixels for a platform) ───
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => setView("grid")} className="hover:text-foreground transition-colors">Integrações</button>
        <span>/</span>
        <span className="text-foreground">{platform.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{platform.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Integração nativa com pixel do TikTok Ads para rastreio de suas vendas.</p>
        </div>
        <Button onClick={() => setView("create")} className="bg-primary hover:bg-primary/90 gap-1.5 shrink-0">
          <Plus className="w-4 h-4" /> Novo Pixel
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar pixels..."
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : filteredPixels.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-12 text-center">
            <div className="w-12 h-12 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center mx-auto mb-3">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">Nenhum pixel encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">Comece criando um novo pixel para sua integração</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPixels.map((pixel: any) => (
            <Card key={pixel.id} className="border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${platform.color} flex items-center justify-center text-sm shrink-0`}>
                    {platform.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{pixel.pixel_id}</p>
                    <p className="text-xs text-muted-foreground capitalize">{pixel.platform}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${pixel.active ? "bg-marketplace-green/15 text-marketplace-green" : "bg-muted text-muted-foreground"}`}>
                      {pixel.active ? "Ativo" : "Inativo"}
                    </span>
                    <Switch
                      checked={pixel.active}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: pixel.id, active: checked })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(pixel)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(pixel.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
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
