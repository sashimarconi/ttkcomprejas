import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MfaVerifyProps {
  onSuccess: () => void;
}

const MfaVerify = ({ onSuccess }: MfaVerifyProps) => {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setVerifying(true);

    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];

      if (!totpFactor) {
        toast.error("Nenhum fator 2FA encontrado");
        return;
      }

      const challenge = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.data.id,
        code,
      });

      if (verify.error) throw verify.error;

      onSuccess();
    } catch (err: any) {
      toast.error("Código inválido. Tente novamente.");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (code.length === 6) handleVerify();
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card rounded-xl shadow-lg p-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Verificação 2FA</h1>
          <p className="text-sm text-muted-foreground">
            Digite o código do seu app autenticador
          </p>
        </div>

        <div className="space-y-2">
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

export default MfaVerify;
