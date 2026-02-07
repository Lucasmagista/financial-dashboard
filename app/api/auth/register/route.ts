import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth-simple';
import { RegisterSchema } from '@/lib/schemas';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { logger, logAuthEvent } from '@/lib/logger';
import { sanitizeEmail, sanitizeHtml, sanitizeDescription } from '@/lib/sanitization';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  
  try {
    const body = await request.json();
    
    // Sanitize inputs
    const sanitizedData = {
      email: sanitizeEmail(body.email),
      name: sanitizeHtml(body.name).slice(0, 120),
      password: typeof body.password === 'string' ? body.password : '',
    };
    
    // Validate
    const validatedData = RegisterSchema.parse(sanitizedData);

    // Register user (this also creates session)
    const { user } = await registerUser(
      validatedData.email,
      validatedData.password,
      validatedData.name
    );

    // Create default categories for the user
    await sql`
      INSERT INTO categories (user_id, name, type, color, icon)
      VALUES 
        (${user.id}, 'Alimentação', 'expense', '#ef4444', 'food'),
        (${user.id}, 'Transporte', 'expense', '#f59e0b', 'car'),
        (${user.id}, 'Moradia', 'expense', '#3b82f6', 'home'),
        (${user.id}, 'Lazer', 'expense', '#8b5cf6', 'gamepad'),
        (${user.id}, 'Saúde', 'expense', '#10b981', 'heart'),
        (${user.id}, 'Educação', 'expense', '#06b6d4', 'book'),
        (${user.id}, 'Compras', 'expense', '#ec4899', 'bag'),
        (${user.id}, 'Outros', 'expense', '#6b7280', 'tag'),
        (${user.id}, 'Salário', 'income', '#10b981', 'piggy'),
        (${user.id}, 'Freelance', 'income', '#06b6d4', 'briefcase'),
        (${user.id}, 'Investimentos', 'income', '#8b5cf6', 'trending'),
        (${user.id}, 'Outros', 'income', '#6b7280', 'tag')
    `;

    // Log successful registration
    logAuthEvent('register', user.id, ip, {
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      logger.warn('Registration validation failed', { errors: error.errors });
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    if (error.message === 'User already exists') {
      logger.info('Registration attempt with existing email', { ip });
      return NextResponse.json(
        { error: 'Este email já está cadastrado' },
        { status: 409 }
      );
    }

    logger.error('Registration error', error, { ip });
    return NextResponse.json(
      { error: 'Erro ao criar conta. Tente novamente.' },
      { status: 500 }
    );
  }
}
