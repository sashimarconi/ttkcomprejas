import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, BellOff, Loader2, Smartphone, Play, Upload, Trash2, Image, Type, Volume2, Send } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RINGTONE_PRESETS, playRingtone, type RingtoneId } from "@/lib/notification-sounds";
import defaultIcon from "@/assets/notification-icon-default.png";

interface NotifSettings {
  push_enabled: boolean;
  notify_paid: boolean;
  notify_pending: boolean;
  ringtone: RingtoneId;
  custom_ringtone_url: string | null;
  notification_title: string;
  notification_icon_url: string | null;
}

const DEFAULT_SETTINGS: NotifSettings = {
  push_enabled: true,
  notify_paid: true,
  notify_pending: false,
  ringtone: 'cash_register',
  custom_ringtone_url: null,
  notification_title: 'Venda Realizada',
  notification_icon_url: null,
};

export default function AdminNotifications() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_SETTINGS);
  const [userId, setUserId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadSettings(); }, []);

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
      setSettings({
        push_enabled: data.push_enabled,
        notify_paid: data.notify_paid,
        notify_pending: data.notify_pending,
        ringtone: (data as any).ringtone || 'cash_register',
        custom_ringtone_url: (data as any).custom_ringtone_url || null,
        notification_title: (data as any).notification_title || 'Venda Realizada',
        notification_icon_url: (data as any).notification_icon_url || null,
      });
    }
    setLoading(false);
  }

  async function save(updates: Partial<NotifSettings>) {
    if (!userId) return;
    setSaving(true);

    const newState = { ...settings, ...updates };
    setSettings(newState);

    const { error } = await supabase
      .from("notification_settings")
      .upsert({
        user_id: userId,
        push_enabled: newState.push_enabled,
        notify_paid: newState.notify_paid,
        notify_pending: newState.notify_pending,
        ringtone: newState.ringtone,
        custom_ringtone_url: newState.custom_ringtone_url,
        notification_title: newState.notification_title,
        notification_icon_url: newState.notification_icon_url,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "user_id" });

    if (error) {
      toast.error("Erro ao salvar configurações");
    } else {
      toast.success("Configurações salvas");
    }
    setSaving(false);
  }

  function handlePlayPreset(id: RingtoneId) {
    setPlayingId(id);
    playRingtone(id, settings.custom_ringtone_url);
    setTimeout(() => setPlayingId(null), 1000);
  }

  async function handleUploadIcon(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploadingIcon(true);

    const ext = file.name.split('.').pop();
    const path = `notification-icons/${userId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });

    if (error) {
      toast.error("Erro ao enviar imagem");
      setUploadingIcon(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    await save({ notification_icon_url: urlData.publicUrl });
    setUploadingIcon(false);
  }

  async function handleUploadAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 5MB)");
      return;
    }
    setUploadingAudio(true);

    const ext = file.name.split('.').pop();
    const path = `notification-audio/${userId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });

    if (error) {
      toast.error("Erro ao enviar áudio");
      setUploadingAudio(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    await save({ ringtone: 'custom', custom_ringtone_url: urlData.publicUrl });
    setUploadingAudio(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentIcon = settings.notification_icon_url || defaultIcon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Personalize o toque, ícone e título das suas notificações de venda.
        </p>
      </div>

      {/* Push toggle + types */}
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
              checked={settings.push_enabled}
              onCheckedChange={(v) => save({ push_enabled: v })}
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
                checked={settings.notify_paid}
                onCheckedChange={(v) => save({ notify_paid: v })}
                disabled={saving || !settings.push_enabled}
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
                checked={settings.notify_pending}
                onCheckedChange={(v) => save({ notify_pending: v })}
                disabled={saving || !settings.push_enabled}
              />
            </div>
          </div>

          {!settings.push_enabled && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-muted-foreground text-sm">
              <BellOff className="w-4 h-4 shrink-0" />
              <span>As notificações push estão desativadas.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ringtone Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Toque da Notificação</CardTitle>
              <CardDescription>Escolha o som que toca quando uma venda é realizada (app aberto)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            {RINGTONE_PRESETS.map((preset) => (
              <div
                key={preset.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                  settings.ringtone === preset.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                )}
                onClick={() => save({ ringtone: preset.id })}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full border-2 flex items-center justify-center",
                    settings.ringtone === preset.id ? "border-primary" : "border-muted-foreground/40"
                  )}>
                    {settings.ringtone === preset.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{preset.label}</p>
                    <p className="text-xs text-muted-foreground">{preset.description}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => { e.stopPropagation(); handlePlayPreset(preset.id); }}
                >
                  <Play className={cn("w-4 h-4", playingId === preset.id && "text-primary animate-pulse")} />
                </Button>
              </div>
            ))}

            {/* Custom upload */}
            <div
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                settings.ringtone === 'custom'
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
              )}
              onClick={() => {
                if (settings.custom_ringtone_url) {
                  save({ ringtone: 'custom' });
                } else {
                  audioInputRef.current?.click();
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-3 h-3 rounded-full border-2 flex items-center justify-center",
                  settings.ringtone === 'custom' ? "border-primary" : "border-muted-foreground/40"
                )}>
                  {settings.ringtone === 'custom' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Som Personalizado</p>
                  <p className="text-xs text-muted-foreground">
                    {settings.custom_ringtone_url ? "Áudio enviado ✓" : "Envie seu próprio arquivo de áudio (MP3, WAV, até 5MB)"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {settings.custom_ringtone_url && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => { e.stopPropagation(); handlePlayPreset('custom'); }}
                    >
                      <Play className={cn("w-4 h-4", playingId === 'custom' && "text-primary animate-pulse")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        save({ ringtone: 'cash_register', custom_ringtone_url: null });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {!settings.custom_ringtone_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={uploadingAudio}
                    onClick={(e) => { e.stopPropagation(); audioInputRef.current?.click(); }}
                  >
                    {uploadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            </div>
          </div>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleUploadAudio}
          />
        </CardContent>
      </Card>

      {/* Icon & Title */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Image className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Aparência da Notificação</CardTitle>
              <CardDescription>Personalize o ícone e título exibidos na notificação push e no toast</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preview */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Preview</Label>
            <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-3">
              {/* Desktop-style */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">Desktop</p>
                <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 shadow-sm max-w-sm">
                  <img src={currentIcon} alt="icon" className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{settings.notification_title || 'Venda Realizada'}</p>
                    <p className="text-xs text-muted-foreground">Sua comissão: R$ 199,90</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">From VoidTok</p>
                  </div>
                </div>
              </div>
              {/* Mobile-style */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">Mobile</p>
                <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm max-w-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <img src={currentIcon} alt="icon" className="w-5 h-5 rounded object-cover" />
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">VoidTok</span>
                    <span className="text-[10px] text-muted-foreground/50 ml-auto">agora</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{settings.notification_title || 'Venda Realizada'}</p>
                  <p className="text-xs text-muted-foreground">Sua comissão: R$ 199,90</p>
                </div>
              </div>
            </div>
          </div>

          {/* Icon */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Image className="w-4 h-4 text-muted-foreground" />
              Ícone da Notificação
            </Label>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <img
                  src={currentIcon}
                  alt="Notification icon"
                  className="w-16 h-16 rounded-xl object-cover border border-border"
                />
                <button
                  className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  onClick={() => iconInputRef.current?.click()}
                >
                  <Upload className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="flex-1 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => iconInputRef.current?.click()}
                  disabled={uploadingIcon}
                >
                  {uploadingIcon ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Trocar ícone
                </Button>
                {settings.notification_icon_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive ml-2"
                    onClick={() => save({ notification_icon_url: null })}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Restaurar padrão
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">PNG ou JPG, recomendado 192×192px</p>
              </div>
            </div>
            <input
              ref={iconInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadIcon}
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Type className="w-4 h-4 text-muted-foreground" />
              Título da Notificação
            </Label>
            <Input
              value={settings.notification_title}
              onChange={(e) => setSettings((s) => ({ ...s, notification_title: e.target.value }))}
              onBlur={() => save({ notification_title: settings.notification_title })}
              placeholder="Ex: Venda Realizada, Nova Comissão, etc."
              className="max-w-sm"
            />
            <p className="text-xs text-muted-foreground">Texto principal exibido no topo da notificação</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
