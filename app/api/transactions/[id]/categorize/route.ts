import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-simple';
import { categorizeTransactionAPI } from '@/lib/auto-categorize';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: transactionId } = await params;

    const success = await categorizeTransactionAPI(user.id, transactionId);

    if (success) {
      return NextResponse.json({ success: true, message: 'Transaction categorized' });
    } else {
      return NextResponse.json(
        { success: false, message: 'Could not categorize transaction' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[v0] Error categorizing transaction:', error);
    return NextResponse.json(
      { error: 'Failed to categorize transaction' },
      { status: 500 }
    );
  }
}
