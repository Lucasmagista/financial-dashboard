import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-simple';
import { sql } from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const SettingsSchema = z.object({
  email_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
  budget_alerts: z.boolean().optional(),
  transaction_alerts: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.enum(['pt-br', 'en']).optional(),
  currency: z.enum(['BRL', 'USD', 'EUR']).optional(),
  date_format: z.enum(['dd/mm/yyyy', 'mm/dd/yyyy']).optional(),
  week_start: z.enum(['sunday', 'monday']).optional(),
  session_timeout: z.string().max(10).optional(),
});

// GET /api/user/settings - Get user settings
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.debug('user.settings.fetch', { userId: user.id });

    // Try to get existing settings
    const result = await sql`
      SELECT 
        email_notifications,
        push_notifications,
        budget_alerts,
        transaction_alerts,
        theme,
        language,
        currency,
        date_format,
        week_start,
        session_timeout
      FROM user_settings 
      WHERE user_id = ${user.id}
    `;

    if (result.length === 0) {
      // Return default settings if none exist
      return NextResponse.json({
        settings: {
          email_notifications: true,
          push_notifications: false,
          budget_alerts: true,
          transaction_alerts: true,
          theme: 'system',
          language: 'pt-br',
          currency: 'BRL',
          date_format: 'dd/mm/yyyy',
          week_start: 'sunday',
          session_timeout: '30',
        }
      });
    }

    return NextResponse.json({ settings: result[0] });
  } catch (error) {
    logger.error('user.settings.fetch_error', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// PATCH /api/user/settings - Update user settings
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      email_notifications,
      push_notifications,
      budget_alerts,
      transaction_alerts,
      theme,
      language,
      currency,
      date_format,
      week_start,
      session_timeout,
    } = SettingsSchema.parse(body);

    // Check if settings exist
    const existing = await sql`
      SELECT id FROM user_settings WHERE user_id = ${user.id}
    `;

    let result;
    if (existing.length === 0) {
      // Insert new settings
      result = await sql`
        INSERT INTO user_settings (
          user_id,
          email_notifications,
          push_notifications,
          budget_alerts,
          transaction_alerts,
          theme,
          language,
          currency,
          date_format,
          week_start,
          session_timeout,
          updated_at
        ) VALUES (
          ${user.id},
          ${email_notifications ?? true},
          ${push_notifications ?? false},
          ${budget_alerts ?? true},
          ${transaction_alerts ?? true},
          ${theme ?? 'system'},
          ${language ?? 'pt-br'},
          ${currency ?? 'BRL'},
          ${date_format ?? 'dd/mm/yyyy'},
          ${week_start ?? 'sunday'},
          ${session_timeout ?? '30'},
          NOW()
        )
        RETURNING *
      `;
    } else {
      // Update existing settings
      result = await sql`
        UPDATE user_settings
        SET
          email_notifications = COALESCE(${email_notifications}, email_notifications),
          push_notifications = COALESCE(${push_notifications}, push_notifications),
          budget_alerts = COALESCE(${budget_alerts}, budget_alerts),
          transaction_alerts = COALESCE(${transaction_alerts}, transaction_alerts),
          theme = COALESCE(${theme}, theme),
          language = COALESCE(${language}, language),
          currency = COALESCE(${currency}, currency),
          date_format = COALESCE(${date_format}, date_format),
          week_start = COALESCE(${week_start}, week_start),
          session_timeout = COALESCE(${session_timeout}, session_timeout),
          updated_at = NOW()
        WHERE user_id = ${user.id}
        RETURNING *
      `;
    }

    logger.info('user.settings.updated', { userId: user.id });
    return NextResponse.json({ settings: result[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('user.settings.validation_failed', { errors: error.errors });
      return NextResponse.json(
        { error: 'Invalid settings payload', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('user.settings.update_error', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
