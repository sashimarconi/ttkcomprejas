import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Key, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const AdminSecurity = () => {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [changingPin, setChangingPin] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

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

    // Verify current password by re-signing in
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
        <p className="text-sm text-muted-foreground mt-1">Gerencie sua senha e PIN de acesso</p>
      </div>

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
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="w-full"
            >
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
            <Button
              onClick={handleChangePin}
              disabled={changingPin || currentPin.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6}
              className="w-full"
            >
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
