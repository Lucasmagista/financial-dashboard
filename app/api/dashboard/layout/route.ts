import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserId } from '@/lib/auth-simple';

export const dynamic = 'force-dynamic';

export interface DashboardWidget {
  id: string;
  type: 'balance' | 'income-expense' | 'category-breakdown' | 'recent-transactions' | 'goals' | 'budgets' | 'alerts' | 'predictions';
  position: { x: number; y: number; w: number; h: number };
  settings?: Record<string, any>;
}

// Get user's dashboard layout
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await sql`SELECT * FROM dashboard_layouts WHERE user_id = ${userId}`;

    if (result.length === 0) {
      // Return default layout
      const defaultWidgets: DashboardWidget[] = [
        { id: '1', type: 'balance', position: { x: 0, y: 0, w: 4, h: 2 } },
        { id: '2', type: 'income-expense', position: { x: 4, y: 0, w: 8, h: 4 } },
        { id: '3', type: 'category-breakdown', position: { x: 0, y: 2, w: 4, h: 4 } },
        { id: '4', type: 'recent-transactions', position: { x: 0, y: 6, w: 12, h: 4 } },
      ];

      return NextResponse.json({
        widgets: defaultWidgets,
        isDefault: true,
      });
    }

    return NextResponse.json({
      widgets: result[0].widgets,
      isDefault: false,
    });
  } catch (error) {
    console.error('Get dashboard layout error:', error);
    return NextResponse.json(
      { error: 'Failed to get dashboard layout' },
      { status: 500 }
    );
  }
}

// Save user's dashboard layout
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { widgets }: { widgets: DashboardWidget[] } = await request.json();

    if (!widgets || !Array.isArray(widgets)) {
      return NextResponse.json(
        { error: 'Invalid widgets data' },
        { status: 400 }
      );
    }

    // Upsert dashboard layout
    const result = await sql`INSERT INTO dashboard_layouts (user_id, widgets, updated_at)
       VALUES (${userId}, ${JSON.stringify(widgets)}, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET widgets = ${JSON.stringify(widgets)}, updated_at = NOW()
       RETURNING *`;

    return NextResponse.json({
      success: true,
      layout: result[0],
    });
  } catch (error) {
    console.error('Save dashboard layout error:', error);
    return NextResponse.json(
      { error: 'Failed to save dashboard layout' },
      { status: 500 }
    );
  }
}

// Reset to default layout
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await sql`DELETE FROM dashboard_layouts WHERE user_id = ${userId}`;

    return NextResponse.json({
      success: true,
      message: 'Dashboard reset to default',
    });
  } catch (error) {
    console.error('Reset dashboard layout error:', error);
    return NextResponse.json(
      { error: 'Failed to reset dashboard layout' },
      { status: 500 }
    );
  }
}
