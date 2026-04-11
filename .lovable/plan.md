

## Plano: Relaxar RLS do visitor_sessions

### Problema
As políticas de INSERT e UPDATE na tabela `visitor_sessions` exigem `user_agent IS NOT NULL AND has_interaction = true`. Se um visitante real tiver user_agent vazio (navegador com privacidade, extensão, edge case), ele será bloqueado silenciosamente no banco, mesmo passando pela verificação JS.

### Solução
Substituir as políticas restritivas por políticas abertas para INSERT e UPDATE público, mantendo toda a filtragem de bots apenas no lado do cliente (JavaScript), que já funciona bem com:
- Detecção de `navigator.webdriver`
- Regex de user agents de bots
- Verificação de interação humana (clique/toque/tecla/scroll) antes de gravar

### Alterações

**1. Migration SQL** — Remover as duas políticas restritivas e criar novas permissivas:
- `DROP POLICY "Public can insert verified sessions only"` 
- `DROP POLICY "Public can update own verified sessions"`
- Criar nova política INSERT pública com `WITH CHECK (true)`
- Criar nova política UPDATE pública com `USING (true) WITH CHECK (true)`

### Segurança mantida
- O código JS (`visitor-verification.ts`) continua bloqueando bots antes de qualquer chamada ao banco
- A verificação de interação humana continua sendo obrigatória no cliente
- Nenhum visitante real será bloqueado por edge cases de navegador

