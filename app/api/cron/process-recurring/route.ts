import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[v0] Processing recurring transactions...');
    
    // Get templates that need processing
    const templates = await sql`
      SELECT * FROM recurring_transaction_templates
      WHERE is_active = true
        AND next_run_date <= CURRENT_DATE
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    `;

    console.log(`[v0] Found ${templates.length} templates to process`);

    let processed = 0;
    
    for (const template of templates) {
      try {
        // Create transaction
        await sql`
          INSERT INTO transactions (
            user_id, account_id, category_id, amount, type,
            description, transaction_date, is_recurring,
            parent_transaction_id, tags, notes
          )
          VALUES (
            ${template.user_id},
            ${template.account_id},
            ${template.category_id},
            ${template.amount},
            ${template.type},
            ${template.description},
            ${template.next_run_date},
            true,
            ${template.id},
            ${template.tags},
            ${template.notes}
          )
        `;

        // Calculate next run date
        const nextDate = new Date(template.next_run_date);
        switch (template.frequency) {
          case 'daily':
            nextDate.setDate(nextDate.getDate() + template.interval);
            break;
          case 'weekly':
            nextDate.setDate(nextDate.getDate() + (7 * template.interval));
            break;
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + template.interval);
            break;
          case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + template.interval);
            break;
        }

        // Update template
        await sql`
          UPDATE recurring_transaction_templates
          SET next_run_date = ${nextDate.toISOString().split('T')[0]},
              updated_at = NOW()
          WHERE id = ${template.id}
        `;

        processed++;
      } catch (err) {
        console.error(`[v0] Error processing template ${template.id}:`, err);
      }
    }

    console.log(`[v0] Successfully processed ${processed} recurring transactions`);

    return NextResponse.json({
      success: true,
      processed,
      total: templates.length,
    });
  } catch (error: any) {
    console.error('[v0] Error in recurring cron:', error);
    return NextResponse.json(
      { error: 'Failed to process recurring transactions' },
      { status: 500 }
    );
  }
}
