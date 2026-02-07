import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth-simple';
import { sql } from '@/lib/db';

// This is a DEBUG endpoint - remove in production!
export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    console.log('[v0] Debug - Creating user:', email);

    // Check if user exists
    const existing = await sql`
      SELECT id, email FROM users WHERE email = ${email.toLowerCase().trim()}
    `;

    if (existing.length > 0) {
      console.log('[v0] Debug - User already exists:', existing[0]);

      if (password) {
        // Refresh password hash so local login works even if the seed used a placeholder.
        const passwordHash = await (await import('bcryptjs')).hash(password, 12);
        await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${existing[0].id}`;
        console.log('[v0] Debug - Password reset for existing user');
      }

      return NextResponse.json({
        exists: true,
        user: existing[0],
        message: 'User already exists (password refreshed if provided)',
      });
    }

    // Create user
    const { user } = await registerUser(email, password, name);

    // Create default categories
    await sql`
      INSERT INTO categories (user_id, name, type, color, icon)
      VALUES 
        (${user.id}, 'Alimentação', 'expense', '#ef4444', '🍔'),
        (${user.id}, 'Transporte', 'expense', '#f59e0b', '🚗'),
        (${user.id}, 'Moradia', 'expense', '#3b82f6', '🏠'),
        (${user.id}, 'Salário', 'income', '#10b981', '💰')
    `;

    console.log('[v0] Debug - User created successfully:', user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      message: 'User created successfully. You can now login.',
    });
  } catch (error: any) {
    console.error('[v0] Debug - Error creating user:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
