import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-simple';
import { sql } from '@/lib/db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// GET /api/user/export - Export all user data
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const period = searchParams.get('period') || 'month';
    const accountId = searchParams.get('account_id');
    const category = searchParams.get('category');

    const now = new Date();
    let rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === '90d') {
      rangeStart = new Date(now);
      rangeStart.setDate(rangeStart.getDate() - 90);
    } else if (period === 'year') {
      rangeStart = new Date(now.getFullYear(), 0, 1);
    }

    // Fetch all user data with enhanced queries
    const [accounts, transactions, categories, budgets, goals, settings] = await Promise.all([
      sql`
        SELECT id, name, account_type, balance, currency, bank_name, color, 
               is_active, created_at, updated_at
        FROM accounts 
        WHERE user_id = ${user.id} 
        ORDER BY created_at DESC
      `,
      sql`
        SELECT 
          t.id, t.description, t.amount, t.type, t.transaction_date,
          t.notes, t.is_recurring, t.tags, t.created_at,
          c.name as category_name, c.icon as category_icon,
          a.name as account_name, a.account_type
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.user_id = ${user.id}
          AND t.transaction_date >= ${rangeStart}
          AND (${accountId || null} IS NULL OR t.account_id = ${accountId || null})
          AND (${category || null} IS NULL OR t.category_id = ${category || null})
        ORDER BY t.transaction_date DESC
      `,
      sql`
        SELECT id, name, type, icon, color, created_at
        FROM categories 
        WHERE user_id = ${user.id}
        ORDER BY name
      `,
      sql`
        SELECT 
          b.id, b.name, b.amount, b.period, b.start_date, b.end_date,
          b.created_at, b.updated_at,
          c.name as category_name, c.icon as category_icon
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.user_id = ${user.id} 
        ORDER BY b.created_at DESC
      `,
      sql`
        SELECT id, name, target_amount, current_amount, target_date, 
               is_completed, created_at, updated_at
        FROM goals 
        WHERE user_id = ${user.id} 
        ORDER BY created_at DESC
      `,
      sql`
        SELECT email_notifications, push_notifications, budget_alerts,
               transaction_alerts, theme, language, currency, date_format,
               week_start, session_timeout
        FROM user_settings 
        WHERE user_id = ${user.id}
      `
    ]);

    // Calculate statistics
    const totalBalance = accounts.reduce((sum: number, acc: any) => 
      sum + Number(acc.balance || 0), 0
    );
    
    const totalIncome = transactions
      .filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    
    const totalExpenses = transactions
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

    const exportData = {
      exported_at: new Date().toISOString(),
      version: '1.0',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      summary: {
        total_accounts: accounts.length,
        total_transactions: transactions.length,
        total_categories: categories.length,
        total_budgets: budgets.length,
        total_goals: goals.length,
        total_balance: totalBalance,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_balance: totalIncome - totalExpenses,
      },
      settings: settings[0] || null,
      data: {
        accounts: accounts.map((acc: any) => ({
          ...acc,
          balance: Number(acc.balance)
        })),
        transactions: transactions.map((t: any) => ({
          ...t,
          amount: Number(t.amount)
        })),
        categories,
        budgets: budgets.map((b: any) => ({
          ...b,
          amount: Number(b.amount)
        })),
        goals: goals.map((g: any) => ({
          ...g,
          target_amount: Number(g.target_amount),
          current_amount: Number(g.current_amount)
        })),
        weekly: await sql`
          SELECT
            to_char(date_trunc('week', transaction_date)::date, 'YYYY-MM-DD') as week,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
          FROM transactions
          WHERE user_id = ${user.id}
            AND transaction_date >= ${rangeStart}
            AND (${accountId || null} IS NULL OR account_id = ${accountId || null})
            AND (${category || null} IS NULL OR category_id = ${category || null})
          GROUP BY 1
          ORDER BY week DESC
          LIMIT 12
        `,
      },
    };

    if (format === 'csv') {
      // Generate comprehensive CSV with multiple sheets worth of data
      const csvSections = [];

      // Transactions section
      csvSections.push('TRANSAÇÕES');
      csvSections.push([
        'Data',
        'Descrição',
        'Valor',
        'Tipo',
        'Categoria',
        'Conta',
        'Observações',
        'Tags'
      ].join(','));
      
      transactions.forEach((t: any) => {
        csvSections.push([
          t.transaction_date,
          `"${String(t.description || '').replace(/"/g, '""')}"`,
          Number(t.amount).toFixed(2),
          t.type,
          t.category_name || '',
          t.account_name || '',
          `"${String(t.notes || '').replace(/"/g, '""')}"`,
          `"${String(t.tags || '').replace(/"/g, '""')}"`
        ].join(','));
      });

      csvSections.push('');
      csvSections.push('CONTAS');
      csvSections.push([
        'Nome',
        'Tipo',
        'Saldo',
        'Moeda',
        'Banco'
      ].join(','));
      
      accounts.forEach((acc: any) => {
        csvSections.push([
          `"${acc.name}"`,
          acc.account_type,
          Number(acc.balance).toFixed(2),
          acc.currency,
          acc.bank_name || ''
        ].join(','));
      });

      csvSections.push('');
      csvSections.push('ORÇAMENTOS');
      csvSections.push([
        'Nome',
        'Categoria',
        'Valor',
        'Período',
        'Início',
        'Fim'
      ].join(','));
      
      budgets.forEach((b: any) => {
        csvSections.push([
          `"${b.name}"`,
          b.category_name || '',
          Number(b.amount).toFixed(2),
          b.period,
          b.start_date,
          b.end_date || ''
        ].join(','));
      });

      csvSections.push('');
      csvSections.push('METAS');
      csvSections.push([
        'Nome',
        'Valor Alvo',
        'Valor Atual',
        'Progresso %',
        'Data Alvo',
        'Status'
      ].join(','));
      
      goals.forEach((g: any) => {
        const progress = (Number(g.current_amount) / Number(g.target_amount)) * 100;
        csvSections.push([
          `"${g.name}"`,
          Number(g.target_amount).toFixed(2),
          Number(g.current_amount).toFixed(2),
          progress.toFixed(1),
          g.target_date || '',
          g.is_completed ? 'Concluída' : 'Em andamento'
        ].join(','));
      });

      const csv = csvSections.join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="financedash-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    if (format === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text('Relatório Financeiro', 14, 16);
      doc.setFontSize(10);
      doc.text(`Usuário: ${user.email}`, 14, 24);
      doc.text(`Período: ${period}`, 14, 30);
      if (accountId) doc.text(`Conta: ${accountId}`, 14, 36);
      if (category) doc.text('Categoria: filtrada', 14, 42);

      doc.text(`Saldo líquido: ${exportData.summary.net_balance}`, 14, 52);
      doc.text(`Receita: ${exportData.summary.total_income} | Despesa: ${exportData.summary.total_expenses}`, 14, 58);

      const expensesByCat = (exportData.data.transactions || [])
        .filter((t: any) => t.type === 'expense')
        .reduce((acc: Record<string, number>, t: any) => {
          const key = (t as any).category_name || 'Sem categoria';
          acc[key] = (acc[key] || 0) + Number(t.amount || 0);
          return acc;
        }, {} as Record<string, number>);

      const topCats = Object.entries(expensesByCat)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, total]) => [name, total.toFixed(2)]);

      if (topCats.length) {
        autoTable(doc, {
          head: [['Categoria', 'Total']],
          body: topCats,
          startY: 66,
        });
      }

      const pdfData = doc.output('arraybuffer');
      return new NextResponse(Buffer.from(pdfData), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="financedash-relatorio-${new Date().toISOString().split('T')[0]}.pdf"`
        }
      });
    }

    // Return JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="financedash-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
