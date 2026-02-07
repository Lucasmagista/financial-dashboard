import { requireAuth } from '@/lib/auth-simple';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Link2, Shield, Zap, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { BRAZILIAN_BANKS, getOpenFinanceEnabledBanks } from '@/lib/brazilian-banks';
import { BankLogo } from '@/components/bank-logo';
import { ConnectionsGrid } from '@/components/open-finance/connections-grid';
import { formatCurrency } from '@/lib/utils-finance';
import { ensureAuditTable } from '@/lib/audit-log';

const BANK_LOGO_CODE_MAP: Record<string, string> = {
  nubank: '0260',
  inter: '0077',
  itau: '0341',
  bradesco: '0237',
  santander: '0033',
  caixa: '0104',
  bb: '0001',
  c6: '0336',
  neon: '0655',
  pagbank: '0290',
  mercadopago: '0323',
  original: '0212',
  safra: '0422',
  pan: '0623',
  bs2: '0218',
  picpay: '0380',
  btg: '0208',
};

const renderLogo = (bank: { code: string; name: string; logo?: string }, size = 64, className = '') => {
  const logoCode = BANK_LOGO_CODE_MAP[bank.code];
  if (logoCode) {
    return (
      <BankLogo
        bankCode={logoCode}
        bankName={bank.name}
        size={size}
        className={className}
      />
    );
  }

  // Fallback para emoji/Base64 definido em brazilian-banks.ts
  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-muted text-2xl ${className}`}
      style={{ width: size, height: size }}
    >
      {bank.logo || bank.name[0]}
    </div>
  );
};

export default async function OpenFinancePage() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/auth/login');
  }
  
  // Fetch existing connections
  const rawConnections = await sql`
    SELECT * FROM open_finance_connections
    WHERE user_id = ${user.id}
      AND status <> 'inactive'
    ORDER BY created_at DESC
  `;

  await ensureAuditTable();

  const accountAgg = await sql`
    SELECT bank_name as institution_name,
           COUNT(*)::int as account_count,
           COALESCE(SUM(balance), 0) as total_balance
    FROM accounts
    WHERE user_id = ${user.id} AND bank_name IS NOT NULL AND is_active = true
    GROUP BY bank_name
  `;

  const flow30 = await sql`
    SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as net
    FROM transactions
    WHERE user_id = ${user.id} AND transaction_date >= NOW() - INTERVAL '30 days'
  `;

  const syncAudits = await sql`
    SELECT DISTINCT ON (entity_type, entity_id)
      entity_type,
      entity_id,
      details,
      created_at
    FROM audit_logs
    WHERE user_id = ${user.id} AND action = 'open_finance.sync'
    ORDER BY entity_type, entity_id, created_at DESC
  `;

  const statsMap = accountAgg.reduce((acc: Record<string, any>, row: any) => {
    acc[row.institution_name] = {
      account_count: row.account_count,
      total_balance: Number(row.total_balance || 0),
    };
    return acc;
  }, {} as Record<string, { account_count: number; total_balance: number }>);

  const connections = rawConnections.map((c: any) => ({
    ...c,
    created_at: c.created_at ? c.created_at.toISOString?.() ?? c.created_at : null,
    updated_at: c.updated_at ? c.updated_at.toISOString?.() ?? c.updated_at : null,
    last_sync_at: c.last_sync_at ? c.last_sync_at.toISOString?.() ?? c.last_sync_at : null,
    expires_at: c.expires_at ? c.expires_at.toISOString?.() ?? c.expires_at : null,
  }));

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

  const totalAccounts = Object.values(statsMap).reduce((acc, s) => acc + s.account_count, 0);
  const totalBalance = Object.values(statsMap).reduce((acc, s) => acc + s.total_balance, 0);
  const activeCount = connections.filter((c) => c.status === 'active').length;
  const errorCount = connections.filter((c) => (c.status === 'error') || !!c.error_message).length;
  const expiringCount = connections.filter((c) => isExpiring(c.expires_at)).length;
  const staleCount = connections.filter((c) => isOldSync(c.last_sync_at)).length;
  const net30 = Number(flow30?.[0]?.net || 0);
  const dailyAvg = net30 / 30;
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const daysLeft = Math.max(0, Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const forecastBalance = totalBalance + dailyAvg * daysLeft;
  const expiredBanks = new Set(
    connections
      .filter((c) => c.status === 'expired')
      .map((c) => c.institution_name)
  );

  const syncAuditMap = syncAudits.reduce((acc: Record<string, { accounts_synced?: number; transactions_synced?: number; created_at?: string }>, row: any) => {
    // Use composite key to avoid collisions and handle missing columns gracefully.
    const key = `${String(row.entity_type || 'unknown')}:${String(row.entity_id || 'unknown')}`;
    acc[key] = {
      accounts_synced: Number(row.details?.accounts_synced || 0),
      transactions_synced: Number(row.details?.transactions_synced || 0),
      created_at: row.created_at ? row.created_at.toISOString?.() ?? row.created_at : undefined,
    };
    return acc;
  }, {});

  // Get only banks with Open Finance enabled
  const availableBanks = getOpenFinanceEnabledBanks();

  // Group by category
  const digitalBanks = availableBanks.filter(b => b.category === 'digital');
  const traditionalBanks = availableBanks.filter(b => b.category === 'traditional');
  const fintechs = availableBanks.filter(b => b.category === 'fintech');

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Open Finance Brasil</h1>
        <p className="text-muted-foreground mt-1">
          Conecte suas contas bancárias de forma segura via Open Finance regulamentado pelo Banco Central
        </p>
      </div>

      {/* Status Alert */}
      {!process.env.PLUGGY_CLIENT_ID && (
        <Card className="p-6 mb-8 border-yellow-500/50 bg-yellow-500/5">
          <div className="flex gap-4">
            <AlertCircle className="h-6 w-6 text-yellow-600 shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">Configuração Necessária</h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                Para ativar a conexão real com bancos, você precisa configurar suas credenciais do Pluggy. 
                Adicione as variáveis <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">PLUGGY_CLIENT_ID</code> e{' '}
                <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">PLUGGY_CLIENT_SECRET</code> nas configurações do projeto.
              </p>
              <Button variant="outline" size="sm" className="mt-3 bg-transparent" asChild>
                <a href="https://dashboard.pluggy.ai" target="_blank" rel="noopener noreferrer">
                  Obter Credenciais Pluggy
                </a>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Saldo consolidado</p>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(totalBalance || 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">{totalAccounts} conta(s) conectadas</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Conexões ativas</p>
          <p className="text-2xl font-semibold mt-1">{activeCount}/{connections.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{expiringCount} expirando · {staleCount} sync antigas</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Alertas</p>
          <p className="text-2xl font-semibold mt-1">{errorCount + expiringCount}</p>
          <p className="text-xs text-muted-foreground mt-1">{errorCount} erros · {expiringCount} consentimentos</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Previsão fim do mês</p>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(forecastBalance || 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">Média 30d: {formatCurrency(dailyAvg * 30 || 0)} · {daysLeft} dias restantes</p>
        </Card>
      </div>

      {/* Benefits Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="rounded-full bg-primary/10 p-3 w-fit mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">Seguro e Regulamentado</h3>
          <p className="text-sm text-muted-foreground">
            Autorizado pelo Banco Central (Resolução BCB nº 32/2020), seus dados estão protegidos com criptografia de ponta
          </p>
        </Card>
        <Card className="p-6">
          <div className="rounded-full bg-primary/10 p-3 w-fit mb-4">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">Sincronização Automática</h3>
          <p className="text-sm text-muted-foreground">
            Transações atualizadas automaticamente em tempo real, sem precisar inserir manualmente
          </p>
        </Card>
        <Card className="p-6">
          <div className="rounded-full bg-primary/10 p-3 w-fit mb-4">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">{availableBanks.length}+ Bancos</h3>
          <p className="text-sm text-muted-foreground">
            Conecte todas as suas contas em um único lugar para visão completa das suas finanças
          </p>
        </Card>
      </div>

      {/* Connected Accounts */}
      {connections.length > 0 && (
        <div className="mb-8 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Contas Conectadas ({connections.length})</h2>
          </div>
          <ConnectionsGrid connections={connections} statsMap={statsMap} syncAuditMap={syncAuditMap} />
        </div>
      )}

      {/* Available Banks - Digital Banks */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Bancos Digitais</h2>
            <p className="text-sm text-muted-foreground">
              Bancos 100% digitais e contas sem tarifas
            </p>
          </div>
        </div>
        
        <Card className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {digitalBanks.map((bank) => (
              <Link
                key={bank.code}
                href={`/open-finance/connect?bank=${bank.code}`}
                className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-all text-center group"
              >
                {renderLogo(bank, 64, 'rounded-lg group-hover:scale-110 transition-transform')}
                <div className="flex-1">
                  <p className="font-medium text-sm">{bank.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                    <Link2 className="h-3 w-3" />
                    Conectar
                  </p>
                  {expiredBanks.has(bank.name) && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive text-[11px] px-2 py-0.5">
                      Reautorizar
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Traditional Banks */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Bancos Tradicionais</h2>
            <p className="text-sm text-muted-foreground">
              Grandes bancos com agências físicas
            </p>
          </div>
        </div>
        
        <Card className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {traditionalBanks.map((bank) => (
              <Link
                key={bank.code}
                href={`/open-finance/connect?bank=${bank.code}`}
                className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-all text-center group"
              >
                {renderLogo(bank, 64, 'rounded-lg group-hover:scale-110 transition-transform')}
                <div className="flex-1">
                  <p className="font-medium text-sm">{bank.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                    <Link2 className="h-3 w-3" />
                    Conectar
                  </p>
                  {expiredBanks.has(bank.name) && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive text-[11px] px-2 py-0.5">
                      Reautorizar
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Fintechs */}
      {fintechs.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Fintechs e Carteiras</h2>
              <p className="text-sm text-muted-foreground">
                Carteiras digitais e soluções de pagamento
              </p>
            </div>
          </div>
          
          <Card className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {fintechs.map((bank) => (
                <Link
                  key={bank.code}
                  href={`/open-finance/connect?bank=${bank.code}`}
                  className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-all text-center group"
                >
                  {renderLogo(bank, 64, 'rounded-lg group-hover:scale-110 transition-transform')}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{bank.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                      <Link2 className="h-3 w-3" />
                      Conectar
                    </p>
                    {expiredBanks.has(bank.name) && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive text-[11px] px-2 py-0.5">
                        Reautorizar
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* How it Works */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Como Funciona o Open Finance</h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="rounded-full bg-primary/10 p-2 h-fit">
              <span className="text-sm font-bold text-primary">1</span>
            </div>
            <div>
              <p className="font-medium">Escolha seu banco</p>
              <p className="text-sm text-muted-foreground">
                Selecione a instituição financeira que deseja conectar da lista de bancos participantes
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="rounded-full bg-primary/10 p-2 h-fit">
              <span className="text-sm font-bold text-primary">2</span>
            </div>
            <div>
              <p className="font-medium">Autorize com segurança</p>
              <p className="text-sm text-muted-foreground">
                Você será redirecionado para o ambiente seguro do seu banco para fazer login e autorizar o compartilhamento de dados
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="rounded-full bg-primary/10 p-2 h-fit">
              <span className="text-sm font-bold text-primary">3</span>
            </div>
            <div>
              <p className="font-medium">Sincronização automática</p>
              <p className="text-sm text-muted-foreground">
                Suas transações, saldo e extrato serão importados e atualizados automaticamente de forma segura
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm">
            <strong>Sobre o Open Finance:</strong> É um sistema regulamentado pelo Banco Central do Brasil que permite 
            o compartilhamento seguro de dados financeiros entre instituições autorizadas, com total controle e 
            consentimento do usuário. Todos os dados são criptografados e o acesso pode ser revogado a qualquer momento.
          </p>
        </div>
      </Card>
    </div>
  );
}
