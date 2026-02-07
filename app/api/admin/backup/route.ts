import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-simple';
import { backupDatabase } from '@/scripts/backup-database';

export async function POST(request: NextRequest) {
  try {
    // Only admins should be able to trigger backups
    const user = await requireAuth();
    
    // TODO: Add admin check
    // if (!user.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }
    
    const result = await backupDatabase();
    
    return NextResponse.json({
      success: true,
      message: 'Backup completed successfully',
      ...result
    });
  } catch (error: any) {
    console.error('[API] Backup error:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}
