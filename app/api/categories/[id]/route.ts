import { NextRequest, NextResponse } from 'next/server';
import { updateCategory, deleteCategory, sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-simple';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateCategorySchema = z.object({
  name: z.string().optional(),
  type: z.enum(['income', 'expense']).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: categoryId } = await params;

    // Verify ownership
    const existing = await sql`
      SELECT * FROM categories WHERE id = ${categoryId} AND user_id = ${user.id}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = UpdateCategorySchema.parse(body);

    const updateData: any = {};
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.type) updateData.type = validatedData.type;
    if (validatedData.color) updateData.color = validatedData.color;
    if (validatedData.icon) updateData.icon = validatedData.icon;

    const category = await updateCategory(categoryId, updateData);

    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[v0] Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: categoryId } = await params;
    console.log('[v0] DELETE category - categoryId:', categoryId, 'userId:', user.id);

    // Verify ownership
    const existing = await sql`
      SELECT * FROM categories WHERE id = ${categoryId} AND user_id = ${user.id}
    `;
    console.log('[v0] DELETE category - existing:', existing.length);
    
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check if category has associated transactions
    const transactions = await sql`
      SELECT COUNT(*) as count FROM transactions 
      WHERE category_id = ${categoryId}
    `;
    const transactionCount = transactions[0]?.count || 0;
    console.log('[v0] DELETE category - transactions count:', transactionCount);

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with existing transactions. Please reassign transactions first.' },
        { status: 400 }
      );
    }

    await deleteCategory(categoryId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
