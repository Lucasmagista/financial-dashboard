import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserId } from '@/lib/auth-simple';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const dynamic = 'force-dynamic';

interface ExportParams {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  accountId?: string;
  type?: 'income' | 'expense';
  format: 'pdf' | 'csv' | 'excel';
}

// Extend jsPDF type for autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF;
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ExportParams = await request.json();
    const { startDate, endDate, categoryId, accountId, type, format } = body;

    // Get transactions with dynamic filters using sql tagged template
    const result = await sql`
      SELECT 
        t.id,
        t.description,
        t.amount,
        t.type,
        t.transaction_date as date,
        c.name as category_name,
        a.name as account_name,
        t.notes,
        t.tags
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.user_id = ${userId}
        ${startDate ? sql`AND t.transaction_date >= ${startDate}` : sql``}
        ${endDate ? sql`AND t.transaction_date <= ${endDate}` : sql``}
        ${categoryId ? sql`AND t.category_id = ${categoryId}` : sql``}
        ${accountId ? sql`AND t.account_id = ${accountId}` : sql``}
        ${type ? sql`AND t.type = ${type}` : sql``}
      ORDER BY t.transaction_date DESC
    `;

    const transactions = result;

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found' },
        { status: 404 }
      );
    }

    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const balance = totalIncome - totalExpense;

    // Generate file based on format
    if (format === 'pdf') {
      const pdf = new jsPDF();
      
      // Title
      pdf.setFontSize(18);
      pdf.text('Relatório de Transações', 14, 20);
      
      // Date range
      pdf.setFontSize(10);
      const dateRange = `Período: ${startDate || 'Início'} até ${endDate || 'Hoje'}`;
      pdf.text(dateRange, 14, 28);
      
      // Summary
      pdf.text(`Total de Receitas: R$ ${totalIncome.toFixed(2)}`, 14, 36);
      pdf.text(`Total de Despesas: R$ ${totalExpense.toFixed(2)}`, 14, 42);
      pdf.text(`Saldo: R$ ${balance.toFixed(2)}`, 14, 48);
      
      // Table
      const tableData = transactions.map(t => [
        new Date(t.date).toLocaleDateString('pt-BR'),
        t.description,
        t.category_name || 'Sem categoria',
        t.account_name || 'Sem conta',
        t.type === 'income' ? 'Receita' : 'Despesa',
        `R$ ${parseFloat(t.amount).toFixed(2)}`,
      ]);
      
      pdf.autoTable({
        startY: 55,
        head: [['Data', 'Descrição', 'Categoria', 'Conta', 'Tipo', 'Valor']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });
      
      const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
      
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="transacoes_${Date.now()}.pdf"`,
        },
      });
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Data', 'Descrição', 'Categoria', 'Conta', 'Tipo', 'Valor', 'Observações', 'Tags'];
      const rows = transactions.map(t => [
        new Date(t.date).toLocaleDateString('pt-BR'),
        t.description,
        t.category_name || '',
        t.account_name || '',
        t.type === 'income' ? 'Receita' : 'Despesa',
        parseFloat(t.amount).toFixed(2),
        t.notes || '',
        (t.tags || []).join(';'),
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
        '',
        `Total de Receitas,,,,,${totalIncome.toFixed(2)}`,
        `Total de Despesas,,,,,${totalExpense.toFixed(2)}`,
        `Saldo,,,,,${balance.toFixed(2)}`,
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="transacoes_${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid format. Use pdf or csv' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export transactions' },
      { status: 500 }
    );
  }
}
