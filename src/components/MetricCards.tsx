import React, { useMemo, useState, useRef } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  AlertCircle,
  Wallet,
  Pencil,
  Check,
  X,
  Banknote,
  CreditCard,
  PiggyBank,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';
import { Transaction, Debt, Category, Period } from '../types';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface MetricCardsProps {
  transactions: Transaction[];       // all-time (for Card 1 balance)
  periodTransactions: Transaction[]; // period-filtered (for Cards 2 & 3)
  debts: Debt[];
  categories: Category[];
  isDarkMode?: boolean;
  walletBalance: number;
  onSetWalletBalance: (amount: number) => void;
  cashBalance: number;
  onSetCashBalance: (amount: number) => void;
  compact?: boolean;
  selectedPeriod: Period;
  onPeriodChange: (p: Period) => void;
}

export default function MetricCards({ transactions, periodTransactions, debts, categories, isDarkMode, walletBalance, onSetWalletBalance, cashBalance, onSetCashBalance, compact = false, selectedPeriod, onPeriodChange }: MetricCardsProps) {
  const [editMode, setEditMode] = useState<'none' | 'wallet' | 'cash'>('none');
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [hiddenCards, setHiddenCards] = useState<Set<string>>(new Set(['balance', 'income', 'expense', 'debts']));

  const toggleHide = (id: string) => {
    setHiddenCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Period navigation helpers
  const now = new Date();
  const isCurrentMonth = selectedPeriod.type === 'month' &&
    selectedPeriod.year === now.getFullYear() &&
    selectedPeriod.month === now.getMonth() + 1;

  const goPrev = () => {
    if (selectedPeriod.type !== 'month') return;
    const d = new Date(selectedPeriod.year, selectedPeriod.month - 2, 1);
    onPeriodChange({ type: 'month', year: d.getFullYear(), month: d.getMonth() + 1 });
  };

  const goNext = () => {
    if (selectedPeriod.type !== 'month' || isCurrentMonth) return;
    const d = new Date(selectedPeriod.year, selectedPeriod.month, 1);
    onPeriodChange({ type: 'month', year: d.getFullYear(), month: d.getMonth() + 1 });
  };

  const periodLabel = selectedPeriod.type === 'all'
    ? 'All Time'
    : `${MONTH_NAMES[selectedPeriod.month - 1]} ${selectedPeriod.year}`;

  // All-time stats → Card 1 (Available Balance) & Card 4 (Debts)
  const allTimeStats = useMemo(() => {
    const savingsCatIds = new Set(categories.filter(c => c.type === 'savings').map(c => c.id));
    let income = 0, expense = 0, savings = 0, cashIncome = 0, cashExpense = 0;
    transactions.forEach(t => {
      const isCash = (t.paymentMethod ?? 'online') === 'cash';
      if (t.type === 'incoming') {
        income += t.amount;
        isCash ? (cashIncome += t.amount) : 0;
      } else if (savingsCatIds.has(t.categoryId)) {
        savings += t.amount;
        isCash ? (cashExpense += t.amount) : 0;
      } else {
        expense += t.amount;
        isCash ? (cashExpense += t.amount) : 0;
      }
    });
    const pendingToGive = debts.filter(d => d.status === 'pending' && d.type === 'to_give').reduce((s, d) => s + d.amount, 0);
    const pendingToReceive = debts.filter(d => d.status === 'pending' && d.type === 'to_receive').reduce((s, d) => s + d.amount, 0);
    const cashInHand = cashBalance + cashIncome - cashExpense;
    const availableBalance = walletBalance + income - expense - savings;
    const projectedBalance = availableBalance + pendingToReceive - pendingToGive;
    return { availableBalance, projectedBalance, cashInHand, pendingToGive, pendingToReceive };
  }, [transactions, debts, categories, walletBalance, cashBalance]);

  // Period stats → Card 2 (Inflow) & Card 3 (Expenses/Savings)
  const periodStats = useMemo(() => {
    const savingsCatIds = new Set(categories.filter(c => c.type === 'savings').map(c => c.id));
    let income = 0, expense = 0, savings = 0, cashIncome = 0, cashExpense = 0;
    periodTransactions.forEach(t => {
      const isCash = (t.paymentMethod ?? 'online') === 'cash';
      if (t.type === 'incoming') {
        income += t.amount;
        isCash ? (cashIncome += t.amount) : 0;
      } else if (savingsCatIds.has(t.categoryId)) {
        savings += t.amount;
      } else {
        expense += t.amount;
        isCash ? (cashExpense += t.amount) : 0;
      }
    });
    return { income, expense, savings, cashIncome, cashExpense };
  }, [periodTransactions, categories]);

  // Category breakdown for the strip below cards
  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, { name: string; color: string; amount: number }> = {};
    periodTransactions.filter(t => t.type === 'outgoing').forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      if (!cat) return;
      if (!totals[cat.id]) totals[cat.id] = { name: cat.name, color: cat.color, amount: 0 };
      totals[cat.id].amount += t.amount;
    });
    return Object.values(totals).sort((a, b) => b.amount - a.amount);
  }, [periodTransactions, categories]);

  const startEdit = (mode: 'wallet' | 'cash') => {
    const current = mode === 'wallet' ? walletBalance : cashBalance;
    setEditValue(current === 0 ? '' : String(current));
    setEditMode(mode);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const commitEdit = () => {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed) && parsed >= 0) {
      if (editMode === 'wallet') onSetWalletBalance(parsed);
      else onSetCashBalance(parsed);
    }
    setEditMode('none');
  };

  const cancelEdit = () => setEditMode('none');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const fmt = (n: number) => Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const isAvailableNeg = allTimeStats.availableBalance < 0;
  const isProjectedNeg = allTimeStats.projectedBalance < 0;
  const hasPendingDebts = allTimeStats.pendingToGive > 0 || allTimeStats.pendingToReceive > 0;

  // Shared period selector bar
  const PeriodSelector = ({ small = false }: { small?: boolean }) => (
    <div className={`flex items-center justify-between ${small ? 'mb-3' : 'mb-5'}`}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={goPrev}
          disabled={selectedPeriod.type === 'all'}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
        >
          <ChevronLeft size={small ? 13 : 15} />
        </button>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/60 dark:bg-slate-900/50 rounded-xl border border-white/70 dark:border-slate-800/50">
          <CalendarDays size={small ? 11 : 13} className="text-indigo-500" />
          <span className={`font-bold text-slate-700 dark:text-slate-200 ${small ? 'text-[10px]' : 'text-xs'}`}>{periodLabel}</span>
        </div>
        <button
          type="button"
          onClick={goNext}
          disabled={selectedPeriod.type === 'all' || isCurrentMonth}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
        >
          <ChevronRight size={small ? 13 : 15} />
        </button>
      </div>
      <button
        type="button"
        onClick={() => selectedPeriod.type === 'all'
          ? onPeriodChange({ type: 'month', year: now.getFullYear(), month: now.getMonth() + 1 })
          : onPeriodChange({ type: 'all' })
        }
        className={`${small ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-3 py-1'} rounded-xl font-bold border transition ${
          selectedPeriod.type === 'all'
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-white/60 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-white/70 dark:border-slate-800/50 hover:border-indigo-400 hover:text-indigo-600'
        }`}
      >
        All Time
      </button>
    </div>
  );

  // ── Compact strip for non-dashboard tabs ──────────────────────────────────
  if (compact) {
    const compactCards = [
      {
        id: 'balance',
        label: 'Available Balance',
        value: allTimeStats.availableBalance,
        signed: true,
        negative: isAvailableNeg,
        Icon: Wallet,
        accent: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-500/10',
      },
      {
        id: 'income',
        label: 'Total Inflow',
        value: periodStats.income,
        signed: false,
        negative: false,
        Icon: ArrowUpRight,
        accent: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10',
      },
      {
        id: 'expense',
        label: 'Expenses & Savings',
        value: periodStats.expense + periodStats.savings,
        signed: false,
        negative: false,
        Icon: ArrowDownLeft,
        accent: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10',
      },
      {
        id: 'debts',
        label: 'Friend Balances',
        value: allTimeStats.pendingToReceive - allTimeStats.pendingToGive,
        signed: true,
        negative: (allTimeStats.pendingToReceive - allTimeStats.pendingToGive) < 0,
        Icon: ArrowRightLeft,
        accent: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-500/10',
      },
    ];

    return (
      <div className="mb-6" id="dashboard-metric-cards-compact">
      <PeriodSelector small />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {compactCards.map(({ id, label, value, signed, negative, Icon, accent, bg }) => {
          const hidden = hiddenCards.has(id);
          const displayValue = signed
            ? `${negative ? '-' : ''}₹${fmt(value)}`
            : `₹${fmt(value)}`;
          return (
            <div
              key={id}
              className="glass-card rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 border border-white/60 dark:border-slate-800/40 shadow-sm"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-2 rounded-xl ${bg} flex-shrink-0`}>
                  <Icon size={14} className={accent} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">{label}</p>
                  <p
                    className={`text-sm font-extrabold mt-0.5 tracking-tight ${negative ? 'text-red-500' : (isDarkMode ? 'text-white' : 'text-slate-800')}`}
                  >
                    {hidden ? '₹ ••••••' : displayValue}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleHide(id)}
                className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title={hidden ? 'Show amount' : 'Hide amount'}
              >
                {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          );
        })}
      </div>
      </div>
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  const mask = '₹ ••••••';

  return (
    <div className="mb-8" id="dashboard-metric-cards">
      <PeriodSelector />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

      {/* Card 1 — Wallet / Available Balance */}
      {(() => {
        const hidden = hiddenCards.has('balance');
        return (
          <div
            id="card-available-balance"
            className="relative overflow-hidden glass-card rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_55px_rgba(0,0,0,0.15)] border border-white/60 dark:border-slate-800/40 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_25px_60px_rgba(0,0,0,0.06)]"
          >
            <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full filter blur-[40px] opacity-25 dark:opacity-20 pointer-events-none bg-indigo-500" />
            <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.04] dark:opacity-[0.08]">
              <Wallet size={120} className="text-indigo-600" />
            </div>

            <div className="flex justify-between items-start relative z-10">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Available Balance</p>
                <h3
                  className="text-xl font-extrabold font-sans mt-2.5 tracking-tight"
                  style={{ color: !hidden && isAvailableNeg ? '#ef4444' : (isDarkMode ? '#ffffff' : '#0f172a') }}
                >
                  {hidden ? mask : `${isAvailableNeg ? '-' : ''}₹${fmt(allTimeStats.availableBalance)}`}
                </h3>

                {editMode !== 'none' && !hidden ? (
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-semibold">
                      {editMode === 'wallet' ? 'Wallet' : 'Cash'}: ₹
                    </span>
                    <input
                      ref={inputRef}
                      type="number"
                      min="0"
                      step="0.01"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="0.00"
                      className="w-28 px-2 py-1 bg-white dark:bg-slate-900 border border-indigo-400 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button type="button" onClick={commitEdit} className="p-1 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition" title="Save">
                      <Check size={11} />
                    </button>
                    <button type="button" onClick={cancelEdit} className="p-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-300 transition" title="Cancel">
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => !hidden && startEdit('wallet')}
                    className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition group"
                  >
                    <span>Wallet: {hidden ? '••••' : `₹${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}</span>
                    {!hidden && <Pencil size={9} className="opacity-60 group-hover:opacity-100" />}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button type="button" onClick={() => toggleHide('balance')} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition" title={hidden ? 'Show' : 'Hide'}>
                  {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/50 shadow-sm border border-white/80 dark:border-slate-800/30 text-indigo-600 dark:text-indigo-400">
                  <Wallet size={18} />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-white/50 dark:border-slate-800/50 flex items-center justify-between gap-3 relative z-10">
              <button
                type="button"
                onClick={() => !hidden && editMode === 'none' && startEdit('cash')}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:opacity-80 transition group"
                title="Click to set your cash in hand"
              >
                <Banknote size={13} />
                <span>Cash: {hidden ? '••••' : `₹${fmt(allTimeStats.cashInHand)}`}</span>
                {!hidden && <Pencil size={9} className="opacity-50 group-hover:opacity-100" />}
              </button>
              <span className="text-slate-300 dark:text-slate-700 text-xs">|</span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-500 dark:text-indigo-400">
                <CreditCard size={13} />
                Online: {hidden ? '••••' : `₹${fmt(allTimeStats.availableBalance - allTimeStats.cashInHand)}`}
              </span>
            </div>

            {hasPendingDebts && (
              <div className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium relative z-10 flex items-center gap-1">
                <AlertCircle size={11} className="text-amber-500 flex-shrink-0" />
                Projected after debts:&nbsp;
                <span className={`font-bold ${!hidden && isProjectedNeg ? 'text-red-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
                  {hidden ? '••••' : `${isProjectedNeg ? '-' : '+'}₹${fmt(allTimeStats.projectedBalance)}`}
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Card 2 — Total Inflow */}
      {(() => {
        const hidden = hiddenCards.has('income');
        return (
          <div
            id="card-total-income"
            className="relative overflow-hidden glass-card rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_55px_rgba(0,0,0,0.15)] border border-white/60 dark:border-slate-800/40 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_25px_60px_rgba(0,0,0,0.06)]"
          >
            <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full filter blur-[40px] opacity-25 dark:opacity-20 pointer-events-none bg-emerald-500" />
            <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.04] dark:opacity-[0.08]">
              <ArrowUpRight size={120} className="text-emerald-600" />
            </div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Monthly Inflow</p>
                <h3 className="text-xl font-extrabold font-sans mt-2.5 tracking-tight" style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                  {hidden ? mask : `₹${fmt(periodStats.income)}`}
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button type="button" onClick={() => toggleHide('income')} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition" title={hidden ? 'Show' : 'Hide'}>
                  {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/50 shadow-sm border border-white/80 dark:border-slate-800/30 text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight size={18} />
                </div>
              </div>
            </div>
            <div className="mt-5 text-xs text-slate-500 dark:text-slate-400 font-medium relative z-10">
              Salary, consulting, gifts, gig earnings
            </div>
          </div>
        );
      })()}

      {/* Card 3 — Total Outflow + Savings */}
      {(() => {
        const hidden = hiddenCards.has('expense');
        return (
          <div
            id="card-total-outgoing"
            className="relative overflow-hidden glass-card rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_55px_rgba(0,0,0,0.15)] border border-white/60 dark:border-slate-800/40 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_25px_60px_rgba(0,0,0,0.06)]"
          >
            <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full filter blur-[40px] opacity-25 dark:opacity-20 pointer-events-none bg-amber-500" />
            <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.04] dark:opacity-[0.08]">
              <ArrowDownLeft size={120} className="text-amber-600" />
            </div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Expenses & Savings</p>
                <h3 className="text-xl font-extrabold font-sans mt-2.5 tracking-tight" style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                  {hidden ? mask : `₹${fmt(periodStats.expense + periodStats.savings)}`}
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button type="button" onClick={() => toggleHide('expense')} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition" title={hidden ? 'Show' : 'Hide'}>
                  {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/50 shadow-sm border border-white/80 dark:border-slate-800/30 text-amber-600 dark:text-amber-400">
                  <ArrowDownLeft size={18} />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-white/50 dark:border-slate-800/50 flex items-center justify-between gap-3 relative z-10">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <ArrowDownLeft size={13} />
                Spent: {hidden ? '••••' : `₹${fmt(periodStats.expense)}`}
              </span>
              <span className="text-slate-300 dark:text-slate-700 text-xs">|</span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <PiggyBank size={13} />
                Saved: {hidden ? '••••' : `₹${fmt(periodStats.savings)}`}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Card 4 — Friend Balances */}
      {(() => {
        const hidden = hiddenCards.has('debts');
        const netDebt = allTimeStats.pendingToReceive - allTimeStats.pendingToGive;
        const netNeg = netDebt < 0;
        return (
          <div
            id="card-debts-credits"
            className="relative overflow-hidden glass-card rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_55px_rgba(0,0,0,0.15)] border border-white/60 dark:border-slate-800/40 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_25px_60px_rgba(0,0,0,0.06)]"
          >
            <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full filter blur-[40px] opacity-25 dark:opacity-20 pointer-events-none ${hasPendingDebts ? 'bg-purple-500' : 'bg-slate-400'}`} />
            <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.04] dark:opacity-[0.08]">
              <ArrowRightLeft size={120} className="text-purple-600" />
            </div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Friend Balances & Tab</p>
                <h3
                  className="text-xl font-extrabold font-sans mt-2.5 tracking-tight"
                  style={{ color: !hidden && netNeg ? '#ef4444' : (isDarkMode ? '#ffffff' : '#0f172a') }}
                >
                  {hidden ? mask : `${netDebt >= 0 ? '+' : '-'}₹${fmt(netDebt)}`}
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button type="button" onClick={() => toggleHide('debts')} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition" title={hidden ? 'Show' : 'Hide'}>
                  {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <div className={`p-3 rounded-2xl bg-white/60 dark:bg-slate-900/50 shadow-sm border border-white/80 dark:border-slate-800/30 ${netDebt >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  <ArrowRightLeft size={18} />
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium relative z-10">
              <span>
                Friend owes: {hidden ? '••••' : `₹${fmt(allTimeStats.pendingToReceive)}`} / You owe: {hidden ? '••••' : `₹${fmt(allTimeStats.pendingToGive)}`}
              </span>
              {hasPendingDebts && (
                <span className="flex items-center gap-1 font-bold text-purple-600 dark:text-purple-400">
                  <AlertCircle size={12} />
                  Active
                </span>
              )}
            </div>
          </div>
        );
      })()}

      </div>

      {/* Category breakdown strip */}
      {categoryBreakdown.length > 0 && (
        <div className="mt-4 glass-panel rounded-2xl px-5 py-4 border border-white/60 dark:border-slate-800/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            {periodLabel} · Spending by Category
          </p>
          <div className="flex flex-wrap gap-2">
            {categoryBreakdown.map(cat => (
              <div
                key={cat.name}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/70 dark:bg-slate-900/50 rounded-xl border border-white/80 dark:border-slate-800/40 shadow-sm"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{cat.name}</span>
                <span className="text-[11px] font-bold text-slate-800 dark:text-white">₹{fmt(cat.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
