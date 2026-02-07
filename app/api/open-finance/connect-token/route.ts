import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-real';
import { createConnectToken } from '@/lib/open-finance';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth();

    // Create Pluggy connect token
    const token = await createConnectToken(user.id);

    return NextResponse.json(token);
  } catch (error: any) {
    logger.error('Error creating connect token', error);
    
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (error.message?.includes('credentials not configured')) {
      return NextResponse.json(
        { error: 'Open Finance não configurado. Configure as credenciais PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao criar token de conexão' },
      { status: 500 }
    );
  }
}
