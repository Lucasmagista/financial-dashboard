import { NextRequest, NextResponse } from 'next/server';
import { createAccount, updateAccountBalance, getAccountsByUserId } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-simple';
import { sanitizeAmount, sanitizeCategoryName, sanitizeDescription } from '@/lib/sanitization';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await getAccountsByUserId(user.id);

    return NextResponse.json({ accounts });
  } catch (error) {
    logger.error('Error fetching accounts', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, balance, currency, bankName } = body;

    const sanitizedName = sanitizeCategoryName(name);
    const sanitizedBankName = bankName ? sanitizeDescription(bankName) : '';
    const sanitizedBalance = sanitizeAmount(balance);

    if (!sanitizedName || !type || balance === undefined || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const account = await createAccount(
      user.id,
      sanitizedName,
      type,
      sanitizedBalance,
      currency,
      sanitizedBankName
    );

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    logger.error('Error creating account', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, balance } = body;

    if (!accountId || balance === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const account = await updateAccountBalance(accountId, sanitizeAmount(balance));

    return NextResponse.json(account);
  } catch (error) {
    logger.error('Error updating account', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}
