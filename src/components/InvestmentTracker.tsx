import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  CalendarCheck,
  Banknote,
  ArrowUpRight,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { Investment } from '../types';

interface InvestmentTrackerProps {
  investments: Investment[];
  onCreateInvestment: (
    name: string,
    principal: number,
    expectedReturn: number,
    startDate: string,
    maturityDate: string,
    notes?: string
  ) => void;
  onConfirmInvestment: (id: string) => void;
  onDeleteInvestment: (id: string) => void;
}

export default function InvestmentTracker({
  investments,
  onCreateInvestment,
  onConfirmInvestment,
  onDeleteInvestment,
}: InvestmentTrackerProps) {
  const today = new Date().toISOString().split('T')[0];

  const [name, setName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [startDate, setStartDate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'confirmed'>('all');

  const reset = () => {
    setName('');
    setPrincipal('');
    setExpectedReturn('');
    setStartDate('');
    setMaturityDate('');
    setNotes('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(principal);
    const r = parseFloat(expectedReturn);
    if (!name.trim() || isNaN(p) || p <= 0 || isNaN(r) || r <= 0 || !startDate || !maturityDate) return;
    onCreateInvestment(name.trim(), p, r, startDate, maturityDate, notes.trim() || undefined);
    reset();
  };

  const sorted = useMemo(() => {
    return [...investments]
      .filter(i => filter === 'all' || i.status === filter)
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        return new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime();
      });
  }, [investments, filter]);

  const stats = useMemo(() => {
    const active = investments.filter(i => i.status === 'active');
    const confirmed = investments.filter(i => i.status === 'confirmed');
    const totalInvested = active.reduce((s, i) => s + i.principal, 0);
    const totalExpected = active.reduce((s, i) => s + i.expectedReturn, 0);
    const totalReturned = confirmed.reduce((s, i) => s + i.expectedReturn, 0);
    return { activeCount: active.length, totalInvested, totalExpected, totalReturned, confirmedCount: confirmed.length };
  }, [investments]);

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const isMatured = (inv: Investment) => inv.status === 'active' && inv.maturityDate <= today;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

      {/* Left — Form */}
      <div className="lg:col-span-4 space-y-4">
        <div className="glass-panel rounded-[28px] p-6 border border-white/60 dark:border-slate-800/30 shadow-[0_20px_50px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-white">Log Investment</h2>
              <p className="text-[11px] text-slate-400">Track FDs, SIPs, bonds & more</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Investment Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. SBI Fixed Deposit"
                maxLength={100}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Principal */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Principal Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={principal}
                  onChange={e => setPrincipal(e.target.value)}
                  placeholder="10000.00"
                  className="w-full pl-8 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Expected Return */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Expected Return at Maturity (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expectedReturn}
                  onChange={e => setExpectedReturn(e.target.value)}
                  placeholder="11000.00"
                  className="w-full pl-8 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                />
              </div>
              {principal && expectedReturn && parseFloat(principal) > 0 && parseFloat(expectedReturn) > 0 && (() => {
                const p = parseFloat(principal);
                const r = parseFloat(expectedReturn);
                const g = r - p;
                const pct = ((g / p) * 100).toFixed(2);
                return (
                  <p className={`mt-1.5 text-[11px] font-semibold ${g >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                    {g >= 0 ? 'Gain' : 'Loss'}: ₹{fmt(Math.abs(g))} ({g >= 0 ? '+' : ''}{pct}%)
                  </p>
                );
              })()}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Maturity Date
                </label>
                <input
                  type="date"
                  value={maturityDate}
                  onChange={e => setMaturityDate(e.target.value)}
                  autoComplete="off"
                  className="w-full px-3 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Notes <span className="font-normal normal-case tracking-normal opacity-60">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Bank name, scheme, interest rate..."
                maxLength={500}
                rows={2}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              <Plus size={15} />
              Add Investment
            </button>
          </form>
        </div>

        {/* Summary stats */}
        <div className="glass-panel rounded-[28px] p-5 border border-white/60 dark:border-slate-800/30 shadow-[0_20px_50px_rgba(0,0,0,0.03)] space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Portfolio Summary</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white/60 dark:bg-slate-900/40 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Active</p>
              <p className="text-lg font-extrabold text-slate-800 dark:text-white mt-0.5">{stats.activeCount}</p>
            </div>
            <div className="bg-white/60 dark:bg-slate-900/40 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Confirmed</p>
              <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.confirmedCount}</p>
            </div>
            <div className="bg-white/60 dark:bg-slate-900/40 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Invested</p>
              <p className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">₹{fmt(stats.totalInvested)}</p>
            </div>
            <div className="bg-white/60 dark:bg-slate-900/40 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Expected</p>
              <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">₹{fmt(stats.totalExpected)}</p>
            </div>
          </div>
          {stats.totalReturned > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/40 rounded-xl p-3">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Total Returns Booked</p>
              <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">₹{fmt(stats.totalReturned)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right — List */}
      <div className="lg:col-span-8">
        <div className="glass-panel rounded-[28px] p-6 border border-white/60 dark:border-slate-800/30 shadow-[0_20px_50px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                <CalendarCheck size={16} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800 dark:text-white">Investment Register</h2>
                <p className="text-[11px] text-slate-400">Confirm return to auto-book income</p>
              </div>
            </div>
            <div className="relative">
              <select
                value={filter}
                onChange={e => setFilter(e.target.value as any)}
                className="appearance-none pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="confirmed">Confirmed</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
                <TrendingUp size={28} className="text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No investments yet</p>
              <p className="text-xs text-slate-400 mt-1">Add your first FD, SIP, or bond using the form</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map(inv => {
                const matured = isMatured(inv);
                const gain = inv.expectedReturn - inv.principal;
                const gainPct = ((gain / inv.principal) * 100).toFixed(2);
                const daysLeft = Math.ceil((new Date(inv.maturityDate).getTime() - new Date(today).getTime()) / 86400000);

                return (
                  <div
                    key={inv.id}
                    className={`relative rounded-2xl p-4 border transition-all ${
                      inv.status === 'confirmed'
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40'
                        : matured
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40'
                        : 'bg-white/60 dark:bg-slate-900/40 border-white/80 dark:border-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-xl flex-shrink-0 ${
                          inv.status === 'confirmed'
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                            : matured
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                            : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {inv.status === 'confirmed' ? <CheckCircle2 size={16} /> : matured ? <AlertCircle size={16} /> : <Clock size={16} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-extrabold text-slate-800 dark:text-white truncate">{inv.name}</p>
                            {inv.status === 'confirmed' && (
                              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full uppercase tracking-wider">Returned</span>
                            )}
                            {matured && (
                              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded-full uppercase tracking-wider animate-pulse">Matured</span>
                            )}
                            {inv.status === 'active' && !matured && (
                              <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                {daysLeft > 0 ? `${daysLeft}d left` : 'Today'}
                              </span>
                            )}
                          </div>
                          {inv.notes && (
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{inv.notes}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              <Banknote size={11} />
                              Invested: ₹{fmt(inv.principal)}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <ArrowUpRight size={11} />
                              Return: ₹{fmt(inv.expectedReturn)}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <span className={`text-[11px] font-bold ${gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                              {gain >= 0 ? '+' : ''}{gainPct}%
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-medium">
                            <span>{inv.startDate} → {inv.maturityDate}</span>
                            {inv.confirmedAt && <span>· Confirmed {inv.confirmedAt}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {matured && (
                          <button
                            type="button"
                            onClick={() => onConfirmInvestment(inv.id)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wide rounded-xl transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                            title="Confirm return and book as income"
                          >
                            <CheckCircle2 size={12} />
                            Confirm Return
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete "${inv.name}"? This cannot be undone.`)) {
                              onDeleteInvestment(inv.id);
                            }
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                          title="Delete investment"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
