import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-simple';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { sanitizeDescription, sanitizeEmail, sanitizePhone } from '@/lib/sanitization';

export const dynamic = 'force-dynamic';

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(255).transform(sanitizeDescription).optional(),
  phone: z.string().nullable().optional().transform((val) => val ? sanitizePhone(val) : null),
  email: z.string().email().transform(sanitizeEmail).optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDetails = await sql`
      SELECT id, email, name, phone, avatar_url, is_email_verified, created_at, updated_at 
      FROM users WHERE id = ${user.id} LIMIT 1
    `;

    if (userDetails.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM accounts WHERE user_id = ${user.id})::int as accounts_count,
        (SELECT COUNT(*) FROM transactions WHERE user_id = ${user.id})::int as transactions_count,
        (SELECT COUNT(*) FROM budgets WHERE user_id = ${user.id})::int as budgets_count,
        (SELECT COUNT(*) FROM goals WHERE user_id = ${user.id})::int as goals_count
    `;

    return NextResponse.json({
      user: userDetails[0],
      stats: stats[0],
    });
  } catch (error) {
    logger.error('user.profile.fetch_error', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
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
    const validatedData = UpdateProfileSchema.parse(body);

    // Check if email is already taken
    if (validatedData.email) {
      const existing = await sql`
        SELECT id FROM users WHERE email = ${validatedData.email} AND id != ${user.id}
      `;
      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'Email já está em uso' },
          { status: 400 }
        );
      }
    }

    const result = await sql`
      UPDATE users 
      SET 
        name = COALESCE(${validatedData.name || null}, name),
        email = COALESCE(${validatedData.email || null}, email),
        phone = ${validatedData.phone !== undefined ? validatedData.phone : null},
        updated_at = NOW()
      WHERE id = ${user.id} 
      RETURNING id, email, name, phone, avatar_url, is_email_verified, created_at, updated_at
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    logger.info('user.profile.updated', { userId: user.id });
    return NextResponse.json({ user: result[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('user.profile.validation_failed', { errors: error.errors });
      return NextResponse.json(
        { error: 'Validação falhou', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('user.profile.update_error', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar perfil' },
      { status: 500 }
    );
  }
}
