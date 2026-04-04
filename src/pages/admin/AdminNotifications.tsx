import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, BellOff, Loader2, Smartphone, Play, Upload, Trash2, Image, Type, Volume2, Send } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { RINGTONE_PRESETS, playRingtone, type RingtoneId } from "@/lib/notification-sounds";
import defaultIcon from "@/assets/notification-icon-default.png";

interface NotifSettings {
  push_enabled: boolean;
  notify_paid: boolean;
  notify_pending: boolean;
  // Paid settings
  ringtone: RingtoneId;
  custom_ringtone_url: string | null;
  notification_title: string;
  notification_icon_url: string | null;
  // Pending settings
  ringtone_pending: RingtoneId;
  custom_ringtone_url_pending: string | null;
  notification_title_pending: string;
  notification_icon_url_pending: string | null;
}

const DEFAULT_SETTINGS: NotifSettings = {
  push_enabled: true,
  notify_paid: true,
  notify_pending: false,
  ringtone: 'cash_register',
  custom_ringtone_url: null,
  notification_title: 'Venda Realizada',
  notification_icon_url: null,
  ringtone_pending: 'soft_chime',
  custom_ringtone_url_pending: null,
  notification_title_pending: 'Novo Pedido Pendente',
  notification_icon_url_pending: null,
};

export default function AdminNotifications() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_SETTINGS);
  const [userId, setUserId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState<string | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const audioInputPaidRef = useRef<HTMLInputElement>(null);
  const audioInputPendingRef = useRef<HTMLInputElement>(null);
  const iconInputPaidRef = useRef<HTMLInputElement>(null);
  const iconInputPendingRef = useRef<HTMLInputElement>(null);

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
      const d = data as any;
      setSettings({
        push_enabled: data.push_enabled,
        notify_paid: data.notify_paid,
        notify_pending: data.notify_pending,
        ringtone: d.ringtone || 'cash_register',
        custom_ringtone_url: d.custom_ringtone_url || null,
        notification_title: d.notification_title || 'Venda Realizada',
        notification_icon_url: d.notification_icon_url || null,
        ringtone_pending: d.ringtone_pending || 'soft_chime',
        custom_ringtone_url_pending: d.custom_ringtone_url_pending || null,
        notification_title_pending: d.notification_title_pending || 'Novo Pedido Pendente',
        notification_icon_url_pending: d.notification_icon_url_pending || null,
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
        ringtone_pending: newState.ringtone_pending,
        custom_ringtone_url_pending: newState.custom_ringtone_url_pending,
        notification_title_pending: newState.notification_title_pending,
        notification_icon_url_pending: newState.notification_icon_url_pending,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "user_id" });

    if (error) {
      toast.error("Erro ao salvar configurações");
    } else {
      toast.success("Configurações salvas");
    }
    setSaving(false);
  }

  function handlePlayPreset(id: RingtoneId, customUrl?: string | null) {
    setPlayingId(id);
    playRingtone(id, customUrl);
    setTimeout(() => setPlayingId(null), 1000);
  }

  async function handleUploadIcon(e: React.ChangeEvent<HTMLInputElement>, type: 'paid' | 'pending') {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploadingIcon(type);

    const ext = file.name.split('.').pop();
    const path = `notification-icons/${userId}-${type}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });

    if (error) {
      toast.error("Erro ao enviar imagem");
      setUploadingIcon(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    const field = type === 'paid' ? 'notification_icon_url' : 'notification_icon_url_pending';
    await save({ [field]: urlData.publicUrl });
    setUploadingIcon(null);
  }

  async function handleUploadAudio(e: React.ChangeEvent<HTMLInputElement>, type: 'paid' | 'pending') {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 5MB)");
      return;
    }
    setUploadingAudio(type);

    const ext = file.name.split('.').pop();
    const path = `notification-audio/${userId}-${type}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });

    if (error) {
      toast.error("Erro ao enviar áudio");
      setUploadingAudio(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    if (type === 'paid') {
      await save({ ringtone: 'custom', custom_ringtone_url: urlData.publicUrl });
    } else {
      await save({ ringtone_pending: 'custom', custom_ringtone_url_pending: urlData.publicUrl });
    }
    setUploadingAudio(null);
  }

  async function handleTestNotification(type: 'paid' | 'pending') {
    setTesting(true);

    const isPaid = type === 'paid';
    const ringtone = isPaid ? settings.ringtone : settings.ringtone_pending;
    const customUrl = isPaid ? settings.custom_ringtone_url : settings.custom_ringtone_url_pending;
    const title = isPaid
      ? (settings.notification_title || 'Venda Realizada')
      : (settings.notification_title_pending || 'Novo Pedido Pendente');
    const iconUrl = (isPaid ? settings.notification_icon_url : settings.notification_icon_url_pending) || defaultIcon;

    playRingtone(ringtone, customUrl);
    toast(title, {
      description: isPaid ? '🎉 Teste — Sua comissão: R$ 199,90' : '⏳ Teste — Novo PIX gerado: R$ 199,90',
      icon: <img src={iconUrl} alt="icon" className="w-6 h-6 rounded" />,
      duration: 5000,
    });

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      await fetch(`https://${projectId}.supabase.co/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          title,
          body: isPaid ? '🎉 Teste — Sua comissão: R$ 199,90' : '⏳ Teste — Novo PIX gerado: R$ 199,90',
          url: '/admin/notifications',
          tag: 'test-' + Date.now(),
          event_type: isPaid ? 'order_paid' : 'order_pending',
        }),
      });
    } catch (err) {
      console.error('Push test error:', err);
    }

    setTesting(false);
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

      {/* Per-type customization */}
      <Tabs defaultValue="paid" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="paid" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Venda Paga
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            Venda Pendente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paid">
          <NotificationTypeEditor
            type="paid"
            label="Venda Paga"
            color="emerald"
            settings={settings}
            ringtoneKey="ringtone"
            customUrlKey="custom_ringtone_url"
            titleKey="notification_title"
            iconKey="notification_icon_url"
            playingId={playingId}
            uploadingIcon={uploadingIcon}
            uploadingAudio={uploadingAudio}
            testing={testing}
            audioInputRef={audioInputPaidRef}
            iconInputRef={iconInputPaidRef}
            onSave={save}
            onSetSettings={setSettings}
            onPlay={handlePlayPreset}
            onUploadIcon={handleUploadIcon}
            onUploadAudio={handleUploadAudio}
            onTest={handleTestNotification}
          />
        </TabsContent>

        <TabsContent value="pending">
          <NotificationTypeEditor
            type="pending"
            label="Venda Pendente"
            color="amber"
            settings={settings}
            ringtoneKey="ringtone_pending"
            customUrlKey="custom_ringtone_url_pending"
            titleKey="notification_title_pending"
            iconKey="notification_icon_url_pending"
            playingId={playingId}
            uploadingIcon={uploadingIcon}
            uploadingAudio={uploadingAudio}
            testing={testing}
            audioInputRef={audioInputPendingRef}
            iconInputRef={iconInputPendingRef}
            onSave={save}
            onSetSettings={setSettings}
            onPlay={handlePlayPreset}
            onUploadIcon={handleUploadIcon}
            onUploadAudio={handleUploadAudio}
            onTest={handleTestNotification}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Sub-component for each notification type ─── */

interface EditorProps {
  type: 'paid' | 'pending';
  label: string;
  color: string;
  settings: NotifSettings;
  ringtoneKey: keyof NotifSettings;
  customUrlKey: keyof NotifSettings;
  titleKey: keyof NotifSettings;
  iconKey: keyof NotifSettings;
  playingId: string | null;
  uploadingIcon: string | null;
  uploadingAudio: string | null;
  testing: boolean;
  audioInputRef: React.RefObject<HTMLInputElement>;
  iconInputRef: React.RefObject<HTMLInputElement>;
  onSave: (u: Partial<NotifSettings>) => void;
  onSetSettings: React.Dispatch<React.SetStateAction<NotifSettings>>;
  onPlay: (id: RingtoneId, customUrl?: string | null) => void;
  onUploadIcon: (e: React.ChangeEvent<HTMLInputElement>, type: 'paid' | 'pending') => void;
  onUploadAudio: (e: React.ChangeEvent<HTMLInputElement>, type: 'paid' | 'pending') => void;
  onTest: (type: 'paid' | 'pending') => void;
}

function NotificationTypeEditor({
  type, label, settings,
  ringtoneKey, customUrlKey, titleKey, iconKey,
  playingId, uploadingIcon, uploadingAudio, testing,
  audioInputRef, iconInputRef,
  onSave, onSetSettings, onPlay, onUploadIcon, onUploadAudio, onTest,
}: EditorProps) {
  const currentRingtone = settings[ringtoneKey] as RingtoneId;
  const currentCustomUrl = settings[customUrlKey] as string | null;
  const currentTitle = settings[titleKey] as string;
  const currentIconUrl = (settings[iconKey] as string | null) || defaultIcon;
  const isUploadingIcon = uploadingIcon === type;
  const isUploadingAudio = uploadingAudio === type;

  return (
    <div className="space-y-4">
      {/* Ringtone */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Toque — {label}</CardTitle>
              <CardDescription>Som que toca quando essa notificação chega (app aberto)</CardDescription>
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
                  currentRingtone === preset.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                )}
                onClick={() => onSave({ [ringtoneKey]: preset.id })}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full border-2 flex items-center justify-center",
                    currentRingtone === preset.id ? "border-primary" : "border-muted-foreground/40"
                  )}>
                    {currentRingtone === preset.id && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{preset.label}</p>
                    <p className="text-xs text-muted-foreground">{preset.description}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                  onClick={(e) => { e.stopPropagation(); onPlay(preset.id); }}>
                  <Play className={cn("w-4 h-4", playingId === preset.id && "text-primary animate-pulse")} />
                </Button>
              </div>
            ))}

            {/* Custom upload */}
            <div
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                currentRingtone === 'custom'
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
              )}
              onClick={() => {
                if (currentCustomUrl) {
                  onSave({ [ringtoneKey]: 'custom' });
                } else {
                  audioInputRef.current?.click();
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-3 h-3 rounded-full border-2 flex items-center justify-center",
                  currentRingtone === 'custom' ? "border-primary" : "border-muted-foreground/40"
                )}>
                  {currentRingtone === 'custom' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Som Personalizado</p>
                  <p className="text-xs text-muted-foreground">
                    {currentCustomUrl ? "Áudio enviado ✓" : "Envie seu próprio arquivo (MP3, WAV, até 5MB)"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {currentCustomUrl && (
                  <>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                      onClick={(e) => { e.stopPropagation(); onPlay('custom', currentCustomUrl); }}>
                      <Play className={cn("w-4 h-4", playingId === 'custom' && "text-primary animate-pulse")} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        const defaultRingtone = type === 'paid' ? 'cash_register' : 'soft_chime';
                        onSave({ [ringtoneKey]: defaultRingtone, [customUrlKey]: null });
                      }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {!currentCustomUrl && (
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isUploadingAudio}
                    onClick={(e) => { e.stopPropagation(); audioInputRef.current?.click(); }}>
                    {isUploadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            </div>
          </div>
          <input ref={audioInputRef} type="file" accept="audio/*" className="hidden"
            onChange={(e) => onUploadAudio(e, type)} />
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
              <CardTitle className="text-base">Aparência — {label}</CardTitle>
              <CardDescription>Ícone e título exibidos na notificação push e no toast</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preview */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Preview</Label>
            <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">Desktop</p>
                <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 shadow-sm max-w-sm">
                  <img src={currentIconUrl} alt="icon" className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{currentTitle || label}</p>
                    <p className="text-xs text-muted-foreground">Sua comissão: R$ 199,90</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">From VoidTok</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">Mobile</p>
                <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm max-w-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <img src={currentIconUrl} alt="icon" className="w-5 h-5 rounded object-cover" />
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">VoidTok</span>
                    <span className="text-[10px] text-muted-foreground/50 ml-auto">agora</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{currentTitle || label}</p>
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
                <img src={currentIconUrl} alt="Notification icon"
                  className="w-16 h-16 rounded-xl object-cover border border-border" />
                <button
                  className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  onClick={() => iconInputRef.current?.click()}>
                  <Upload className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="flex-1 space-y-2">
                <Button variant="outline" size="sm" onClick={() => iconInputRef.current?.click()} disabled={isUploadingIcon}>
                  {isUploadingIcon ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Trocar ícone
                </Button>
                {settings[iconKey] && (
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive ml-2"
                    onClick={() => onSave({ [iconKey]: null })}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Restaurar padrão
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">PNG ou JPG, recomendado 192×192px</p>
              </div>
            </div>
            <input ref={iconInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => onUploadIcon(e, type)} />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Type className="w-4 h-4 text-muted-foreground" />
              Título da Notificação
            </Label>
            <Input
              value={currentTitle}
              onChange={(e) => {
                const val = e.target.value;
                // @ts-ignore
                onSave.__parent_setSettings?.((s: NotifSettings) => ({ ...s, [titleKey]: val }));
                // fallback: save on blur
              }}
              onBlur={(e) => onSave({ [titleKey]: e.target.value })}
              placeholder={type === 'paid' ? "Ex: Venda Realizada, Nova Comissão" : "Ex: Novo Pedido, PIX Gerado"}
              className="max-w-sm"
            />
            <p className="text-xs text-muted-foreground">Texto principal exibido no topo da notificação</p>
          </div>
        </CardContent>
      </Card>

      {/* Test */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Testar — {label}</CardTitle>
              <CardDescription>Dispara uma notificação de teste ({label.toLowerCase()}) no app e no celular</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={() => onTest(type)} disabled={testing} className="w-full sm:w-auto">
            {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Enviar teste de {label.toLowerCase()}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            O toast aparece no app. A push chega no celular se as notificações estiverem ativadas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
