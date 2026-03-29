CREATE TABLE public.checkout_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pix_payment_title text NOT NULL DEFAULT 'Pagamento Seguro',
  pix_expiration_minutes integer NOT NULL DEFAULT 30,
  checkout_header_text text NOT NULL DEFAULT 'Resumo do pedido',
  checkout_security_text text NOT NULL DEFAULT 'Finalização da compra segura garantida',
  checkout_button_text text NOT NULL DEFAULT 'Fazer pedido',
  pix_instruction_text text NOT NULL DEFAULT 'Efetue o pagamento agora mesmo escaneando o QR Code',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checkout_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Checkout settings are publicly readable" ON public.checkout_settings FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can manage checkout settings" ON public.checkout_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.checkout_settings (pix_payment_title, pix_expiration_minutes) VALUES ('Pagamento Seguro', 30);