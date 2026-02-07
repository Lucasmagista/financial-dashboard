import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-simple';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const DeleteAccountSchema = z.object({
  password: z.string().min(1),
  confirmation: z.literal('DELETE'),
});

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = DeleteAccountSchema.parse(body);

    // Get password hash
    const userResult = await sql`
      SELECT password_hash FROM users WHERE id = ${user.id}
    `;

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify password
    const isValid = await bcrypt.compare(validatedData.password, userResult[0].password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Incorrect password' },
        { status: 400 }
      );
    }

    // Delete user (cascade will delete all related data)
    await sql`DELETE FROM users WHERE id = ${user.id}`;

    // Clear session
    const response = NextResponse.json({ success: true, message: 'Account deleted successfully' });
    response.cookies.delete('session_token');

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[v0] Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
