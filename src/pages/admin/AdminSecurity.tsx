import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Key, Loader2, Ban, Trash2, Plus, Globe, AlertTriangle, Bot } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface IpStat {
  ip: string;
  count: number;
  last_seen: string;
  city?: string;
  region?: string;
  country?: string;
}

interface BlockedIp {
  id: string;
  ip: string;
  reason: string | null;
  created_at: string;
}

const AdminSecurity = () => {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [changingPin, setChangingPin] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // IP management
  const [ipStats, setIpStats] = useState<IpStat[]>([]);
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [newBlockIp, setNewBlockIp] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [loadingIps, setLoadingIps] = useState(true);
  const [botCount, setBotCount] = useState(0);
  const [cleaningBots, setCleaningBots] = useState(false);

  const fetchIpData = useCallback(async () => {
    setLoadingIps(true);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [sessionsRes, blockedRes, botRes] = await Promise.all([
      supabase.from("visitor_sessions")
        .select("ip, last_seen_at, city, region, country")
        .not("ip", "is", null)
        .neq("ip", "")
        .gte("last_seen_at", todayStart.toISOString())
        .order("last_seen_at", { ascending: false }) as any,
      supabase.from("blocked_ips")
        .select("*")
        .order("created_at", { ascending: false }) as any,
      supabase.from("visitor_sessions")
        .select("id", { count: "exact", head: true })
        .eq("is_bot", true) as any,
    ]);

    // Aggregate by IP
    const ipMap = new Map<string, IpStat>();
    for (const s of (sessionsRes.data || [])) {
      if (!s.ip) continue;
      const existing = ipMap.get(s.ip);
      if (existing) {
        existing.count++;
        if (s.last_seen_at > existing.last_seen) existing.last_seen = s.last_seen_at;
      } else {
        ipMap.set(s.ip, {
          ip: s.ip,
          count: 1,
          last_seen: s.last_seen_at,
          city: s.city,
          region: s.region,
          country: s.country,
        });
      }
    }
    const sorted = Array.from(ipMap.values()).sort((a, b) => b.count - a.count);
    setIpStats(sorted);
    setBlockedIps(blockedRes.data || []);
    setBotCount(botRes.count || 0);
    setLoadingIps(false);
  }, []);

  useEffect(() => {
    fetchIpData();
  }, [fetchIpData]);

  const handleBlockIp = async (ip: string, reason?: string) => {
    const { error } = await supabase.from("blocked_ips").insert({
      ip,
      reason: reason || null,
    } as any);
    if (error) {
      if (error.code === "23505") {
        toast.error("IP já está bloqueado");
      } else {
        toast.error("Erro ao bloquear IP");
      }
      return;
    }
    toast.success(`IP ${ip} bloqueado!`);
    setNewBlockIp("");
    setBlockReason("");
    fetchIpData();
  };

  const handleUnblockIp = async (id: string, ip: string) => {
    const { error } = await supabase.from("blocked_ips").delete().eq("id", id) as any;
    if (error) {
      toast.error("Erro ao desbloquear");
      return;
    }
    toast.success(`IP ${ip} desbloqueado`);
    fetchIpData();
  };

  const handleCleanBots = async () => {
    setCleaningBots(true);
    const { error } = await supabase.from("visitor_sessions").delete().or("ip.is.null,ip.eq.") as any;
    if (error) {
      toast.error("Erro ao limpar sessões bot");
    } else {
      toast.success(`Sessões bot removidas!`);
    }
    setCleaningBots(false);
    fetchIpData();
  };

  const isIpBlocked = (ip: string) => blockedIps.some(b => b.ip === ip);

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
        <p className="text-sm text-muted-foreground mt-1">Gerencie senha, PIN e bloqueio de IPs</p>
      </div>

      {/* Bot Protection Card */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Bot className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Proteção Anti-Bot</h3>
                <p className="text-xs text-muted-foreground">
                  {botCount > 0
                    ? `${botCount.toLocaleString("pt-BR")} bots confirmados por user-agent (crawlers/scrapers)`
                    : "Nenhum bot confirmado — tudo limpo!"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={botCount > 0 ? "destructive" : "secondary"} className="text-xs">
                {botCount > 0 ? `${botCount} bots` : "0 bots"}
              </Badge>
              {botCount > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleCleanBots}
                  disabled={cleaningBots}
                  className="text-xs"
                >
                  {cleaningBots ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                  Limpar bots
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">
            Sessões sem IP são automaticamente bloqueadas e não aparecem nas métricas. Novos bots são impedidos de acessar o site.
          </p>
        </CardContent>
      </Card>

      {/* IP Blocking Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Ban className="w-5 h-5 text-destructive" />
            Acessos por IP (hoje)
          </CardTitle>
          <CardDescription>Veja quantos acessos cada IP teve e bloqueie IPs suspeitos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Manual block */}
          <div className="flex gap-2">
            <Input
              placeholder="Ex: 192.168.0.1"
              value={newBlockIp}
              onChange={(e) => setNewBlockIp(e.target.value)}
              className="max-w-[200px]"
            />
            <Input
              placeholder="Motivo (opcional)"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="max-w-[250px]"
            />
            <Button
              variant="destructive"
              size="sm"
              disabled={!newBlockIp.trim()}
              onClick={() => handleBlockIp(newBlockIp.trim(), blockReason.trim())}
            >
              <Plus className="w-4 h-4 mr-1" /> Bloquear
            </Button>
          </div>

          {loadingIps ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : ipStats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum acesso registrado com IP hoje</p>
          ) : (
            <div className="rounded-md border max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP</TableHead>
                    <TableHead>Sessões</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ipStats.map((stat) => {
                    const blocked = isIpBlocked(stat.ip);
                    const suspicious = stat.count > 20;
                    return (
                      <TableRow key={stat.ip} className={suspicious ? "bg-destructive/5" : ""}>
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                            {stat.ip}
                            {suspicious && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-bold ${suspicious ? "text-destructive" : "text-foreground"}`}>
                            {stat.count}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {[stat.city, stat.region, stat.country].filter(Boolean).join(", ") || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(stat.last_seen).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell>
                          {blocked ? (
                            <Badge variant="destructive" className="text-xs">Bloqueado</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Ativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {blocked ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7"
                              onClick={() => {
                                const entry = blockedIps.find(b => b.ip === stat.ip);
                                if (entry) handleUnblockIp(entry.id, stat.ip);
                              }}
                            >
                              Desbloquear
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs h-7"
                              onClick={() => handleBlockIp(stat.ip, "Bloqueado via painel")}
                            >
                              Bloquear
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Blocked IPs list */}
          {blockedIps.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Ban className="w-4 h-4 text-destructive" />
                IPs Bloqueados ({blockedIps.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {blockedIps.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-1.5 bg-destructive/10 text-destructive text-xs px-3 py-1.5 rounded-full"
                  >
                    <span className="font-mono">{b.ip}</span>
                    {b.reason && <span className="text-destructive/70">({b.reason})</span>}
                    <button
                      onClick={() => handleUnblockIp(b.id, b.ip)}
                      className="ml-1 hover:text-destructive/80"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
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
                  {[0, 1, 2, 3, 4, 5].map((i) => (<InputOTPSlot key={i} index={i} className="w-10 h-11" />))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="space-y-2">
              <Label>Novo PIN</Label>
              <InputOTP maxLength={6} value={newPin} onChange={setNewPin}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (<InputOTPSlot key={i} index={i} className="w-10 h-11" />))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="space-y-2">
              <Label>Confirmar novo PIN</Label>
              <InputOTP maxLength={6} value={confirmPin} onChange={setConfirmPin}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (<InputOTPSlot key={i} index={i} className="w-10 h-11" />))}
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
