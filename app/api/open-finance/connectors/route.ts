import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-real';
import { listInstitutions } from '@/lib/open-finance';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth();

    const connectors = await listInstitutions();

    // Filter only Brazilian banks and format the response
    const brazilianBanks = connectors
      .filter((connector: any) => connector.country === 'BR' && connector.type === 'PERSONAL_BANK')
      .map((connector: any) => ({
        id: connector.id,
        name: connector.name,
        institutionUrl: connector.institutionUrl,
        imageUrl: connector.imageUrl,
        primaryColor: connector.primaryColor,
        type: connector.type,
        country: connector.country,
        credentials: connector.credentials,
        hasMFA: connector.hasMFA,
        health: connector.health,
      }));

    return NextResponse.json({
      connectors: brazilianBanks,
      total: brazilianBanks.length,
    });
  } catch (error: any) {
    console.error('[v0] Error fetching connectors:', error);
    
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
      { error: 'Erro ao buscar conectores' },
      { status: 500 }
    );
  }
}
