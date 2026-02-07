import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-simple';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const PasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = PasswordSchema.parse(body);

    // Get current password hash
    const userResult = await sql`
      SELECT password_hash FROM users WHERE id = ${user.id}
    `;

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentHash = userResult[0].password_hash;

    // Verify current password
    const isValid = await bcrypt.compare(validatedData.currentPassword, currentHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Hash new password
    const newHash = await bcrypt.hash(validatedData.newPassword, 10);

    // Update password
    await sql`
      UPDATE users 
      SET password_hash = ${newHash}, updated_at = NOW()
      WHERE id = ${user.id}
    `;

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[v0] Error updating password:', error);
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 }
    );
  }
}
