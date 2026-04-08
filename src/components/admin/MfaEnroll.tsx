import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ShieldCheck, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface MfaEnrollProps {
  onSuccess: () => void;
}

const MfaEnroll = ({ onSuccess }: MfaEnrollProps) => {
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    enrollMfa();
  }, []);

  const enrollMfa = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
      });

      if (error) throw error;

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (err: any) {
      toast.error("Erro ao configurar 2FA: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setVerifying(true);

    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });

      if (verify.error) throw verify.error;

      toast.success("2FA ativado com sucesso!");
      onSuccess();
    } catch (err: any) {
      toast.error("Código inválido. Tente novamente.");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (code.length === 6) handleVerify();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card rounded-xl shadow-lg p-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Configurar 2FA</h1>
          <p className="text-sm text-muted-foreground">
            Escaneie o QR Code com seu app autenticador (Google Authenticator, Authy, etc.)
          </p>
        </div>

        {qrCode && (
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-lg">
              <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground text-center">Ou insira manualmente:</p>
          <button
            onClick={copySecret}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-muted rounded-lg text-xs font-mono text-foreground hover:bg-muted/80 transition-colors"
          >
            <span className="truncate">{secret}</span>
            {copied ? <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground text-center">
            Digite o código de 6 dígitos
          </p>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {verifying && (
            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Verificando...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MfaEnroll;
