import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Key, Loader2, ShieldCheck, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const AdminSecurity = () => {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [changingPin, setChangingPin] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // 2FA state
  const [mfaStatus, setMfaStatus] = useState<"loading" | "not-enrolled" | "enrolled">("loading");
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [unenrollPin, setUnenrollPin] = useState("");
  const [showUnenrollConfirm, setShowUnenrollConfirm] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [verifyingMfa, setVerifyingMfa] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verified = factors?.totp?.filter(f => f.status === "verified") ?? [];
    setMfaStatus(verified.length > 0 ? "enrolled" : "not-enrolled");
  };

  const startEnroll = async () => {
    setEnrolling(true);
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
      setEnrolling(false);
    }
  };

  const verifyEnroll = async () => {
    if (mfaCode.length !== 6) return;
    setVerifyingMfa(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: mfaCode,
      });
      if (verify.error) throw verify.error;
      toast.success("2FA ativado com sucesso!");
      setMfaStatus("enrolled");
      setEnrolling(false);
      setQrCode("");
      setSecret("");
      setMfaCode("");
    } catch {
      toast.error("Código inválido. Tente novamente.");
      setMfaCode("");
    } finally {
      setVerifyingMfa(false);
    }
  };

  const unenrollMfa = async () => {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.[0];
    if (!factor) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) {
      toast.error("Erro ao desativar 2FA: " + error.message);
    } else {
      toast.success("2FA desativado");
      setMfaStatus("not-enrolled");
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (mfaCode.length === 6 && enrolling) verifyEnroll();
  }, [mfaCode]);

  const handleChangePin = async () => {
    if (newPin.length !== 6 || confirmPin.length !== 6) {
      toast.error("PIN deve ter 6 dígitos");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("Os PINs não coincidem");
      return;
    }
    setChangingPin(true);
    const { data: valid } = await supabase.rpc("verify_admin_pin", { p_pin: currentPin });
    if (!valid) {
      toast.error("PIN atual incorreto");
      setChangingPin(false);
      return;
    }
    const { error } = await supabase.rpc("set_admin_pin", { p_pin: newPin });
    if (error) {
      toast.error("Erro ao alterar PIN");
    } else {
      toast.success("PIN alterado com sucesso!");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    }
    setChangingPin(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setChangingPassword(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      toast.error("Erro ao obter usuário");
      setChangingPassword(false);
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) {
      toast.error("Senha atual incorreta");
      setChangingPassword(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error("Erro ao alterar senha");
    } else {
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Segurança</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie sua senha, PIN e autenticação de dois fatores</p>
      </div>

      {/* 2FA Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Autenticação de Dois Fatores (2FA)
            {mfaStatus === "enrolled" && (
              <Badge variant="default" className="ml-2 bg-green-600">Ativo</Badge>
            )}
            {mfaStatus === "not-enrolled" && (
              <Badge variant="secondary" className="ml-2">Inativo</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Use um app autenticador (Google Authenticator, Authy) para adicionar uma camada extra de segurança
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mfaStatus === "loading" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
            </div>
          )}

          {mfaStatus === "not-enrolled" && !enrolling && (
            <Button onClick={startEnroll}>Configurar 2FA</Button>
          )}

          {enrolling && qrCode && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Escaneie o QR Code com seu app autenticador:
              </p>
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-lg">
                  <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
                </div>
              </div>
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
                <Label>Digite o código de 6 dígitos do app</Label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={mfaCode} onChange={setMfaCode}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} className="w-10 h-11" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {verifyingMfa && (
                  <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Verificando...
                  </p>
                )}
              </div>
            </div>
          )}

          {mfaStatus === "enrolled" && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">2FA está ativo. Será solicitado a cada login.</p>
              <Button variant="destructive" size="sm" onClick={unenrollMfa}>
                Desativar 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Key className="w-5 h-5 text-primary" />
              Alterar Senha
            </CardTitle>
            <CardDescription>Troque sua senha de acesso ao painel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Senha atual</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword} className="w-full">
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Alterar Senha
            </Button>
          </CardContent>
        </Card>

        {/* PIN Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-primary" />
              Alterar PIN
            </CardTitle>
            <CardDescription>Troque seu PIN de 6 dígitos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>PIN atual</Label>
              <InputOTP maxLength={6} value={currentPin} onChange={setCurrentPin}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="w-10 h-11" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="space-y-2">
              <Label>Novo PIN</Label>
              <InputOTP maxLength={6} value={newPin} onChange={setNewPin}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="w-10 h-11" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="space-y-2">
              <Label>Confirmar novo PIN</Label>
              <InputOTP maxLength={6} value={confirmPin} onChange={setConfirmPin}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="w-10 h-11" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={handleChangePin} disabled={changingPin || currentPin.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6} className="w-full">
              {changingPin ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Alterar PIN
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSecurity;
