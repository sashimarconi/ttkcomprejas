import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";

interface PinGateProps {
  onSuccess: () => void;
}

const PinGate = ({ onSuccess }: PinGateProps) => {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");

  useEffect(() => {
    checkHasPin();
  }, []);

  const checkHasPin = async () => {
    const { data } = await supabase.from("admin_pin").select("id").limit(1);
    if (data && data.length > 0) {
      setHasPin(true);
    } else {
      setHasPin(false);
      setIsSettingUp(true);
    }
  };

  const handleVerify = async () => {
    if (pin.length !== 6) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("verify_admin_pin", { p_pin: pin });
    if (error) {
      toast.error("Erro ao verificar PIN");
      setLoading(false);
      return;
    }
    if (data) {
      sessionStorage.setItem("admin_pin_verified", "true");
      onSuccess();
    } else {
      toast.error("PIN incorreto");
      setPin("");
    }
    setLoading(false);
  };

  const handleSetup = async () => {
    if (step === "enter") {
      if (newPin.length !== 6) return;
      setStep("confirm");
      return;
    }
    if (confirmPin !== newPin) {
      toast.error("Os PINs não coincidem");
      setConfirmPin("");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("set_admin_pin", { p_pin: newPin });
    if (error) {
      toast.error("Erro ao definir PIN");
      setLoading(false);
      return;
    }
    toast.success("PIN configurado com sucesso!");
    sessionStorage.setItem("admin_pin_verified", "true");
    onSuccess();
  };

  useEffect(() => {
    if (!isSettingUp && pin.length === 6) {
      handleVerify();
    }
  }, [pin]);

  useEffect(() => {
    if (isSettingUp && step === "confirm" && confirmPin.length === 6) {
      handleSetup();
    }
  }, [confirmPin]);

  if (hasPin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-xl border border-border p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            {isSettingUp ? (
              <Shield className="w-7 h-7 text-primary" />
            ) : (
              <Lock className="w-7 h-7 text-primary" />
            )}
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {isSettingUp
              ? step === "enter"
                ? "Criar PIN de Segurança"
                : "Confirmar PIN"
              : "Digite seu PIN"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSettingUp
              ? step === "enter"
                ? "Defina um PIN de 6 dígitos para proteger o painel"
                : "Digite o PIN novamente para confirmar"
              : "Insira seu PIN de 6 dígitos para acessar o painel"}
          </p>
        </div>

        <div className="flex justify-center">
          {isSettingUp ? (
            step === "enter" ? (
              <InputOTP maxLength={6} value={newPin} onChange={setNewPin}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="w-11 h-13 text-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            ) : (
              <InputOTP maxLength={6} value={confirmPin} onChange={setConfirmPin}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="w-11 h-13 text-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            )
          ) : (
            <InputOTP maxLength={6} value={pin} onChange={setPin}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} className="w-11 h-13 text-lg" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          )}
        </div>

        {isSettingUp && step === "enter" && newPin.length === 6 && (
          <Button onClick={handleSetup} className="w-full" disabled={loading}>
            {loading ? "..." : "Continuar"}
          </Button>
        )}

        {isSettingUp && step === "confirm" && (
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => {
              setStep("enter");
              setConfirmPin("");
            }}
          >
            Voltar
          </Button>
        )}

        {loading && !isSettingUp && (
          <p className="text-center text-sm text-muted-foreground">Verificando...</p>
        )}
      </div>
    </div>
  );
};

export default PinGate;
