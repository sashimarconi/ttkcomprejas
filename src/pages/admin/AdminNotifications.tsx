import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, BellOff, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function AdminNotifications() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [notifyPaid, setNotifyPaid] = useState(true);
  const [notifyPending, setNotifyPending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setPushEnabled(data.push_enabled);
      setNotifyPaid(data.notify_paid);
      setNotifyPending(data.notify_pending);
    }
    setLoading(false);
  }

  async function save(updates: { push_enabled?: boolean; notify_paid?: boolean; notify_pending?: boolean }) {
    if (!userId) return;
    setSaving(true);

    const newState = {
      push_enabled: updates.push_enabled ?? pushEnabled,
      notify_paid: updates.notify_paid ?? notifyPaid,
      notify_pending: updates.notify_pending ?? notifyPending,
    };

    const { error } = await supabase
      .from("notification_settings")
      .upsert({
        user_id: userId,
        ...newState,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) {
      toast.error("Erro ao salvar configurações");
    } else {
      toast.success("Configurações salvas");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure quais notificações push você deseja receber no celular.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Notificações Push</CardTitle>
              <CardDescription>Receba alertas no celular quando houver vendas</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Ativar notificações push</Label>
                <p className="text-xs text-muted-foreground">Habilita o envio de notificações para o seu dispositivo</p>
              </div>
            </div>
            <Switch
              checked={pushEnabled}
              onCheckedChange={(v) => {
                setPushEnabled(v);
                save({ push_enabled: v });
              }}
              disabled={saving}
            />
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <p className="text-sm font-semibold text-foreground">Tipos de notificação</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div>
                  <Label className="text-sm font-medium">Vendas pagas</Label>
                  <p className="text-xs text-muted-foreground">Notificar quando um pagamento for confirmado</p>
                </div>
              </div>
              <Switch
                checked={notifyPaid}
                onCheckedChange={(v) => {
                  setNotifyPaid(v);
                  save({ notify_paid: v });
                }}
                disabled={saving || !pushEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <div>
                  <Label className="text-sm font-medium">Vendas geradas (pendentes)</Label>
                  <p className="text-xs text-muted-foreground">Notificar quando um pedido for criado (PIX gerado)</p>
                </div>
              </div>
              <Switch
                checked={notifyPending}
                onCheckedChange={(v) => {
                  setNotifyPending(v);
                  save({ notify_pending: v });
                }}
                disabled={saving || !pushEnabled}
              />
            </div>
          </div>

          {!pushEnabled && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-muted-foreground text-sm">
              <BellOff className="w-4 h-4 shrink-0" />
              <span>As notificações push estão desativadas. Ative para receber alertas no celular.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
