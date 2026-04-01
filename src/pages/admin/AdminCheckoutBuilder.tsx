import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  GripVertical,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Palette,
  Type,
  Layout,
  Settings,
  Clock,
  Sparkles,
  Save,
  Smartphone,
  Monitor,
  ShieldCheck,
  ArrowLeft,
  Upload,
} from "lucide-react";

interface Section {
  id: string;
  type: string;
  enabled: boolean;
  label: string;
}

interface FieldConfig {
  enabled: boolean;
  required: boolean;
  label: string;
}

interface Appearance {
  primary_color: string;
  button_radius: string;
  button_text: string;
  header_text: string;
  security_text: string;
  show_progress_bar: boolean;
  show_security_badge: boolean;
  timer_enabled: boolean;
  timer_minutes: number;
  timer_text: string;
  logo_url: string;
  logo_height: number;
  pix_payment_title: string;
  pix_expiration_minutes: number;
  pix_instruction_text: string;
}

interface BuilderConfig {
  sections: Section[];
  fields: Record<string, FieldConfig>;
  appearance: Appearance;
}

const DEFAULT_CONFIG: BuilderConfig = {
  sections: [
    { id: "timer", type: "timer", enabled: true, label: "Cronômetro de urgência" },
    { id: "customer_info", type: "customer_info", enabled: true, label: "Informações do cliente" },
    { id: "product_card", type: "product_card", enabled: true, label: "Card do produto" },
    { id: "shipping", type: "shipping", enabled: true, label: "Opções de frete" },
    { id: "order_bumps", type: "order_bumps", enabled: true, label: "Order bumps" },
    { id: "summary", type: "summary", enabled: true, label: "Resumo do pedido" },
    { id: "payment", type: "payment", enabled: true, label: "Forma de pagamento" },
    { id: "savings", type: "savings", enabled: true, label: "Banner de economia" },
  ],
  fields: {
    name: { enabled: true, required: true, label: "Nome completo" },
    email: { enabled: true, required: true, label: "E-mail" },
    phone: { enabled: true, required: true, label: "Telefone" },
    cpf: { enabled: true, required: true, label: "CPF" },
    address: { enabled: true, required: false, label: "Endereço" },
  },
  appearance: {
    primary_color: "#E63946",
    button_radius: "full",
    button_text: "Fazer pedido",
    header_text: "Resumo do pedido",
    security_text: "Finalização da compra segura garantida",
    show_progress_bar: true,
    show_security_badge: true,
    timer_enabled: true,
    timer_minutes: 10,
    timer_text: "Oferta termina em:",
    logo_url: "",
    logo_height: 28,
    pix_payment_title: "Pagamento Seguro",
    pix_expiration_minutes: 30,
    pix_instruction_text: "Efetue o pagamento agora mesmo escaneando o QR Code",
  },
};

const SECTION_ICONS: Record<string, React.ReactNode> = {
  timer: <Clock className="w-4 h-4" />,
  customer_info: <Type className="w-4 h-4" />,
  product_card: <Layout className="w-4 h-4" />,
  shipping: <Layout className="w-4 h-4" />,
  order_bumps: <Sparkles className="w-4 h-4" />,
  summary: <Layout className="w-4 h-4" />,
  payment: <Layout className="w-4 h-4" />,
  savings: <Sparkles className="w-4 h-4" />,
};

const BUTTON_RADIUS_OPTIONS = [
  { value: "none", label: "Reto" },
  { value: "md", label: "Arredondado" },
  { value: "full", label: "Pílula" },
];

const AdminCheckoutBuilder = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<BuilderConfig>(DEFAULT_CONFIG);
  const [configId, setConfigId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<string>("layout");
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [dragItem, setDragItem] = useState<number | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Fetch a real product for preview
  const { data: previewProduct } = useQuery({
    queryKey: ["builder-preview-product"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, sale_price, original_price, discount_percent")
        .eq("active", true)
        .limit(1)
        .single();
      return data;
    },
  });

  // Fetch shipping options for preview
  const { data: previewShipping } = useQuery({
    queryKey: ["builder-preview-shipping"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shipping_options")
        .select("name, price, free")
        .eq("active", true)
        .order("sort_order")
        .limit(3);
      return data || [];
    },
  });

  // Fetch order bumps for preview
  const { data: previewBumps } = useQuery({
    queryKey: ["builder-preview-bumps"],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_bumps")
        .select("title, price, original_price")
        .eq("active", true)
        .limit(2);
      return data || [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["checkout-builder-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkout_builder_config")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setConfigId(data.id);
      const parsed = data.config as any;
      setConfig({
        sections: parsed.sections || DEFAULT_CONFIG.sections,
        fields: parsed.fields || DEFAULT_CONFIG.fields,
        appearance: { ...DEFAULT_CONFIG.appearance, ...(parsed.appearance || {}) },
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!configId) return;
      // Save builder config
      const { error } = await supabase
        .from("checkout_builder_config")
        .update({ config: config as any, updated_at: new Date().toISOString() })
        .eq("id", configId);
      if (error) throw error;

      // Also sync checkout_settings texts
      const { data: existing } = await supabase
        .from("checkout_settings" as any)
        .select("id")
        .limit(1)
        .single() as any;
      if (existing) {
        await (supabase.from("checkout_settings" as any) as any)
          .update({
            checkout_header_text: config.appearance.header_text,
            checkout_security_text: config.appearance.security_text,
            checkout_button_text: config.appearance.button_text,
            pix_payment_title: config.appearance.pix_payment_title,
            pix_expiration_minutes: config.appearance.pix_expiration_minutes,
            pix_instruction_text: config.appearance.pix_instruction_text,
          })
          .eq("id", existing.id);
      }

      // Also sync logo to store_settings
      const { data: storeSettings } = await supabase
        .from("store_settings")
        .select("id")
        .limit(1)
        .single();
      if (storeSettings) {
        await supabase
          .from("store_settings")
          .update({ checkout_logo_url: config.appearance.logo_url || null })
          .eq("id", storeSettings.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkout-builder-config"] });
      queryClient.invalidateQueries({ queryKey: ["checkout-settings"] });
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      toast({ title: "Builder salvo com sucesso!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `checkout-logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      updateAppearance("logo_url", urlData.publicUrl);
      toast({ title: "Logo enviada com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar logo", description: err.message, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const moveSection = (from: number, to: number) => {
    const newSections = [...config.sections];
    const [item] = newSections.splice(from, 1);
    newSections.splice(to, 0, item);
    setConfig({ ...config, sections: newSections });
  };

  const toggleSection = (id: string) => {
    setConfig({
      ...config,
      sections: config.sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    });
  };

  const updateAppearance = (key: keyof Appearance, value: any) => {
    setConfig({ ...config, appearance: { ...config.appearance, [key]: value } });
  };

  const updateField = (fieldKey: string, prop: keyof FieldConfig, value: any) => {
    setConfig({
      ...config,
      fields: {
        ...config.fields,
        [fieldKey]: { ...config.fields[fieldKey], [prop]: value },
      },
    });
  };

  const panels = [
    { id: "layout", label: "Layout", icon: <Layout className="w-4 h-4" />, desc: "Seções e ordem" },
    { id: "campos", label: "Campos", icon: <Type className="w-4 h-4" />, desc: "Campos do formulário" },
    { id: "aparencia", label: "Aparência", icon: <Palette className="w-4 h-4" />, desc: "Cores, logo e estilo" },
    { id: "conversao", label: "Conversão", icon: <Sparkles className="w-4 h-4" />, desc: "Timer e urgência" },
    { id: "config", label: "Textos", icon: <Settings className="w-4 h-4" />, desc: "Textos e rótulos" },
    { id: "pix", label: "PIX", icon: <Clock className="w-4 h-4" />, desc: "Configurações do PIX" },
  ];

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;

  const btnRadiusClass =
    config.appearance.button_radius === "full"
      ? "rounded-full"
      : config.appearance.button_radius === "md"
      ? "rounded-lg"
      : "rounded-none";

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 bg-card border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">Editor do Checkout</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Personalize o checkout visual</p>
        </div>

        {/* Panel tabs */}
        <div className="flex-1 overflow-y-auto">
          {panels.map((panel) => (
            <div key={panel.id}>
              <button
                onClick={() => setActivePanel(activePanel === panel.id ? "" : panel.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border transition-colors hover:bg-muted/50 ${
                  activePanel === panel.id ? "bg-muted/50" : ""
                }`}
              >
                {panel.icon}
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{panel.label}</p>
                  <p className="text-[10px] text-muted-foreground">{panel.desc}</p>
                </div>
                {activePanel === panel.id ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {/* Panel content */}
              {activePanel === panel.id && (
                <div className="px-4 py-3 bg-muted/20 border-b border-border space-y-3">
                  {panel.id === "layout" && (
                    <div className="space-y-1">
                      {config.sections.map((section, idx) => (
                        <div
                          key={section.id}
                          draggable
                          onDragStart={() => setDragItem(idx)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (dragItem !== null && dragItem !== idx) moveSection(dragItem, idx);
                            setDragItem(null);
                          }}
                          className={`flex items-center gap-2 px-2 py-2 rounded-lg border transition-all cursor-move ${
                            section.enabled
                              ? "bg-card border-border"
                              : "bg-muted/50 border-border/50 opacity-60"
                          } ${dragItem === idx ? "ring-2 ring-primary scale-95" : ""}`}
                        >
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          {SECTION_ICONS[section.type]}
                          <span className="text-xs font-medium text-foreground flex-1 truncate">
                            {section.label}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSection(section.id);
                            }}
                            className="shrink-0"
                          >
                            {section.enabled ? (
                              <Eye className="w-3.5 h-3.5 text-foreground" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {panel.id === "campos" && (
                    <div className="space-y-3">
                      {Object.entries(config.fields).map(([key, field]) => (
                        <div key={key} className="bg-card rounded-lg border border-border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">{field.label}</span>
                            <Switch
                              checked={field.enabled}
                              onCheckedChange={(v) => updateField(key, "enabled", v)}
                            />
                          </div>
                          {field.enabled && (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground">Obrigatório</span>
                                <Switch
                                  checked={field.required}
                                  onCheckedChange={(v) => updateField(key, "required", v)}
                                />
                              </div>
                              <Input
                                value={field.label}
                                onChange={(e) => updateField(key, "label", e.target.value)}
                                className="h-8 text-xs"
                                placeholder="Rótulo do campo"
                              />
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {panel.id === "aparencia" && (
                    <div className="space-y-3">
                      {/* Logo section */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Logo do Checkout (opcional)</Label>
                        {config.appearance.logo_url && (
                          <div className="bg-muted/50 rounded-lg p-3 flex flex-col items-center gap-2">
                            <img
                              src={config.appearance.logo_url}
                              alt="Logo"
                              style={{ height: config.appearance.logo_height }}
                              className="object-contain"
                            />
                            <button
                              onClick={() => updateAppearance("logo_url", "")}
                              className="text-[10px] text-destructive hover:underline"
                            >
                              Remover logo
                            </button>
                          </div>
                        )}
                        <div className="flex gap-1">
                          <Input
                            value={config.appearance.logo_url}
                            onChange={(e) => updateAppearance("logo_url", e.target.value)}
                            className="h-8 text-xs flex-1"
                            placeholder="URL da logo ou faça upload"
                          />
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleLogoUpload(file);
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            disabled={uploadingLogo}
                            onClick={() => logoInputRef.current?.click()}
                          >
                            <Upload className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        {config.appearance.logo_url && (
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">
                              Altura da logo: {config.appearance.logo_height}px
                            </Label>
                            <input
                              type="range"
                              min={16}
                              max={80}
                              value={config.appearance.logo_height}
                              onChange={(e) => updateAppearance("logo_height", parseInt(e.target.value))}
                              className="w-full h-1.5 accent-primary"
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Cor principal</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={config.appearance.primary_color}
                            onChange={(e) => updateAppearance("primary_color", e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border-0"
                          />
                          <Input
                            value={config.appearance.primary_color}
                            onChange={(e) => updateAppearance("primary_color", e.target.value)}
                            className="h-8 text-xs flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Formato do botão</Label>
                        <div className="flex gap-1">
                          {BUTTON_RADIUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => updateAppearance("button_radius", opt.value)}
                              className={`flex-1 text-[10px] py-1.5 border rounded-md transition-colors ${
                                config.appearance.button_radius === opt.value
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Barra de progresso</Label>
                        <Switch
                          checked={config.appearance.show_progress_bar}
                          onCheckedChange={(v) => updateAppearance("show_progress_bar", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Selo de segurança</Label>
                        <Switch
                          checked={config.appearance.show_security_badge}
                          onCheckedChange={(v) => updateAppearance("show_security_badge", v)}
                        />
                      </div>
                    </div>
                  )}

                  {panel.id === "conversao" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Cronômetro ativo</Label>
                        <Switch
                          checked={config.appearance.timer_enabled}
                          onCheckedChange={(v) => updateAppearance("timer_enabled", v)}
                        />
                      </div>
                      {config.appearance.timer_enabled && (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs">Tempo (minutos)</Label>
                            <Input
                              type="number"
                              min={1}
                              value={config.appearance.timer_minutes}
                              onChange={(e) => updateAppearance("timer_minutes", parseInt(e.target.value) || 10)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Texto do timer</Label>
                            <Input
                              value={config.appearance.timer_text}
                              onChange={(e) => updateAppearance("timer_text", e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {panel.id === "config" && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Texto do cabeçalho</Label>
                        <Input
                          value={config.appearance.header_text}
                          onChange={(e) => updateAppearance("header_text", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Texto de segurança</Label>
                        <Input
                          value={config.appearance.security_text}
                          onChange={(e) => updateAppearance("security_text", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Texto do botão</Label>
                        <Input
                          value={config.appearance.button_text}
                          onChange={(e) => updateAppearance("button_text", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {panel.id === "pix" && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome da empresa (tela do PIX)</Label>
                        <Input
                          value={config.appearance.pix_payment_title}
                          onChange={(e) => updateAppearance("pix_payment_title", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tempo para pagamento (minutos)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={config.appearance.pix_expiration_minutes}
                          onChange={(e) => updateAppearance("pix_expiration_minutes", parseInt(e.target.value) || 30)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Instrução do QR Code</Label>
                        <Input
                          value={config.appearance.pix_instruction_text}
                          onChange={(e) => updateAppearance("pix_instruction_text", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Save button */}
        <div className="p-4 border-t border-border">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full gap-2"
            style={{ backgroundColor: config.appearance.primary_color }}
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 bg-muted/30 flex flex-col">
        {/* Preview toolbar */}
        <div className="h-12 bg-card border-b border-border flex items-center justify-center gap-2 px-4">
          <button
            onClick={() => setPreviewMode("mobile")}
            className={`p-2 rounded-lg transition-colors ${
              previewMode === "mobile" ? "bg-primary/10 text-primary" : "text-muted-foreground"
            }`}
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPreviewMode("desktop")}
            className={`p-2 rounded-lg transition-colors ${
              previewMode === "desktop" ? "bg-primary/10 text-primary" : "text-muted-foreground"
            }`}
          >
            <Monitor className="w-4 h-4" />
          </button>
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-y-auto flex justify-center p-6">
          <div
            className={`bg-background rounded-2xl shadow-2xl border border-border overflow-hidden transition-all ${
              previewMode === "mobile" ? "w-[375px]" : "w-full max-w-2xl"
            }`}
            style={{ minHeight: 600 }}
          >
            {/* Preview header */}
            <header className="sticky top-0 z-10 bg-card border-b border-border">
              <div className="flex items-center h-11 px-4">
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 text-center">
                  {config.appearance.logo_url ? (
                    <img
                      src={config.appearance.logo_url}
                      alt="Logo"
                      style={{ height: config.appearance.logo_height }}
                      className="object-contain mx-auto"
                    />
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-foreground">{config.appearance.header_text}</p>
                      {config.appearance.show_security_badge && (
                        <p className="text-[9px] text-green-600 flex items-center justify-center gap-1">
                          <ShieldCheck className="w-2.5 h-2.5" /> {config.appearance.security_text}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="w-4" />
              </div>
              {config.appearance.show_progress_bar && (
                <div className="flex gap-0.5 px-4 pb-1.5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 h-0.5 rounded-full"
                      style={{ backgroundColor: i < 6 ? config.appearance.primary_color : "#e5e7eb" }}
                    />
                  ))}
                </div>
              )}
            </header>

            {/* Rendered sections */}
            <div className="pb-20">
              {config.sections
                .filter((s) => s.enabled)
                .map((section) => (
                  <div key={section.id} className="border-b border-border/50">
                    {section.type === "timer" && config.appearance.timer_enabled && (
                      <div
                        className="mx-3 mt-3 rounded-xl py-2.5 px-4 flex items-center justify-center gap-2"
                        style={{ backgroundColor: config.appearance.primary_color }}
                      >
                        <span className="text-white text-[10px]">{config.appearance.timer_text}</span>
                        <div className="flex items-center gap-1">
                          {["00", String(config.appearance.timer_minutes).padStart(2, "0"), "00"].map(
                            (v, i) => (
                              <span key={i} className="flex items-center gap-1">
                                <span className="bg-white/20 rounded px-1.5 py-0.5 text-white text-xs font-bold">
                                  {v}
                                </span>
                                {i < 2 && <span className="text-white/70 text-[8px]">{i === 0 ? "h" : "m"}</span>}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {section.type === "customer_info" && (
                      <div className="px-3 py-3">
                        <button className="w-full border border-dashed border-border rounded-lg py-3 text-xs text-muted-foreground">
                          + Adicionar endereço de entrega
                        </button>
                        <button className="w-full border border-dashed border-border rounded-lg py-3 text-xs text-muted-foreground mt-2">
                          + Adicionar CPF
                        </button>
                      </div>
                    )}

                    {section.type === "product_card" && (
                      <div className="px-3 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                            🛒 Resumo do Pedido
                          </p>
                          <span className="text-xs font-semibold" style={{ color: config.appearance.primary_color }}>
                            R$ 97,70
                          </span>
                        </div>
                      </div>
                    )}

                    {section.type === "shipping" && (
                      <div className="px-3 py-2">
                        <p className="text-[10px] font-medium text-muted-foreground mb-1">Entrega</p>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                          <div
                            className="w-3 h-3 rounded-full border-2"
                            style={{ borderColor: config.appearance.primary_color }}
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full m-[1px]"
                              style={{ backgroundColor: config.appearance.primary_color }}
                            />
                          </div>
                          <span className="text-[10px] text-foreground">Frete Grátis</span>
                        </div>
                      </div>
                    )}

                    {section.type === "order_bumps" && (
                      <div
                        className="px-3 py-2"
                        style={{ backgroundColor: `${config.appearance.primary_color}10` }}
                      >
                        <p
                          className="text-[10px] font-bold uppercase"
                          style={{ color: config.appearance.primary_color }}
                        >
                          ⚡ Ofertas especiais
                        </p>
                      </div>
                    )}

                    {section.type === "summary" && (
                      <div className="px-3 py-3 space-y-1">
                        <p className="text-xs font-semibold text-foreground">Informações de Contato</p>
                        {Object.entries(config.fields)
                          .filter(([, f]) => f.enabled)
                          .map(([key, field]) => (
                            <div key={key} className="border-b border-border/50 py-2">
                              <span className="text-[10px] text-muted-foreground">
                                {field.label}
                                {field.required && " *"}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}

                    {section.type === "payment" && (
                      <div className="px-3 py-3">
                        <p className="text-xs font-semibold text-foreground mb-2">Forma de pagamento</p>
                        <div className="flex items-center gap-2 p-2 rounded-lg border border-green-200 bg-green-50">
                          <div className="w-3 h-3 rounded-full border-2 border-green-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-600 m-[1px]" />
                          </div>
                          <span className="text-[10px] font-medium text-foreground">Pix</span>
                        </div>
                      </div>
                    )}

                    {section.type === "savings" && (
                      <div className="px-3 py-2 text-center">
                        <p className="text-[10px] text-green-600">
                          😊 Você está economizando R$ 100,00
                        </p>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* Fixed bottom preview */}
            <div className="sticky bottom-0 bg-card border-t border-border p-3 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-muted-foreground">Total (1 item)</p>
                <p className="text-sm font-bold" style={{ color: config.appearance.primary_color }}>
                  R$ 97,70
                </p>
              </div>
              <button
                className={`flex-1 ml-3 py-2.5 text-white text-xs font-bold ${btnRadiusClass}`}
                style={{ backgroundColor: config.appearance.primary_color }}
              >
                {config.appearance.button_text}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCheckoutBuilder;
