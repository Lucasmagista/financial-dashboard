"use client";

import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Props {
  period: string;
  accountId?: string;
  category?: string;
}

export function ReportActions({ period, accountId = "", category = "" }: Props) {
  const [loadingPdf, setLoadingPdf] = useState(false);

  const query = new URLSearchParams();
  if (period) query.set("period", period);
  if (accountId) query.set("account_id", accountId);
  if (category) query.set("category", category);

  const handlePdf = async () => {
    setLoadingPdf(true);
    try {
      const res = await fetch(`/api/user/export?format=json&${query.toString()}`);
      if (!res.ok) throw new Error("Falha ao exportar");
      const data = await res.json();
      const doc = new jsPDF();

      doc.setFontSize(14);
      doc.text("Relatório Financeiro", 14, 16);
      doc.setFontSize(10);
      doc.text(`Período: ${period || "mês"}`, 14, 24);
      doc.text(`Contas: ${accountId ? "Filtrado" : "Todas"}`, 14, 30);
      doc.text(`Categorias: ${category ? "Filtrada" : "Todas"}`, 14, 36);

      const summary = data?.summary || {};
      doc.text(`Saldo líquido: ${summary.net_balance ?? 0}`, 14, 44);
      doc.text(`Receita: ${summary.total_income ?? 0} | Despesa: ${summary.total_expenses ?? 0}`, 14, 50);

      const categories = (data?.data?.transactions || [])
        .filter((t: any) => t.type === "expense")
        .reduce((acc: Record<string, number>, t: any) => {
          const key = t.category_name || "Sem categoria";
          acc[key] = (acc[key] || 0) + Number(t.amount || 0);
          return acc;
        }, {} as Record<string, number>);

      const maxCat = Math.max(...(Object.values(categories) as number[]), 1);
      const topCats = (Object.entries(categories) as [string, number][]) 
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, total]) => {
          const bar = '█'.repeat(Math.max(2, Math.round((total / maxCat) * 20))).padEnd(20, ' ');
          return [name, total.toFixed(2), bar];
        });

      if (topCats.length) {
        autoTable(doc, {
          head: [["Categoria", "Total", ""]],
          body: topCats,
          styles: { fontSize: 8 },
          columnStyles: { 2: { font: "courier" } },
          startY: 58,
        });
      }

      const accountsTop = (data?.data?.accounts || [])
        .map((acc: any) => [acc.name || "Conta", Number(acc.balance || 0)] as [string, number])
        .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, bal]: [string, number], _idx: number, arr: [string, number][]) => {
          const max = Math.max(...arr.map(([, v]: [string, number]) => v), 1);
          const bar = '█'.repeat(Math.max(2, Math.round((bal / max) * 20))).padEnd(20, ' ');
          return [String(name), Number(bal).toFixed(2), bar];
        });

      if (accountsTop.length) {
        autoTable(doc, {
          head: [["Contas", "Saldo", ""]],
          body: accountsTop,
          styles: { fontSize: 8 },
          columnStyles: { 2: { font: "courier" } },
          startY: (doc as any).lastAutoTable ? ((doc as any).lastAutoTable.finalY + 8) : 58,
        });
      }

      const recurring = (data?.data?.transactions || [])
        .filter((t: any) => t.type === "expense")
        .reduce((acc: Record<string, { count: number; total: number }>, t: any) => {
          const key = t.description || "Gasto";
          if (!acc[key]) acc[key] = { count: 0, total: 0 };
          acc[key].count += 1;
          acc[key].total += Number(t.amount || 0);
          return acc;
        }, {} as Record<string, { count: number; total: number }>);

      const recurringTop = (Object.entries(recurring) as [string, { count: number; total: number }][])
        .filter(([, v]) => v.count >= 3)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 8)
        .map(([name, v]) => [name, `${v.count}x`, v.total.toFixed(2)]);

      if (recurringTop.length) {
        autoTable(doc, {
          head: [["Recorrência", "Qtd", "Total"]],
          body: recurringTop,
          startY: (doc as any).lastAutoTable ? ((doc as any).lastAutoTable.finalY + 8) : 58,
        });
      }

      const weekly = (data?.data?.weekly || []) as { week: string; income: number; expense: number }[];
      if (weekly.length) {
        const weekRows = weekly.slice(0, 8).map((w) => {
          const net = Number(w.income || 0) - Number(w.expense || 0);
          return [w.week, Number(w.income || 0).toFixed(2), Number(w.expense || 0).toFixed(2), net.toFixed(2)];
        });
        autoTable(doc, {
          head: [["Semana", "Entrada", "Saída", "Líquido"]],
          body: weekRows,
          styles: { fontSize: 8 },
          startY: (doc as any).lastAutoTable ? ((doc as any).lastAutoTable.finalY + 8) : 58,
        });
      }

      doc.save("relatorio.pdf");
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Link href={`/api/user/export?format=csv&${query.toString()}`} target="_blank" rel="noreferrer">
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" /> CSV
        </Button>
      </Link>
      <Link href={`/api/user/export?format=json&${query.toString()}`} target="_blank" rel="noreferrer">
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" /> JSON
        </Button>
      </Link>
      <Button onClick={handlePdf} variant="default" size="sm" className="gap-2" disabled={loadingPdf}>
        <FileText className="h-4 w-4" /> {loadingPdf ? "Gerando..." : "PDF"}
      </Button>
    </div>
  );
}
