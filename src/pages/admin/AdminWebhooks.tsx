import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, Trash2, Pencil, ArrowLeft, Webhook, Globe, Shield, Copy,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const EVENTS = [
  { key: "order_created", label: "Pedido Criado", desc: "Disparado quando um novo pedido é criado" },
  { key: "order_paid", label: "Pedido Pago", desc: "Disparado quando um pedido é pago com sucesso" },
  { key: "order_cancelled", label: "Pedido Cancelado", desc: "Disparado quando um pedido é cancelado" },
  { key: "pix_copied", label: "PIX Copiado", desc: "Disparado quando o código PIX é copiado" },
  { key: "cart_abandoned", label: "Carrinho Abandonado", desc: "Disparado quando um carrinho é abandonado" },
];

interface WebhookRow {
  id: string;
  name: string;
  description: string | null;
  url: string;
  secret_key: string | null;
  active: boolean;
  events: string[];
  created_at: string;
}

const AdminWebhooks = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WebhookRow | null>(null);

  // form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [active, setActive] = useState(true);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as WebhookRow[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description: description || null,
        url,
        secret_key: secretKey || null,
        active,
        events: selectedEvents,
      };
      if (editing) {
        const { error } = await supabase.from("webhooks").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("webhooks").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success(editing ? "Webhook atualizado!" : "Webhook criado!");
      closeDialog();
    },
    onError: () => toast.error("Erro ao salvar webhook"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webhooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook removido!");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("webhooks").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setUrl("");
    setSecretKey("");
    setActive(true);
    setSelectedEvents([]);
    setDialogOpen(true);
  }

  function openEdit(wh: WebhookRow) {
    setEditing(wh);
    setName(wh.name);
    setDescription(wh.description || "");
    setUrl(wh.url);
    setSecretKey(wh.secret_key || "");
    setActive(wh.active);
    setSelectedEvents(Array.isArray(wh.events) ? wh.events : []);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  function toggleEvent(key: string) {
    setSelectedEvents((prev) =>
      prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]
    );
  }

  const webhookBaseUrl = `https://${window.location.host}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure webhooks para receber notificações em tempo real dos eventos da sua loja
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Webhook
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Webhook className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum webhook configurado</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Webhooks permitem que você receba notificações em tempo real quando eventos acontecem na sua loja.
            </p>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar primeiro webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <Card key={wh.id} className="transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Globe className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="font-semibold text-foreground truncate">{wh.name}</h3>
                      <Badge variant={wh.active ? "default" : "secondary"} className="shrink-0">
                        {wh.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    {wh.description && (
                      <p className="text-xs text-muted-foreground ml-7 mb-2">{wh.description}</p>
                    )}
                    <div className="flex items-center gap-2 ml-7 mb-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[400px]">
                        {wh.url}
                      </code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(wh.url); toast.success("URL copiada!"); }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 ml-7">
                      {(Array.isArray(wh.events) ? wh.events : []).map((ev) => {
                        const evData = EVENTS.find((e) => e.key === ev);
                        return (
                          <Badge key={ev} variant="outline" className="text-xs">
                            {evData?.label || ev}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={wh.active}
                      onCheckedChange={(val) => toggleMutation.mutate({ id: wh.id, active: val })}
                    />
                    <Button size="icon" variant="ghost" onClick={() => openEdit(wh)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(wh.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Webhook" : "Novo Webhook"}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Configure um webhook para receber notificações em tempo real dos eventos da sua loja
            </p>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <Switch checked={active} onCheckedChange={setActive} />
              <span className="text-sm font-medium text-foreground">Ativo</span>
            </div>

            {/* Name */}
            <div>
              <label className="text-sm font-medium text-primary mb-1 block">Nome do Webhook</label>
              <Input
                placeholder="Ex: Integração com ERP"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-primary/70 mt-1">Nome interno para identificação</p>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Descrição (Opcional)</label>
              <Textarea
                placeholder="Ex: Webhook para sincronizar pedidos com ERP"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
              <p className="text-xs text-primary/70 mt-1">Descrição detalhada do webhook</p>
            </div>

            {/* URL */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">URL do Webhook</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="https://api.seusite.com/webhooks"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-primary/70 mt-1">URL que receberá as notificações via POST</p>
            </div>

            {/* Secret key */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Chave Secreta (Opcional)
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ex: webhook-secret-123"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-primary/70 mt-1">Use esta chave para validar as requisições webhook</p>
            </div>

            {/* Events */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Eventos</label>
              <div className="border rounded-lg divide-y">
                {EVENTS.map((ev) => (
                  <div key={ev.key} className="flex items-center gap-3 p-3">
                    <Switch
                      checked={selectedEvents.includes(ev.key)}
                      onCheckedChange={() => toggleEvent(ev.key)}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{ev.label}</p>
                      <p className="text-xs text-muted-foreground">{ev.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-primary/70">Selecione os eventos que deseja receber</p>
                <p className="text-xs text-muted-foreground">{selectedEvents.length} selecionados</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!name.trim() || !url.trim() || saveMutation.isPending}
              >
                {saveMutation.isPending ? "Salvando..." : editing ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWebhooks;
