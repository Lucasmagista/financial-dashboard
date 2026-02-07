"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { BankLogo } from "@/components/bank-logo";
import { ConnectionActions } from "@/components/open-finance/connection-actions";
import { CheckCircle2, XCircle, AlertCircle, Clock3, Search, Filter, RefreshCcw } from "lucide-react";
import { BRAZILIAN_BANKS } from "@/lib/brazilian-banks";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils-finance";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const BANK_LOGO_CODE_MAP: Record<string, string> = {
  nubank: "0260",
  inter: "0077",
  itau: "0341",
  bradesco: "0237",
  santander: "0033",
  caixa: "0104",
  bb: "0001",
  c6: "0336",
  neon: "0655",
  pagbank: "0290",
  mercadopago: "0323",
  original: "0212",
  safra: "0422",
  pan: "0623",
  bs2: "0218",
  picpay: "0380",
  btg: "0208",
};

export interface OpenFinanceConnection {
  id: string;
  institution_name: string;
  institution_id?: string | null;
  item_id?: string | null;
  provider?: string | null;
  status?: string | null;
  consent_id?: string | null;
  error_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_sync_at?: string | null;
  expires_at?: string | null;
}

function renderLogo(bankName: string, size = 56, className = "") {
  const bank = BRAZILIAN_BANKS.find((b) => b.name === bankName);
  const codeKey = bank?.code || bankName.toLowerCase();
  const logoCode = BANK_LOGO_CODE_MAP[codeKey];

  if (logoCode) {
    return (
      <BankLogo
        bankCode={logoCode}
        bankName={bankName}
        size={size}
        className={className}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-muted text-lg font-semibold ${className}`}
      style={{ width: size, height: size }}
    >
      {bank?.logo || bankName[0]}
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  connections: OpenFinanceConnection[];
  statsMap?: Record<string, { account_count: number; total_balance: number }>;
  syncAuditMap?: Record<string, { accounts_synced?: number; transactions_synced?: number; created_at?: string }>;
}

export function ConnectionsGrid({ connections, statsMap = {}, syncAuditMap = {} }: Props) {
  const [selected, setSelected] = useState<OpenFinanceConnection | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncDays, setSyncDays] = useState(7);
  const [syncResults, setSyncResults] = useState<Record<string, { accounts: number; transactions: number }>>({});
  const { toast } = useToast();

  const now = new Date();
  const isOldSync = (dateStr?: string | null) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return true;
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
    return diffHours > 24;
  };

  const isExpiring = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return false;
    const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  };

  const sorted = useMemo(
    () => [...connections].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")),
    [connections]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sorted.filter((c) => {
      const hasError = (c.status || "").toLowerCase() === "error" || !!c.error_message;
      const expiring = isExpiring(c.expires_at);
      const stale = isOldSync(c.last_sync_at);
      const matchesStatus = statusFilter === "all" || (c.status || "").toLowerCase() === statusFilter;
      const matchesSearch = term === "" || c.institution_name.toLowerCase().includes(term);
      const matchesAlerts = !onlyAlerts || hasError || expiring || stale;
      return matchesStatus && matchesSearch && matchesAlerts;
    });
  }, [sorted, search, statusFilter, onlyAlerts]);

  const alertCounts = useMemo(() => {
    let expiring = 0;
    let error = 0;
    let stale = 0;
    sorted.forEach((c) => {
      const isErr = (c.status || "").toLowerCase() === "error" || !!c.error_message;
      const isExp = isExpiring(c.expires_at);
      const isStale = isOldSync(c.last_sync_at);
      if (isErr) error += 1;
      if (isExp) expiring += 1;
      if (isStale) stale += 1;
    });
    return { expiring, error, stale, total: expiring + error + stale };
  }, [sorted]);

  const resolveSyncInfo = (id?: string | null) => {
    if (!id) return undefined;
    if (syncResults[id]) return syncResults[id];
    const persisted = syncAuditMap[id];
    if (persisted) {
      return {
        accounts: Number(persisted.accounts_synced || 0),
        transactions: Number(persisted.transactions_synced || 0),
      };
    }
    return undefined;
  };

  const handleSyncAll = async () => {
    if (!connections.length) return;
    setSyncingAll(true);
    toast({ title: "Sincronizando conexões", description: `Disparando ${connections.length} sync(s) (janela ${syncDays}d)` });
    try {
      const results = await Promise.allSettled(
        connections.map(async (connection) => {
          const res = await fetch("/api/open-finance/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ connection_id: connection.id, days: syncDays, force: true }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.error || res.statusText);
          }
          const data = await res.json();
          setSyncResults((prev) => ({
            ...prev,
            [connection.id]: {
              accounts: Number(data?.accounts_synced || 0),
              transactions: Number(data?.transactions_synced || 0),
            },
          }));
          return data;
        })
      );

      const success = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - success;
      toast({
        title: "Sync finalizado",
        description: `${success} ok${failed ? ` · ${failed} falharam` : ""}`,
        variant: failed ? "destructive" : "default",
      });
    } catch (error: any) {
      toast({ title: "Erro ao sincronizar", description: error?.message || "Tente novamente", variant: "destructive" });
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3 mb-2">
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar instituição"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(syncDays)} onValueChange={(v) => setSyncDays(Number(v))}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Janela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={syncingAll || connections.length === 0}
              className="flex items-center gap-2"
              onClick={handleSyncAll}
            >
              <RefreshCcw className={`h-4 w-4 ${syncingAll ? "animate-spin" : ""}`} />
              Sincronizar tudo
            </Button>
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="expired">Expiradas</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant={onlyAlerts ? "default" : "outline"}
              className="flex items-center gap-2"
              onClick={() => setOnlyAlerts((v) => !v)}
            >
              <AlertCircle className="h-4 w-4" />
              Alertas
              {alertCounts.total > 0 && (
                <Badge variant={onlyAlerts ? "secondary" : "outline"} className="text-[11px]">
                  {alertCounts.total}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((connection) => {
          const isActive = connection.status === "active";
          const hasError = connection.status === "error" || !!connection.error_message;
          const expiring = isExpiring(connection.expires_at);
          const stale = isOldSync(connection.last_sync_at);
          const stats = statsMap[connection.institution_name];
          const bank = BRAZILIAN_BANKS.find((b) => b.name === connection.institution_name);
          const syncInfo = resolveSyncInfo(connection.id);
          return (
            <Card
              key={connection.id}
              className={`p-6 border-border/80 hover:border-primary/60 transition cursor-pointer ${hasError ? 'border-destructive/50' : ''}`}
              onClick={() => { setSelected(connection); setOpen(true); }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {renderLogo(connection.institution_name, 56, "rounded-lg")}
                  <div>
                    <p className="font-semibold leading-tight">{connection.institution_name}</p>
                    <p className="text-xs text-muted-foreground">Conectado em {formatDate(connection.created_at)}</p>
                  </div>
                </div>
                <Badge variant={hasError ? "destructive" : isActive ? "default" : "secondary"} className="gap-1 uppercase text-[11px]">
                  {isActive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {hasError ? "Erro" : isActive ? "Ativa" : connection.status || "Inativa"}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <Clock3 className="h-4 w-4" />
                Última sincronização: {connection.last_sync_at ? formatDate(connection.last_sync_at) : "—"}
                {stale && (
                  <Badge variant="secondary" className="ml-2 uppercase text-[10px]">Antiga</Badge>
                )}
                {expiring && (
                  <Badge variant="secondary" className="ml-2 uppercase text-[10px]">Consentimento expira</Badge>
                )}
                {syncInfo && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    +{syncInfo.accounts} conta(s) · +{syncInfo.transactions} lançamentos
                  </Badge>
                )}
              </div>

              {hasError && connection.error_message && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive mb-3">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <span className="line-clamp-2">{connection.error_message}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>ID item: {connection.item_id || "—"}</p>
                  <p>Consentimento: {connection.consent_id || "—"}</p>
                  {stats && (
                    <p className="text-[11px] text-foreground">
                      {stats.account_count} conta(s) · {formatCurrency(stats.total_balance)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {(connection.status === "expired" || connection.status === "error" || connection.status === "pending") && bank && (
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/open-finance/connect?bank=${bank.code}`} prefetch={false}>
                        Reautorizar
                      </Link>
                    </Button>
                  )}
                  <ConnectionActions
                    connectionId={connection.id}
                    institutionName={connection.institution_name}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected && renderLogo(selected.institution_name, 40, "rounded-md")}
              <span>{selected?.institution_name || "Conexão"}</span>
              {selected?.expires_at && (
                <Badge variant="secondary">
                  Expira em {format(new Date(selected.expires_at), "dd/MM/yyyy")}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Detalhes completos capturados do Open Finance para esta instituição.
            </DialogDescription>
            {selected && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {selected.error_message && (
                  <Badge variant="destructive" className="uppercase text-[11px]">Erro</Badge>
                )}
                {isOldSync(selected.last_sync_at) && (
                  <Badge variant="secondary" className="uppercase text-[11px]">Sync antiga</Badge>
                )}
                {isExpiring(selected.expires_at) && (
                  <Badge variant="secondary" className="uppercase text-[11px]">Consentimento expira</Badge>
                )}
              </div>
            )}
          </DialogHeader>

          {selected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge variant={selected.status === "active" ? "default" : "secondary"} className="w-fit uppercase text-[11px]">
                    {selected.status || "indefinido"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Provider</p>
                  <p className="font-medium">{selected.provider || "pluggy"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Item ID</p>
                  <p className="font-medium break-all">{selected.item_id || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Institution ID</p>
                  <p className="font-medium break-all">{selected.institution_id || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Consent ID</p>
                  <p className="font-medium break-all">{selected.consent_id || "—"}</p>
                </div>
                {statsMap[selected.institution_name] && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Contas · Saldo</p>
                    <p className="font-medium">
                      {statsMap[selected.institution_name].account_count} · {formatCurrency(statsMap[selected.institution_name].total_balance)}
                    </p>
                  </div>
                )}
                {selected && resolveSyncInfo(selected.id) && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Resultado da sync</p>
                    <p className="font-medium">+{resolveSyncInfo(selected.id)?.accounts} conta(s) · +{resolveSyncInfo(selected.id)?.transactions} lançamentos</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Expira em</p>
                  <p className="font-medium">{formatDate(selected.expires_at)}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Criado em</p>
                  <p className="font-medium">{formatDate(selected.created_at)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Última sincronização</p>
                  <p className="font-medium">{formatDate(selected.last_sync_at)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Atualizado em</p>
                  <p className="font-medium">{formatDate(selected.updated_at)}</p>
                </div>
              </div>

              {selected.error_message && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div>
                    <p className="font-semibold text-destructive">Erro reportado</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selected.error_message}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                {(selected.status === "expired" || selected.status === "error" || selected.status === "pending") && (
                  (() => {
                    const bank = BRAZILIAN_BANKS.find((b) => b.name === selected.institution_name);
                    if (!bank) return null;
                    return (
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/open-finance/connect?bank=${bank.code}`} prefetch={false}>
                          Reautorizar
                        </Link>
                      </Button>
                    );
                  })()
                )}
                <ConnectionActions
                  connectionId={selected.id}
                  institutionName={selected.institution_name}
                />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
