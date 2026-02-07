const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { Client } = require('pg');

const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID;
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET;
const PLUGGY_API_URL = 'https://api.pluggy.ai';

function sanitizeDescription(description = '') {
  return description
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .substring(0, 500);
}

function sanitizeNotes(notes = '') {
  return sanitizeDescription(notes).substring(0, 1000);
}

function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((t) => typeof t === 'string')
    .map((t) => t.replace(/[^\w\s\-]/g, '').trim())
    .filter((t) => t.length > 0 && t.length <= 50)
    .slice(0, 20);
}

async function getPluggyAccessToken() {
  const res = await fetch(`${PLUGGY_API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: PLUGGY_CLIENT_ID, clientSecret: PLUGGY_CLIENT_SECRET }),
  });
  if (!res.ok) throw new Error('Failed to authenticate with Pluggy');
  const data = await res.json();
  return data.apiKey;
}

async function getAccounts(apiKey, itemId) {
  const res = await fetch(`${PLUGGY_API_URL}/accounts?itemId=${itemId}`, {
    headers: { 'X-API-KEY': apiKey },
  });
  if (!res.ok) throw new Error('Failed to fetch accounts');
  return (await res.json()).results || [];
}

async function getTransactions(apiKey, accountId, from, to, pageSize = 500, maxPages = 5) {
  const all = [];
  let page = 1;
  while (page <= maxPages) {
    let url = `${PLUGGY_API_URL}/transactions?accountId=${accountId}&page=${page}&pageSize=${pageSize}`;
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;
    const res = await fetch(url, { headers: { 'X-API-KEY': apiKey } });
    if (!res.ok) throw new Error('Failed to fetch transactions');
    const data = await res.json();
    const results = data.results || [];
    all.push(...results);
    if (!results.length || results.length < pageSize) break;
    page += 1;
  }
  return all;
}

function mapAccount(account) {
  let accountType = 'checking';
  let accountBalance = Number(account.balance) || 0;
  if (account.type === 'CREDIT' || account.subtype === 'CREDIT_CARD') {
    accountType = 'credit_card';
    if (account.creditData && account.creditData.availableCreditLimit !== undefined) {
      accountBalance = Number(account.creditData.availableCreditLimit);
    } else if (account.balance !== undefined) {
      accountBalance = -Math.abs(Number(account.balance));
    }
  } else if (account.type === 'BANK') {
    if (account.subtype === 'SAVINGS_ACCOUNT') accountType = 'savings';
    else if (account.subtype === 'CHECKING_ACCOUNT') accountType = 'checking';
    accountBalance = Number(account.balance) || 0;
  } else {
    accountType = 'other';
    accountBalance = Number(account.balance) || 0;
  }
  return { accountType, accountBalance };
}

async function main(days = 7) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const apiKey = await getPluggyAccessToken();
  const { rows: connections } = await client.query(
    'select id, user_id, institution_name, item_id from open_finance_connections where status = $1',
    ['active']
  );

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromStr = fromDate.toISOString().split('T')[0];

  for (const conn of connections) {
    console.log(`Syncing connection ${conn.id} (${conn.institution_name})`);
    const accounts = await getAccounts(apiKey, conn.item_id);

    for (const account of accounts) {
      const { accountType, accountBalance } = mapAccount(account);
      const accountName = account.name || account.marketingName || 'Conta';
      const currencyCode = account.currencyCode || 'BRL';

      const existing = await client.query(
        'select id, account_type from accounts where open_finance_id = $1 and user_id = $2 limit 1',
        [account.id, conn.user_id]
      );

      let accountId;
      if (existing.rows.length) {
        accountId = existing.rows[0].id;
        await client.query(
          'update accounts set balance = $1, name = $2, account_type = $3, last_sync_at = now(), updated_at = now(), currency = $4, bank_name = $5 where id = $6',
          [accountBalance, accountName, accountType, currencyCode, conn.institution_name, accountId]
        );
      } else {
        const insert = await client.query(
          'insert into accounts (user_id, name, account_type, balance, currency, bank_name, open_finance_id, open_finance_provider, is_active) values ($1,$2,$3,$4,$5,$6,$7,$8,true) returning id',
          [conn.user_id, accountName, accountType, accountBalance, currencyCode, conn.institution_name, account.id, 'pluggy']
        );
        accountId = insert.rows[0].id;
      }

      const txs = await getTransactions(apiKey, account.id, fromStr);
      console.log(`Fetched ${txs.length} tx for account ${accountId}`);

      for (const tx of txs) {
        const exists = await client.query('select id from transactions where open_finance_id = $1 limit 1', [tx.id]);
        if (exists.rows.length) continue;

        let txAmount = Math.abs(Number(tx.amount));
        let txType = 'expense';
        const originalAmount = Number(tx.amount);
        if (accountType !== 'credit_card') {
          if (originalAmount > 0) txType = 'income';
          else if (originalAmount < 0) txType = 'expense';
        }

        let description = sanitizeDescription(tx.description || tx.descriptionRaw || 'Transação');
        const tagSet = new Set();
        const metaParts = [];

        if (tx.paymentData) {
          const method = tx.paymentData.paymentMethod?.toUpperCase();
          if (method) {
            tagSet.add(method.toLowerCase());
            metaParts.push(`Método: ${method}`);
          }
          if (method?.includes('PIX')) {
            description = `PIX: ${description}`;
            const payer = tx.paymentData.payer ? sanitizeDescription(tx.paymentData.payer) : undefined;
            const receiver = tx.paymentData.receiver ? sanitizeDescription(tx.paymentData.receiver) : undefined;
            if (payer && txType === 'income') tagSet.add('pix-entrada');
            if (receiver && txType === 'expense') tagSet.add('pix-saida');
          }
          if (tx.paymentData.referenceNumber) {
            metaParts.push(`Ref: ${tx.paymentData.referenceNumber}`);
            tagSet.add('ref');
          }
        }

        if (tx.creditCardMetadata) {
          const meta = tx.creditCardMetadata;
          if (meta.totalInstallments && meta.totalInstallments > 1) {
            description += ` (${meta.instalmentNumber}/${meta.totalInstallments})`;
            metaParts.push(`Parcelas: ${meta.instalmentNumber}/${meta.totalInstallments}`);
            tagSet.add('parcelado');
          }
          if (meta.payeeName) {
            const payeeName = sanitizeDescription(meta.payeeName);
            description = `${payeeName} - ${description}`;
            metaParts.push(`Estabelecimento: ${payeeName}`);
            tagSet.add('cartao');
          }
          if (meta.mcc) {
            metaParts.push(`MCC: ${meta.mcc}`);
            tagSet.add('mcc');
          }
        }

        if (tx.category) {
          metaParts.push(`Categoria banco: ${tx.category}`);
          tagSet.add('categoria-banco');
        }
        if (tx.status) {
          metaParts.push(`Status: ${tx.status}`);
          tagSet.add(`status-${tx.status.toLowerCase()}`);
        }
        if (tx.providerCode) {
          metaParts.push(`Provedor: ${tx.providerCode}`);
        }

        const notes = metaParts.length ? sanitizeNotes(metaParts.join(' | ')) : null;
        const tags = sanitizeTags(Array.from(tagSet));

        await client.query(
          `insert into transactions (
            user_id, account_id, description, amount, transaction_date, type, open_finance_id,
            tags, notes, status, provider_code, payment_method, reference_number, mcc, bank_category
          ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)` ,
          [
            conn.user_id,
            accountId,
            description,
            txAmount,
            tx.date,
            txType,
            tx.id,
            tags.length ? tags : null,
            notes,
            tx.status || null,
            tx.providerCode || null,
            tx.paymentData?.paymentMethod ? sanitizeDescription(tx.paymentData.paymentMethod) : null,
            tx.paymentData?.referenceNumber || null,
            tx.creditCardMetadata?.mcc || null,
            tx.category || null,
          ]
        );
      }
    }
  }

  await client.end();
  console.log('Sync complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
