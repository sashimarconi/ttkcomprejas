
CREATE TABLE public.checkout_builder_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checkout_builder_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Checkout builder config is publicly readable"
  ON public.checkout_builder_config FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can manage checkout builder config"
  ON public.checkout_builder_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default config
INSERT INTO public.checkout_builder_config (config) VALUES ('{
  "sections": [
    {"id": "timer", "type": "timer", "enabled": true, "label": "Cronômetro de urgência"},
    {"id": "customer_info", "type": "customer_info", "enabled": true, "label": "Informações do cliente"},
    {"id": "product_card", "type": "product_card", "enabled": true, "label": "Card do produto"},
    {"id": "shipping", "type": "shipping", "enabled": true, "label": "Opções de frete"},
    {"id": "order_bumps", "type": "order_bumps", "enabled": true, "label": "Order bumps"},
    {"id": "summary", "type": "summary", "enabled": true, "label": "Resumo do pedido"},
    {"id": "payment", "type": "payment", "enabled": true, "label": "Forma de pagamento"},
    {"id": "savings", "type": "savings", "enabled": true, "label": "Banner de economia"}
  ],
  "fields": {
    "name": {"enabled": true, "required": true, "label": "Nome completo"},
    "email": {"enabled": true, "required": true, "label": "E-mail"},
    "phone": {"enabled": true, "required": true, "label": "Telefone"},
    "cpf": {"enabled": true, "required": true, "label": "CPF"},
    "address": {"enabled": true, "required": false, "label": "Endereço"}
  },
  "appearance": {
    "primary_color": "#E63946",
    "button_radius": "full",
    "button_text": "Fazer pedido",
    "header_text": "Resumo do pedido",
    "security_text": "Finalização da compra segura garantida",
    "show_progress_bar": true,
    "show_security_badge": true,
    "timer_enabled": true,
    "timer_minutes": 10,
    "timer_text": "Oferta termina em:"
  }
}'::jsonb);
