

# PWA com Notificações Push de Vendas

## Resumo

Transformar o painel admin em um app instalável (PWA) com notificações push no celular. Quando uma venda for confirmada, o admin recebe uma notificação push no celular mesmo com o app em segundo plano.

## Como funciona

1. Admin acessa o painel no celular → instala na tela inicial
2. Clica em "Ativar notificações" nas configurações
3. Quando uma venda é paga, recebe push notification no celular com valor e gateway

## Implementação Técnica

### 1. Manifesto PWA + ícones
- Criar `public/manifest.json` com nome, cores, ícones e `display: "standalone"`
- Adicionar `<link rel="manifest">` no `index.html`
- Criar ícones PWA (192x192, 512x512)

### 2. Service Worker (`public/sw.js`)
- Escuta evento `push` e exibe notificação nativa
- Escuta `notificationclick` para abrir o painel
- SEM cache/offline (evita problemas com preview do Lovable)

### 3. Registro do Service Worker (`src/main.tsx`)
- Registrar SW apenas em produção e fora de iframe/preview
- Guard contra ambiente de desenvolvimento

### 4. Tabela `push_subscriptions`
- Armazena `endpoint`, `p256dh`, `auth` (dados do Web Push)
- RLS: inserir/deletar autenticado

### 5. Componente de ativação (`src/components/admin/PushNotificationToggle.tsx`)
- Botão para o admin ativar/desativar notificações
- Solicita permissão do navegador → salva subscription no banco
- Exibido no dashboard ou settings do admin

### 6. Edge Function `send-push-notification`
- Recebe evento de venda (chamada pelo `payment-webhook`)
- Busca todas as subscriptions ativas
- Envia push via Web Push API (biblioteca `web-push`)
- Precisa de VAPID keys (geradas e salvas como secrets)

### 7. Integração no `payment-webhook`
- Após marcar pedido como pago, chama a edge function `send-push-notification`

## Secrets necessários
- `VAPID_PUBLIC_KEY` — chave pública (também usada no frontend)
- `VAPID_PRIVATE_KEY` — chave privada (apenas backend)
- Serão geradas automaticamente via script

## Limitações
- iOS Safari suporta push notifications a partir do iOS 16.4 (PWA instalada)
- Android Chrome funciona perfeitamente
- Notificações só funcionam no app publicado, não no preview do editor

