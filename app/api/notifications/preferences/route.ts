import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserId } from '@/lib/auth-simple';

export const dynamic = 'force-dynamic';

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    budgetAlerts: boolean;
    goalAchievements: boolean;
    largeTransactions: boolean;
    monthlyReports: boolean;
    weeklyDigest: boolean;
    openFinanceSync: boolean;
    unusualSpending: boolean;
  };
  push: {
    enabled: boolean;
    budgetAlerts: boolean;
    goalAchievements: boolean;
    largeTransactions: boolean;
    openFinanceSync: boolean;
  };
  whatsapp: {
    enabled: boolean;
    phoneNumber?: string;
    budgetAlerts: boolean;
    goalAchievements: boolean;
    largeTransactions: boolean;
    monthlyReports: boolean;
  };
  inApp: {
    enabled: boolean;
    budgetAlerts: boolean;
    goalAchievements: boolean;
    largeTransactions: boolean;
    openFinanceSync: boolean;
    categorySuggestions: boolean;
  };
  thresholds: {
    largeTransactionAmount: number;
    budgetWarningPercentage: number;
    lowBalanceAmount: number;
  };
}

const defaultPreferences: NotificationPreferences = {
  email: {
    enabled: true,
    budgetAlerts: true,
    goalAchievements: true,
    largeTransactions: true,
    monthlyReports: true,
    weeklyDigest: false,
    openFinanceSync: true,
    unusualSpending: true,
  },
  push: {
    enabled: false,
    budgetAlerts: true,
    goalAchievements: true,
    largeTransactions: true,
    openFinanceSync: true,
  },
  whatsapp: {
    enabled: false,
    budgetAlerts: false,
    goalAchievements: true,
    largeTransactions: false,
    monthlyReports: false,
  },
  inApp: {
    enabled: true,
    budgetAlerts: true,
    goalAchievements: true,
    largeTransactions: true,
    openFinanceSync: true,
    categorySuggestions: true,
  },
  thresholds: {
    largeTransactionAmount: 500,
    budgetWarningPercentage: 80,
    lowBalanceAmount: 100,
  },
};

// Get user's notification preferences
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await sql`SELECT * FROM notification_preferences WHERE user_id = ${userId}`;

    if (result.length === 0) {
      // Return default preferences
      return NextResponse.json({
        preferences: defaultPreferences,
        isDefault: true,
      });
    }

    return NextResponse.json({
      preferences: result[0].preferences,
      isDefault: false,
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to get notification preferences' },
      { status: 500 }
    );
  }
}

// Update user's notification preferences
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences: NotificationPreferences = await request.json();

    // Validate WhatsApp phone number if enabled
    if (preferences.whatsapp.enabled && preferences.whatsapp.phoneNumber) {
      const cleaned = preferences.whatsapp.phoneNumber.replace(/\D/g, '');
      if (cleaned.length < 10 || cleaned.length > 15) {
        return NextResponse.json(
          { error: 'Invalid WhatsApp phone number' },
          { status: 400 }
        );
      }
    }

    // Upsert preferences
    const result = await sql`INSERT INTO notification_preferences (user_id, preferences, updated_at)
       VALUES (${userId}, ${JSON.stringify(preferences)}, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET preferences = ${JSON.stringify(preferences)}, updated_at = NOW()
       RETURNING *`;

    return NextResponse.json({
      success: true,
      preferences: result[0].preferences,
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}

// Reset to default preferences
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await sql`DELETE FROM notification_preferences WHERE user_id = ${userId}`;

    return NextResponse.json({
      success: true,
      preferences: defaultPreferences,
      message: 'Preferences reset to default',
    });
  } catch (error) {
    console.error('Reset notification preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to reset notification preferences' },
      { status: 500 }
    );
  }
}

// Test notification with current preferences
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channel } = await request.json();

    if (!['email', 'push', 'whatsapp', 'inApp'].includes(channel)) {
      return NextResponse.json(
        { error: 'Invalid channel' },
        { status: 400 }
      );
    }

    // Get user preferences
    const prefsResult = await sql`SELECT preferences FROM notification_preferences WHERE user_id = ${userId}`;

    const prefs: NotificationPreferences = prefsResult[0]?.preferences || defaultPreferences;

    // Check if channel is enabled
    const channelPrefs = prefs[channel as keyof NotificationPreferences];
    if (typeof channelPrefs === 'object' && 'enabled' in channelPrefs && !channelPrefs.enabled) {
      return NextResponse.json(
        { error: `${channel} notifications are disabled` },
        { status: 400 }
      );
    }

    // Send test notification based on channel
    let sent = false;

    if (channel === 'email') {
      const { sendEmail, EmailTemplates } = await import('@/lib/email');
      const userResult = await sql`SELECT email, name FROM users WHERE id = ${userId}`;
      const user = userResult[0];
      
      const template = EmailTemplates.goalAchieved(user.name, 'Meta de Teste', 1000);
      await sendEmail({
        to: user.email,
        ...template,
      });
      sent = true;
    } else if (channel === 'push') {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/test`, {
        method: 'POST',
      });
      sent = response.ok;
    } else if (channel === 'whatsapp') {
      const { sendWhatsAppMessage, WhatsAppTemplates } = await import('@/lib/whatsapp');
      if (prefs.whatsapp.phoneNumber) {
        sent = await sendWhatsAppMessage({
          to: prefs.whatsapp.phoneNumber,
          message: WhatsAppTemplates.goalAchieved('Meta de Teste'),
        });
      }
    } else if (channel === 'inApp') {
      const { createNotification } = await import('@/lib/notifications');
      await createNotification({
        userId,
        type: 'info',
        title: 'Notificação de Teste',
        message: 'Esta é uma notificação de teste do sistema!',
      });
      sent = true;
    }

    return NextResponse.json({
      success: sent,
      message: sent ? 'Test notification sent' : 'Failed to send test notification',
    });
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
}
