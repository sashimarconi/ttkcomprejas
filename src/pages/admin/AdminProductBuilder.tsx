
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  GripVertical, Eye, EyeOff, Palette, Type, Layout, Sparkles,
  Save, Smartphone, Monitor, Upload, Image, DollarSign, Truck,
  ShieldCheck, Store, Star, FileText, ShoppingBag, ChevronDown, ChevronRight,
} from "lucide-react";

interface Section {
  id: string;
  enabled: boolean;
  label: string;
}

interface AppearanceConfig {
  bg_color: string;
  header_bg_color: string;
  header_logo_url: string;
  header_logo_height: number;
  show_cart_icon: boolean;
  button_color: string;
  button_text_color: string;
  button_radius: string;
}

interface TextsConfig {
  buy_button_text: string;
  shipping_label: string;
  reviews_title: string;
  units_available_text: string;
  description_title: string;
  related_title: string;
}

interface ConversionConfig {
  show_discount_badge: boolean;
  show_flash_sale: boolean;
  show_sold_count: boolean;
  show_units_available: boolean;
  units_available_count: number;
}

interface ProductBuilderConfig {
  sections: Section[];
  appearance: AppearanceConfig;
  texts: TextsConfig;
  conversion: ConversionConfig;
}

const DEFAULT_CONFIG: ProductBuilderConfig = {
  sections: [
    { id: "gallery", enabled: true, label: "Galeria de Imagens" },
    { id: "pricing", enabled: true, label: "Preço e Desconto" },
    { id: "info", enabled: true, label: "Informações do Produto" },
    { id: "shipping", enabled: true, label: "Frete" },
    { id: "trust_badges", enabled: true, label: "Selos de Confiança" },
    { id: "store_card", enabled: true, label: "Card da Loja" },
    { id: "reviews", enabled: true, label: "Avaliações" },
    { id: "description", enabled: true, label: "Descrição" },
    { id: "related", enabled: true, label: "Produtos Relacionados" },
  ],
  appearance: {
    bg_color: "",
    header_bg_color: "",
    header_logo_url: "",
    header_logo_height: 28,
    show_cart_icon: true,
    button_color: "#E63946",
    button_text_color: "#FFFFFF",
    button_radius: "lg",
  },
  texts: {
    buy_button_text: "Comprar agora",
    shipping_label: "Frete grátis",
    reviews_title: "Avaliações",
    units_available_text: "13 unidades disponíveis",
    description_title: "Descrição do produto",
    related_title: "Mais desta loja",
  },
  conversion: {
    show_discount_badge: true,
    show_flash_sale: true,
    show_sold_count: true,
    show_units_available: true,
    units_available_count: 13,
  },
};

const SECTION_ICONS: Record<string, React.ReactNode> = {
  gallery: <Image className="w-4 h-4" />,
  pricing: <DollarSign className="w-4 h-4" />,
  info: <FileText className="w-4 h-4" />,
  shipping: <Truck className="w-4 h-4" />,
  trust_badges: <ShieldCheck className="w-4 h-4" />,
  store_card: <Store className="w-4 h-4" />,
  reviews: <Star className="w-4 h-4" />,
  description: <Type className="w-4 h-4" />,
  related: <ShoppingBag className="w-4 h-4" />,
};

const BUTTON_RADIUS_OPTIONS = [
  { value: "none", label: "Reto" },
  { value: "md", label: "Arredondado" },
  { value: "lg", label: "Grande" },
  { value: "full", label: "Pílula" },
];

const AdminProductBuilder = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<ProductBuilderConfig>(DEFAULT_CONFIG);
  const [configId, setConfigId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<string>("layout");
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [dragItem, setDragItem] = useState<number | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: previewProduct } = useQuery({
    queryKey: ["builder-preview-product"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, slug")
        .eq("active", true)
        .limit(1)
        .single();
      return data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["product-page-builder-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_page_builder_config" as any)
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (data) {
      setConfigId(data.id);
      const parsed = data.config as any;
      if (parsed && Object.keys(parsed).length > 0) {
        setConfig({
          sections: parsed.sections || DEFAULT_CONFIG.sections,
          appearance: { ...DEFAULT_CONFIG.appearance, ...(parsed.appearance || {}) },
          texts: { ...DEFAULT_CONFIG.texts, ...(parsed.texts || {}) },
          conversion: { ...DEFAULT_CONFIG.conversion, ...(parsed.conversion || {}) },
        });
      }
    }
  }, [data]);

  // Reload iframe when config changes
  const reloadPreview = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!configId) return;
      const { error } = await supabase
        .from("product_page_builder_config" as any)
        .update({ config: config as any, updated_at: new Date().toISOString() } as any)
        .eq("id", configId);
      if (error) throw error;

      // Sync logo to store_settings
      if (config.appearance.header_logo_url) {
        const { data: storeSettings } = await supabase
          .from("store_settings")
          .select("id")
          .limit(1)
          .single();
        if (storeSettings) {
          await supabase
            .from("store_settings")
            .update({ product_page_logo_url: config.appearance.header_logo_url })
            .eq("id", storeSettings.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-page-builder-config"] });
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      toast({ title: "Builder salvo com sucesso!" });
      setTimeout(reloadPreview, 500);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `product-page-logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      setConfig({ ...config, appearance: { ...config.appearance, header_logo_url: urlData.publicUrl } });
      toast({ title: "Logo enviada com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar logo", description: err.message, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const moveSection = (from: number, to: number) => {
    const s = [...config.sections];
    const [item] = s.splice(from, 1);
    s.splice(to, 0, item);
    setConfig({ ...config, sections: s });
  };

  const toggleSection = (id: string) => {
    setConfig({
      ...config,
      sections: config.sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    });
  };

  const updateAppearance = (key: keyof AppearanceConfig, value: any) => {
    setConfig({ ...config, appearance: { ...config.appearance, [key]: value } });
  };

  const updateTexts = (key: keyof TextsConfig, value: string) => {
    setConfig({ ...config, texts: { ...config.texts, [key]: value } });
  };

  const updateConversion = (key: keyof ConversionConfig, value: any) => {
    setConfig({ ...config, conversion: { ...config.conversion, [key]: value } });
  };

  const panels = [
    { id: "layout", label: "Layout", icon: <Layout className="w-4 h-4" />, desc: "Seções e ordem" },
    { id: "aparencia", label: "Aparência", icon: <Palette className="w-4 h-4" />, desc: "Cores, logo e estilo" },
    { id: "textos", label: "Textos", icon: <Type className="w-4 h-4" />, desc: "Rótulos e textos" },
    { id: "conversao", label: "Conversão", icon: <Sparkles className="w-4 h-4" />, desc: "Urgência e escassez" },
  ];

  if (isLoading) return <p className="text-muted-foreground p-6">Carregando...</p>;

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 bg-card border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">Editor da Página de Produto</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Personalize a página de produto</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {panels.map((panel) => (
            <div key={panel.id}>
              <button
                onClick={() => setActivePanel(activePanel === panel.id ? "" : panel.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border transition-colors hover:bg-muted/50 ${
                  activePanel === panel.id ? "bg-muted/50" : ""
                }`}
              >
                <span className="text-muted-foreground">{panel.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{panel.label}</p>
                  <p className="text-[10px] text-muted-foreground">{panel.desc}</p>
                </div>
                {activePanel === panel.id ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>

              {activePanel === panel.id && (
                <div className="p-4 border-b border-border bg-muted/20 space-y-4">
                  {/* ===== LAYOUT ===== */}
                  {panel.id === "layout" && (
                    <div className="space-y-1">
                      {config.sections.map((section, idx) => (
                        <div
                          key={section.id}
                          draggable
                          onDragStart={() => setDragItem(idx)}
                          onDragOver={(e) => { e.preventDefault(); }}
                          onDrop={() => { if (dragItem !== null) { moveSection(dragItem, idx); setDragItem(null); } }}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                            section.enabled ? "bg-card border-border" : "bg-muted/50 border-transparent opacity-60"
                          }`}
                        >
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground shrink-0">{SECTION_ICONS[section.id]}</span>
                          <span className="flex-1 text-xs font-medium text-foreground truncate">{section.label}</span>
                          <button onClick={() => toggleSection(section.id)} className="shrink-0">
                            {section.enabled ? (
                              <Eye className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ===== APARÊNCIA ===== */}
                  {panel.id === "aparencia" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs">Cor de fundo da página</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={config.appearance.bg_color || "#f5f5f5"}
                            onChange={(e) => updateAppearance("bg_color", e.target.value)}
                            className="w-8 h-8 rounded border cursor-pointer"
                          />
                          <Input
                            value={config.appearance.bg_color}
                            onChange={(e) => updateAppearance("bg_color", e.target.value)}
                            placeholder="#F5F5F5"
                            className="h-8 text-xs flex-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Cor do header</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={config.appearance.header_bg_color || "#ffffff"}
                            onChange={(e) => updateAppearance("header_bg_color", e.target.value)}
                            className="w-8 h-8 rounded border cursor-pointer"
                          />
                          <Input
                            value={config.appearance.header_bg_color}
                            onChange={(e) => updateAppearance("header_bg_color", e.target.value)}
                            placeholder="#FFFFFF"
                            className="h-8 text-xs flex-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Logo do header</Label>
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
                        <div className="mt-1 space-y-2">
                          {config.appearance.header_logo_url && (
                            <img
                              src={config.appearance.header_logo_url}
                              alt="Logo"
                              className="h-8 object-contain bg-muted rounded p-1"
                            />
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs gap-1"
                            disabled={uploadingLogo}
                            onClick={() => logoInputRef.current?.click()}
                          >
                            <Upload className="w-3 h-3" />
                            {uploadingLogo ? "Enviando..." : "Enviar logo"}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Altura da logo (px)</Label>
                        <Input
                          type="number"
                          min={16}
                          max={60}
                          value={config.appearance.header_logo_height}
                          onChange={(e) => updateAppearance("header_logo_height", Number(e.target.value))}
                          className="h-8 text-xs mt-1"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Mostrar ícone do carrinho</Label>
                        <Switch
                          checked={config.appearance.show_cart_icon}
                          onCheckedChange={(v) => updateAppearance("show_cart_icon", v)}
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Cor do botão "Comprar"</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={config.appearance.button_color}
                            onChange={(e) => updateAppearance("button_color", e.target.value)}
                            className="w-8 h-8 rounded border cursor-pointer"
                          />
                          <Input
                            value={config.appearance.button_color}
                            onChange={(e) => updateAppearance("button_color", e.target.value)}
                            className="h-8 text-xs flex-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Cor do texto do botão</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={config.appearance.button_text_color}
                            onChange={(e) => updateAppearance("button_text_color", e.target.value)}
                            className="w-8 h-8 rounded border cursor-pointer"
                          />
                          <Input
                            value={config.appearance.button_text_color}
                            onChange={(e) => updateAppearance("button_text_color", e.target.value)}
                            className="h-8 text-xs flex-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Estilo do botão</Label>
                        <div className="grid grid-cols-4 gap-1 mt-1">
                          {BUTTON_RADIUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => updateAppearance("button_radius", opt.value)}
                              className={`px-2 py-1.5 text-[10px] rounded border transition-colors ${
                                config.appearance.button_radius === opt.value
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-card border-border text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ===== TEXTOS ===== */}
                  {panel.id === "textos" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs">Texto do botão de compra</Label>
                        <Input
                          value={config.texts.buy_button_text}
                          onChange={(e) => updateTexts("buy_button_text", e.target.value)}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Rótulo do frete</Label>
                        <Input
                          value={config.texts.shipping_label}
                          onChange={(e) => updateTexts("shipping_label", e.target.value)}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Título das avaliações</Label>
                        <Input
                          value={config.texts.reviews_title}
                          onChange={(e) => updateTexts("reviews_title", e.target.value)}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Texto de "unidades disponíveis"</Label>
                        <Input
                          value={config.texts.units_available_text}
                          onChange={(e) => updateTexts("units_available_text", e.target.value)}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Título da descrição</Label>
                        <Input
                          value={config.texts.description_title}
                          onChange={(e) => updateTexts("description_title", e.target.value)}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Título de "Produtos Relacionados"</Label>
                        <Input
                          value={config.texts.related_title}
                          onChange={(e) => updateTexts("related_title", e.target.value)}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {/* ===== CONVERSÃO ===== */}
                  {panel.id === "conversao" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Mostrar badge de desconto</Label>
                        <Switch
                          checked={config.conversion.show_discount_badge}
                          onCheckedChange={(v) => updateConversion("show_discount_badge", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Mostrar flash sale timer</Label>
                        <Switch
                          checked={config.conversion.show_flash_sale}
                          onCheckedChange={(v) => updateConversion("show_flash_sale", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Mostrar contador de vendidos</Label>
                        <Switch
                          checked={config.conversion.show_sold_count}
                          onCheckedChange={(v) => updateConversion("show_sold_count", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Mostrar "unidades disponíveis"</Label>
                        <Switch
                          checked={config.conversion.show_units_available}
                          onCheckedChange={(v) => updateConversion("show_units_available", v)}
                        />
                      </div>
                      {config.conversion.show_units_available && (
                        <div>
                          <Label className="text-xs">Quantidade de unidades</Label>
                          <Input
                            type="number"
                            min={1}
                            value={config.conversion.units_available_count}
                            onChange={(e) => updateConversion("units_available_count", Number(e.target.value))}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                      )}
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
            style={{ backgroundColor: config.appearance.button_color }}
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 bg-muted/30 flex flex-col">
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

        <div className="flex-1 overflow-y-auto flex justify-center p-6">
          <div
            className={`rounded-2xl shadow-2xl border border-border overflow-hidden transition-all bg-white ${
              previewMode === "mobile" ? "w-[375px]" : "w-full max-w-2xl"
            }`}
            style={{ minHeight: 600 }}
          >
            {previewProduct ? (
              <iframe
                ref={iframeRef}
                key={`${previewMode}-${previewProduct.slug}`}
                src={`/product/${previewProduct.slug}?preview=true`}
                className="w-full h-full border-0"
                style={{ minHeight: 800 }}
                title="Product Page Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Nenhum produto ativo encontrado para preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProductBuilder;
