import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  Download,
  Share2,
  Loader2,
  HandCoins,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Category, Transaction, Debt } from '../types';
import DynamicIcon from './DynamicIcon';

interface MonthlySummaryProps {
  categories: Category[];
  transactions: Transaction[];
  debts: Debt[];
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const fmtPdf = (n: number) =>
  'Rs.' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmt = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const isoToMonthKey = (iso: string, year: number, month: number) => {
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() === month;
};

export default function MonthlySummary({ categories, transactions, debts }: MonthlySummaryProps) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const isAtPresent =
    selectedYear > now.getFullYear() ||
    (selectedYear === now.getFullYear() && selectedMonth >= now.getMonth());

  const goToPrev = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
    setExpandedCat(null);
  };

  const goToNext = () => {
    if (isAtPresent) return;
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
    setExpandedCat(null);
  };

  // ── Transactions for this month ──────────────────────────────────────────────
  const monthlyTxs = useMemo(() =>
    transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    }),
    [transactions, selectedYear, selectedMonth]
  );

  const totalIncoming = useMemo(() =>
    monthlyTxs.filter(t => t.type === 'incoming').reduce((s, t) => s + t.amount, 0),
    [monthlyTxs]
  );
  const totalOutgoing = useMemo(() =>
    monthlyTxs.filter(t => t.type === 'outgoing').reduce((s, t) => s + t.amount, 0),
    [monthlyTxs]
  );
  const netBalance = totalIncoming - totalOutgoing;

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, {
      category: Category | null;
      incoming: number;
      outgoing: number;
      txList: Transaction[];
    }> = {};
    monthlyTxs.forEach(t => {
      if (!map[t.categoryId]) {
        map[t.categoryId] = {
          category: categories.find(c => c.id === t.categoryId) ?? null,
          incoming: 0, outgoing: 0, txList: [],
        };
      }
      if (t.type === 'incoming') map[t.categoryId].incoming += t.amount;
      else map[t.categoryId].outgoing += t.amount;
      map[t.categoryId].txList.push(t);
    });
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (b.incoming + b.outgoing) - (a.incoming + a.outgoing));
  }, [monthlyTxs, categories]);

  // ── Debts created this month (borrowed / lent) ───────────────────────────────
  const debtsCreatedThisMonth = useMemo(() =>
    debts.filter(d => isoToMonthKey(d.createdAt, selectedYear, selectedMonth)),
    [debts, selectedYear, selectedMonth]
  );

  // ── Debts resolved/returned this month ──────────────────────────────────────
  const debtsResolvedThisMonth = useMemo(() =>
    debts.filter(d => d.resolvedAt && isoToMonthKey(d.resolvedAt, selectedYear, selectedMonth)),
    [debts, selectedYear, selectedMonth]
  );

  // ── Debts still pending as of now (carry-over reminder) ─────────────────────
  const pendingDebts = useMemo(() =>
    debts.filter(d => d.status === 'pending'),
    [debts]
  );

  const hasDebtActivity = debtsCreatedThisMonth.length > 0 || debtsResolvedThisMonth.length > 0;
  const hasAnyData = monthlyTxs.length > 0 || hasDebtActivity;

  // ── PDF generation ───────────────────────────────────────────────────────────
  const buildPdf = async (): Promise<Blob> => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    const reportTitle = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

    // Header band
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Spendly.', margin, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Monthly Financial Report', margin, 19);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(reportTitle, pageW - margin, 12, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageW - margin, 19, { align: 'right' });

    let y = 36;
    doc.setTextColor(30, 30, 30);

    // Summary boxes
    const boxW = (pageW - margin * 2 - 8) / 3;
    const drawBox = (x: number, bY: number, label: string, value: string, sub: string, r: number, g: number, b: number) => {
      doc.setDrawColor(220, 220, 230);
      doc.setFillColor(248, 248, 252);
      doc.roundedRect(x, bY, boxW, 22, 3, 3, 'FD');
      doc.setFillColor(r, g, b);
      doc.roundedRect(x + 3, bY + 4, 4, 14, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 120);
      doc.text(label.toUpperCase(), x + 10, bY + 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(r, g, b);
      doc.text(value, x + 10, bY + 15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(140, 140, 160);
      doc.text(sub, x + 10, bY + 20);
    };

    const inCount = monthlyTxs.filter(t => t.type === 'incoming').length;
    const outCount = monthlyTxs.filter(t => t.type === 'outgoing').length;
    drawBox(margin,                y, 'Total Incoming', fmtPdf(totalIncoming), `${inCount} payment${inCount !== 1 ? 's' : ''} received`, 16, 185, 129);
    drawBox(margin + boxW + 4,     y, 'Total Outgoing', fmtPdf(totalOutgoing), `${outCount} payment${outCount !== 1 ? 's' : ''} made`,     244, 63, 94);
    drawBox(margin + (boxW + 4)*2, y, 'Net Balance',    (netBalance >= 0 ? '+' : '') + fmtPdf(netBalance), `${monthlyTxs.length} total transactions`, netBalance >= 0 ? 99 : 245, netBalance >= 0 ? 102 : 158, netBalance >= 0 ? 241 : 11);
    y += 30;

    // Category summary table
    if (categoryBreakdown.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text('Category Summary', margin, y);
      y += 4;

      const catRows = categoryBreakdown.map(({ category, incoming, outgoing, txList }) => [
        category?.name || 'Uncategorized',
        (category?.type || '—').toUpperCase(),
        incoming > 0 ? fmtPdf(incoming) : '—',
        outgoing > 0 ? fmtPdf(outgoing) : '—',
        fmtPdf(incoming - outgoing),
        String(txList.length),
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Category', 'Type', 'Incoming', 'Outgoing', 'Net', 'Txns']],
        body: catRows,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', textColor: [40, 40, 60] },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [246, 246, 252] },
        columnStyles: {
          0: { cellWidth: 48 }, 1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 32, halign: 'right' }, 3: { cellWidth: 32, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' }, 5: { cellWidth: 12, halign: 'center' },
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            if (data.column.index === 2) data.cell.styles.textColor = [16, 185, 129];
            if (data.column.index === 3) data.cell.styles.textColor = [244, 63, 94];
            if (data.column.index === 4) {
              const raw = categoryBreakdown[data.row.index];
              if (raw) {
                const net = raw.incoming - raw.outgoing;
                data.cell.styles.textColor = net >= 0 ? [16, 185, 129] : [244, 63, 94];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        },
      });

      // Per-category detail tables
      for (const { category, txList } of categoryBreakdown) {
        const sortedTxs = [...txList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const txRows = sortedTxs.map(t => [
          t.date,
          t.type === 'incoming' ? 'IN' : 'OUT',
          t.notes || '—',
          t.friendName || '—',
          (t.type === 'incoming' ? '+' : '-') + fmtPdf(t.amount),
        ]);
        const currentY = (doc as any).lastAutoTable?.finalY ?? y;
        const labelY = currentY + 10;
        if (labelY > 270) doc.addPage();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(79, 70, 229);
        doc.text(`${category?.name || 'Uncategorized'} — Transactions`, margin, (doc as any).lastAutoTable?.finalY ? currentY + 10 : labelY);
        autoTable(doc, {
          startY: (doc as any).lastAutoTable?.finalY ? currentY + 12 : labelY + 3,
          head: [['Date', 'Flow', 'Notes', 'Person', 'Amount']],
          body: txRows,
          margin: { left: margin, right: margin },
          styles: { fontSize: 7.5, cellPadding: 2.5, font: 'helvetica', textColor: [40, 40, 60] },
          headStyles: { fillColor: [240, 238, 255], textColor: [79, 70, 229], fontStyle: 'bold', fontSize: 7.5 },
          alternateRowStyles: { fillColor: [250, 250, 255] },
          columnStyles: {
            0: { cellWidth: 24, halign: 'center' }, 1: { cellWidth: 14, halign: 'center' },
            2: { cellWidth: 68 }, 3: { cellWidth: 30 }, 4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
          },
          didParseCell: (data) => {
            if (data.section === 'body') {
              if (data.column.index === 1) {
                data.cell.styles.textColor = data.cell.raw === 'IN' ? [16, 185, 129] : [244, 63, 94];
                data.cell.styles.fontStyle = 'bold';
              }
              if (data.column.index === 4) {
                data.cell.styles.textColor = (data.cell.raw as string).startsWith('+') ? [16, 185, 129] : [244, 63, 94];
              }
            }
          },
        });
      }
    }

    // ── Borrow & Debt section ─────────────────────────────────────────────────
    if (hasDebtActivity || pendingDebts.length > 0) {
      const afterTables = (doc as any).lastAutoTable?.finalY ?? y;
      const debtSectionY = afterTables + 10;
      if (debtSectionY > 260) doc.addPage();

      const dY = (doc as any).lastAutoTable?.finalY ? debtSectionY : debtSectionY;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text('Borrow & Debt Register', margin, dY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 140);
      doc.text('Tracks money borrowed/lent this month and any returns made — including carry-overs from previous months.', margin, dY + 5);

      // Borrowed/lent this month
      if (debtsCreatedThisMonth.length > 0) {
        autoTable(doc, {
          startY: dY + 10,
          head: [['Person', 'Direction', 'Remaining', 'Total', 'Due Date', 'Status']],
          body: debtsCreatedThisMonth.map(d => {
            const paid = (d.settlements || []).reduce((s, sl) => s + sl.amount, 0);
            const remaining = d.status === 'resolved' ? 0 : Math.max(0, d.amount - paid);
            return [
              d.personName,
              d.type === 'to_give' ? 'I Owe Them' : 'They Owe Me',
              d.status === 'resolved' ? 'Settled' : fmtPdf(remaining),
              fmtPdf(d.amount),
              d.dueDate || '—',
              d.status === 'resolved' ? 'Settled' : (paid > 0 ? `Partial (${fmtPdf(paid)} paid)` : 'Pending'),
            ];
          }),
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', textColor: [40, 40, 60] },
          headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          alternateRowStyles: { fillColor: [255, 251, 235] },
          didParseCell: (data) => {
            if (data.section === 'body') {
              if (data.column.index === 1) {
                data.cell.styles.textColor = (data.cell.raw as string) === 'I Owe Them' ? [244, 63, 94] : [16, 185, 129];
                data.cell.styles.fontStyle = 'bold';
              }
              if (data.column.index === 5) {
                data.cell.styles.textColor = (data.cell.raw as string) === 'Settled' ? [16, 185, 129] : [245, 158, 11];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          },
        });
      }

      // Returned/settled this month
      if (debtsResolvedThisMonth.length > 0) {
        const afterDebt = (doc as any).lastAutoTable?.finalY ?? dY + 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(16, 185, 129);
        doc.text('Debts Settled This Month', margin, afterDebt + 8);
        autoTable(doc, {
          startY: afterDebt + 11,
          head: [['Person', 'Direction', 'Amount', 'Notes', 'Settled On']],
          body: debtsResolvedThisMonth.map(d => [
            d.personName,
            d.type === 'to_give' ? 'I Paid Them' : 'They Paid Me',
            fmtPdf(d.amount),
            d.notes || '—',
            d.resolvedAt ? new Date(d.resolvedAt).toLocaleDateString('en-IN') : '—',
          ]),
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', textColor: [40, 40, 60] },
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          alternateRowStyles: { fillColor: [240, 253, 244] },
        });
      }

      // Carry-over pending debts
      if (pendingDebts.length > 0) {
        const afterSettled = (doc as any).lastAutoTable?.finalY ?? dY + 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(244, 63, 94);
        doc.text('Still Outstanding (Carry-Over)', margin, afterSettled + 8);
        autoTable(doc, {
          startY: afterSettled + 11,
          head: [['Person', 'Direction', 'Remaining', 'Paid', 'Total', 'Due Date']],
          body: pendingDebts.map(d => {
            const paid = (d.settlements || []).reduce((s, sl) => s + sl.amount, 0);
            const remaining = Math.max(0, d.amount - paid);
            return [
              d.personName,
              d.type === 'to_give' ? 'I Owe Them' : 'They Owe Me',
              fmtPdf(remaining),
              paid > 0 ? fmtPdf(paid) : '—',
              fmtPdf(d.amount),
              d.dueDate || 'No due date',
            ];
          }),
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', textColor: [40, 40, 60] },
          headStyles: { fillColor: [244, 63, 94], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          alternateRowStyles: { fillColor: [255, 241, 242] },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) {
              data.cell.styles.textColor = (data.cell.raw as string) === 'I Owe Them' ? [244, 63, 94] : [16, 185, 129];
              data.cell.styles.fontStyle = 'bold';
            }
          },
        });
      }
    }

    // Footer on each page
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 180);
      doc.text(
        `Spendly. Financial Report  •  ${reportTitle}  •  Page ${i} of ${totalPages}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: 'center' }
      );
    }

    return doc.output('blob');
  };

  const handleExport = async (share: boolean) => {
    setExporting(true);
    try {
      const blob = await buildPdf();
      const fileName = `Spendly-Report-${MONTH_NAMES[selectedMonth]}-${selectedYear}.pdf`;
      if (share && navigator.canShare?.({ files: [new File([blob], fileName, { type: 'application/pdf' })] })) {
        await navigator.share({
          title: `Spendly Report – ${MONTH_NAMES[selectedMonth]} ${selectedYear}`,
          text: `Monthly financial summary for ${MONTH_NAMES[selectedMonth]} ${selectedYear}`,
          files: [new File([blob], fileName, { type: 'application/pdf' })],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('PDF export error:', err);
        alert('Could not generate PDF. Please try again.');
      }
    } finally {
      setExporting(false);
    }
  };

  // ── UI ────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in" id="monthly-summary-root">

      {/* Month Navigator + Export */}
      <div className="glass-panel rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-white/60 dark:border-slate-800/30">
        <div className="flex items-center justify-between gap-4">
          <button type="button" onClick={goToPrev}
            className="p-2.5 rounded-xl bg-white/50 hover:bg-white/80 dark:bg-slate-900/40 dark:hover:bg-slate-900/70 border border-white/50 dark:border-slate-800 transition text-slate-600 dark:text-slate-300 flex-shrink-0">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center flex-1 min-w-0">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Monthly Financial Summary</p>
          </div>
          <button type="button" onClick={goToNext} disabled={isAtPresent}
            className="p-2.5 rounded-xl bg-white/50 hover:bg-white/80 dark:bg-slate-900/40 dark:hover:bg-slate-900/70 border border-white/50 dark:border-slate-800 transition text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0">
            <ChevronRight size={18} />
          </button>
        </div>

        {hasAnyData && (
          <div className="flex items-center gap-3 mt-5 pt-5 border-t border-white/40 dark:border-slate-800/40">
            <button type="button" onClick={() => handleExport(false)} disabled={exporting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20">
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download PDF
            </button>
            <button type="button" onClick={() => handleExport(true)} disabled={exporting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-white/50 hover:bg-white/80 dark:bg-slate-900/40 dark:hover:bg-slate-900/70 border border-white/50 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition disabled:opacity-60 disabled:cursor-not-allowed">
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
              Share Report
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel rounded-[28px] p-5 border border-white/60 dark:border-slate-800/30 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400"><TrendingUp size={16} /></div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Incoming</span>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{fmt(totalIncoming)}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {monthlyTxs.filter(t => t.type === 'incoming').length} payment{monthlyTxs.filter(t => t.type === 'incoming').length !== 1 ? 's' : ''} received
          </p>
        </div>
        <div className="glass-panel rounded-[28px] p-5 border border-white/60 dark:border-slate-800/30 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-rose-500/10 rounded-xl text-rose-600 dark:text-rose-400"><TrendingDown size={16} /></div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Outgoing</span>
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{fmt(totalOutgoing)}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {monthlyTxs.filter(t => t.type === 'outgoing').length} payment{monthlyTxs.filter(t => t.type === 'outgoing').length !== 1 ? 's' : ''} made
          </p>
        </div>
        <div className="glass-panel rounded-[28px] p-5 border border-white/60 dark:border-slate-800/30 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-xl ${netBalance >= 0 ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
              <Wallet size={16} />
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Balance</span>
          </div>
          <p className={`text-2xl font-black ${netBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {netBalance >= 0 ? '+' : ''}{fmt(netBalance)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {monthlyTxs.length} total transaction{monthlyTxs.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="glass-panel rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-white/60 dark:border-slate-800/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-500/10 rounded-2xl text-indigo-500"><FileText size={18} /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Category Breakdown</h3>
            <p className="text-xs text-slate-400 font-medium">{MONTH_NAMES[selectedMonth]} {selectedYear} — tap a row to expand transactions</p>
          </div>
        </div>

        {categoryBreakdown.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <AlertCircle className="w-10 h-10 opacity-30 mx-auto mb-3" />
            <p className="text-sm font-semibold">No transactions for {MONTH_NAMES[selectedMonth]} {selectedYear}</p>
            <p className="text-xs mt-1">Log entries in the Book Ledger Log tab to see them here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {categoryBreakdown.map(({ id, category, incoming, outgoing, txList }) => {
              const isExpanded = expandedCat === id;
              const catColor = category?.color || '#94a3b8';
              return (
                <div key={id} className="border border-white/50 dark:border-slate-800/40 rounded-2xl overflow-hidden bg-white/30 dark:bg-slate-900/20">
                  <button type="button" onClick={() => setExpandedCat(isExpanded ? null : id)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-white/50 dark:hover:bg-slate-900/40 transition text-left">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0" style={{ backgroundColor: catColor }}>
                      <DynamicIcon name={category?.icon || 'DollarSign'} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{category?.name || 'Uncategorized'}</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {txList.length} transaction{txList.length !== 1 ? 's' : ''}
                        {category?.type && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] uppercase font-bold tracking-wide">
                            {category.type}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-5 flex-shrink-0">
                      {incoming > 0 && (
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">In</p>
                          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">+{fmt(incoming)}</p>
                        </div>
                      )}
                      {outgoing > 0 && (
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Out</p>
                          <p className="text-sm font-black text-rose-600 dark:text-rose-400">-{fmt(outgoing)}</p>
                        </div>
                      )}
                      <ChevronRight size={14} className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-white/40 dark:border-slate-800/40 divide-y divide-white/30 dark:divide-slate-800/30">
                      {[...txList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                        <div key={t.id} className="flex items-center justify-between px-5 py-3 bg-white/20 dark:bg-slate-900/10 hover:bg-white/40 dark:hover:bg-slate-900/30 transition">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-1.5 rounded-lg flex-shrink-0 ${t.type === 'incoming' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                              {t.type === 'incoming' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{t.notes || 'No notes'}</p>
                              {t.friendName && <p className="text-[10px] text-slate-400 truncate">via {t.friendName}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                            <span className="text-[10px] text-slate-400 font-mono">{t.date}</span>
                            <span className={`text-sm font-black ${t.type === 'incoming' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {t.type === 'incoming' ? '+' : '-'}{fmt(t.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Borrow & Debt Activity */}
      {(hasDebtActivity || pendingDebts.length > 0) && (
        <div className="glass-panel rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-white/60 dark:border-slate-800/30">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-500/10 rounded-2xl text-amber-500"><HandCoins size={18} /></div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Borrow & Debt Register</h3>
              <p className="text-xs text-slate-400 font-medium">
                Borrowed/lent this month · returns made · carry-overs still pending
              </p>
            </div>
          </div>

          <div className="space-y-6">

            {/* Created this month */}
            {debtsCreatedThisMonth.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Borrowed / Lent in {MONTH_NAMES[selectedMonth]}
                </p>
                <div className="space-y-2">
                  {debtsCreatedThisMonth.map(d => {
                    const paid = (d.settlements || []).reduce((s, sl) => s + sl.amount, 0);
                    const remaining = Math.max(0, d.amount - paid);
                    return (
                    <div key={d.id} className="flex items-center gap-4 p-4 bg-white/30 dark:bg-slate-900/20 rounded-2xl border border-white/50 dark:border-slate-800/40">
                      <div className={`p-2 rounded-xl flex-shrink-0 ${d.type === 'to_give' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                        <HandCoins size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{d.personName}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {d.type === 'to_give' ? 'I owe them' : 'They owe me'}
                          {d.notes ? ` · ${d.notes}` : ''}
                          {d.dueDate ? ` · due ${d.dueDate}` : ''}
                        </p>
                        {paid > 0 && d.status !== 'resolved' && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                            Paid {fmt(paid)} of {fmt(d.amount)}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-black ${d.type === 'to_give' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {d.status === 'resolved' ? fmt(d.amount) : `${d.type === 'to_give' ? '-' : '+'}${fmt(remaining)}`}
                        </p>
                        {paid > 0 && d.status !== 'resolved' && (
                          <p className="text-[10px] text-slate-400 line-through">{fmt(d.amount)}</p>
                        )}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${d.status === 'resolved' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
                          {d.status === 'resolved' ? 'Settled' : (paid > 0 ? 'Partial' : 'Pending')}
                        </span>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Returned/resolved this month */}
            {debtsResolvedThisMonth.length > 0 && (
              <div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Settled in {MONTH_NAMES[selectedMonth]}
                </p>
                <div className="space-y-2">
                  {debtsResolvedThisMonth.map(d => (
                    <div key={d.id} className="flex items-center gap-4 p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-200/40 dark:border-emerald-800/30">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        <CheckCircle2 size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{d.personName}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {d.type === 'to_give' ? 'Paid them back' : 'Received from them'}
                          {d.notes ? ` · ${d.notes}` : ''}
                          {d.resolvedAt ? ` · on ${new Date(d.resolvedAt).toLocaleDateString('en-IN')}` : ''}
                        </p>
                      </div>
                      <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        {fmt(d.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Carry-over pending */}
            {pendingDebts.length > 0 && (
              <div>
                <p className="text-xs font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock size={12} /> Still Outstanding (Carry-Over)
                </p>
                <div className="space-y-2">
                  {pendingDebts.map(d => {
                    const paid = (d.settlements || []).reduce((s, sl) => s + sl.amount, 0);
                    const remaining = Math.max(0, d.amount - paid);
                    return (
                    <div key={d.id} className="flex items-center gap-4 p-4 bg-rose-50/40 dark:bg-rose-900/10 rounded-2xl border border-rose-200/40 dark:border-rose-800/30">
                      <div className={`p-2 rounded-xl flex-shrink-0 ${d.type === 'to_give' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                        <Clock size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{d.personName}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {d.type === 'to_give' ? 'I still owe them' : 'They still owe me'}
                          {d.notes ? ` · ${d.notes}` : ''}
                          {d.dueDate ? ` · due ${d.dueDate}` : ''}
                          {` · since ${new Date(d.createdAt).toLocaleDateString('en-IN')}`}
                        </p>
                        {paid > 0 && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                            Paid {fmt(paid)} of {fmt(d.amount)}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-black ${d.type === 'to_give' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {fmt(remaining)}
                        </p>
                        {paid > 0 && (
                          <p className="text-[10px] text-slate-400 line-through">{fmt(d.amount)}</p>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
