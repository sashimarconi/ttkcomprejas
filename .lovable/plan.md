

# Product Page Builder — Plano de Implementação

## Resumo

Criar um editor visual completo para a página de produto, seguindo o mesmo padrão do Checkout Builder: painel lateral com abas de configuração + preview real via iframe à direita.

## O que será editável

**Layout (seções)**
- Reordenar e mostrar/esconder: Galeria, Preço, Info do Produto, Frete, Trust Badges, Loja, Avaliações, Descrição/Vídeo, Produtos Relacionados, Footer Fixo
- Drag-and-drop para reordenar

**Aparência**
- Cor de fundo da página
- Cor do header
- Logo do header (upload) + altura
- Cor do botão "Comprar agora"
- Estilo do botão (raio de borda)
- Mostrar/esconder ícone de carrinho no header

**Textos**
- Texto do botão de compra ("Comprar agora", "Garantir o meu", etc.)
- Texto do frete ("Frete grátis", customizado)
- Texto da seção de avaliações ("Avaliações", etc.)
- Texto de "unidades disponíveis"

**Elementos de conversão**
- Mostrar/esconder badge de desconto
- Mostrar/esconder flash sale timer
- Mostrar/esconder contador de vendidos
- Mostrar/esconder "unidades disponíveis" + valor customizável

## Implementação Técnica

### 1. Nova tabela `product_page_builder_config`
- `id`, `config` (jsonb), `created_at`, `updated_at`
- RLS: leitura pública, escrita autenticada
- Uma linha única (singleton, igual checkout_builder_config)

### 2. Nova página `src/pages/admin/AdminProductBuilder.tsx`
- Mesmo layout split-panel do AdminCheckoutBuilder
- Painel esquerdo com abas: Layout, Aparência, Textos, Conversão
- Preview direito com iframe apontando para `/product/{slug}?preview=true`
- Toggle mobile/desktop no preview
- Salva config no Supabase

### 3. Atualizar `src/pages/ProductPage.tsx`
- Ler a config do `product_page_builder_config` via React Query
- Aplicar: ordem das seções, visibilidade, cores, textos customizados
- Passar config como props para cada componente filho

### 4. Rota e menu
- Adicionar rota `/admin/product-builder` no `App.tsx`
- Adicionar link "Editor de Produto" no menu lateral do `AdminLayout.tsx`

### 5. Componentes adaptados
- `ProductHeader`, `PricingBlock`, `ProductInfo`, `FixedFooter` etc. receberão props opcionais da config para override de textos/cores/visibilidade

## Arquitetura da Config (JSON)

```text
{
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
    bg_color: "#F5F5F5",
    header_bg_color: "#FFFFFF",
    header_logo_url: "",
    header_logo_height: 28,
    show_cart_icon: true,
    button_color: "#E63946",
    button_text_color: "#FFFFFF",
    button_radius: "full",
    buy_button_text: "Comprar agora",
  },
  texts: {
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
  }
}
```

