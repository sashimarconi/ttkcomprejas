import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import MfaEnroll from "@/components/admin/MfaEnroll";
import MfaVerify from "@/components/admin/MfaVerify";

type Step = "login" | "mfa-enroll" | "mfa-verify";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("login");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Check MFA factors
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verifiedTotpFactors = factors?.totp?.filter(f => f.status === "verified") ?? [];

    if (verifiedTotpFactors.length > 0) {
      // Has 2FA enrolled - need to verify
      setStep("mfa-verify");
    } else {
      // No 2FA - prompt enrollment
      setStep("mfa-enroll");
    }

    setLoading(false);
  };

  const handleMfaSuccess = () => {
    navigate("/ctrl9k");
  };

  if (step === "mfa-enroll") {
    return <MfaEnroll onSuccess={handleMfaSuccess} />;
  }

  if (step === "mfa-verify") {
    return <MfaVerify onSuccess={handleMfaSuccess} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card rounded-xl shadow-lg p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">Painel Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Faça login para gerenciar sua loja</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@exemplo.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full bg-marketplace-red hover:bg-marketplace-red/90" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
