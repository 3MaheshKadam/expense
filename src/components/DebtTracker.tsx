import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  HelpCircle,
  TrendingDown,
  Scale,
  Calendar,
  ChevronDown,
  ChevronUp,
  SplitSquareHorizontal,
  X,
} from 'lucide-react';
import { Debt } from '../types';

interface DebtTrackerProps {
  debts: Debt[];
  onCreateDebt: (type: 'to_give' | 'to_receive', personName: string, amount: number, notes?: string, dueDate?: string) => Promise<void>;
  onResolveDebt: (id: string, earnOrPay: boolean) => Promise<void>;
  onAddSettlement: (debtId: string, amount: number, notes: string, date: string) => Promise<void>;
  onDeleteDebt: (id: string) => Promise<void>;
}

const fmt = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DebtTracker({ debts, onCreateDebt, onResolveDebt, onAddSettlement, onDeleteDebt }: DebtTrackerProps) {
  // New debt form
  const [personName, setPersonName] = useState('');
  const [type, setType] = useState<'to_give' | 'to_receive'>('to_receive');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('pending');

  // Per-debt slot form state: which debt has its slot form open
  const [slotOpenId, setSlotOpenId] = useState<string | null>(null);
  const [slotAmount, setSlotAmount] = useState('');
  const [slotNotes, setSlotNotes] = useState('');
  const [slotDate, setSlotDate] = useState(new Date().toISOString().split('T')[0]);
  const [slotSubmitting, setSlotSubmitting] = useState(false);
  const [slotError, setSlotError] = useState('');

  // Which debt's slot history is expanded
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null);

  const openSlotForm = (id: string) => {
    setSlotOpenId(id);
    setSlotAmount('');
    setSlotNotes('');
    setSlotDate(new Date().toISOString().split('T')[0]);
    setSlotError('');
  };

  const closeSlotForm = () => {
    setSlotOpenId(null);
    setSlotError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!personName.trim()) { setError('Please provide a contact person name.'); return; }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError('Please enter a valid positive amount.'); return; }
    setIsSubmitting(true);
    try {
      await onCreateDebt(type, personName.trim(), parsedAmount, notes.trim() || undefined, dueDate || undefined);
      setPersonName(''); setAmount(''); setNotes(''); setDueDate('');
    } catch { setError('Failed to record debt. Please retry.'); }
    finally { setIsSubmitting(false); }
  };

  const handleAddSlot = async (debtId: string) => {
    setSlotError('');
    const parsed = parseFloat(slotAmount);
    if (isNaN(parsed) || parsed <= 0) { setSlotError('Enter a valid amount for this slot.'); return; }
    if (!slotDate) { setSlotError('Select a date for this payment slot.'); return; }

    const target = debts.find(d => d.id === debtId);
    if (!target) return;

    const alreadyPaid = (target.settlements || []).reduce((s, sl) => s + sl.amount, 0);
    const remaining = target.amount - alreadyPaid;
    if (parsed > remaining + 0.001) {
      setSlotError(`Slot amount exceeds remaining balance of ${fmt(remaining)}.`);
      return;
    }

    setSlotSubmitting(true);
    try {
      await onAddSettlement(debtId, parsed, slotNotes.trim(), slotDate);
      closeSlotForm();
    } catch { setSlotError('Failed to save slot. Please retry.'); }
    finally { setSlotSubmitting(false); }
  };

  const debtStats = useMemo(() => {
    const toGive = debts
      .filter(d => d.status === 'pending' && d.type === 'to_give')
      .reduce((sum, d) => {
        const paid = (d.settlements || []).reduce((s, sl) => s + sl.amount, 0);
        return sum + Math.max(0, d.amount - paid);
      }, 0);
    const toReceive = debts
      .filter(d => d.status === 'pending' && d.type === 'to_receive')
      .reduce((sum, d) => {
        const paid = (d.settlements || []).reduce((s, sl) => s + sl.amount, 0);
        return sum + Math.max(0, d.amount - paid);
      }, 0);
    return { toGive, toReceive, balance: toReceive - toGive };
  }, [debts]);

  const sortedDebts = useMemo(() =>
    debts
      .filter(d => statusFilter === 'all' || d.status === statusFilter)
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [debts, statusFilter]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="debt-tracker-root">

      {/* Stats */}
      <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-6" id="debt-balances-board">
        <div className="p-5 bg-gradient-to-tr from-rose-500/10 to-rose-600/10 dark:from-rose-950/30 dark:to-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/50 flex items-center gap-4">
          <div className="p-3 bg-rose-500 rounded-xl text-white shadow-md shadow-rose-500/10"><ArrowDownLeft size={20} /></div>
          <div>
            <h4 className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Total I Owe (Remaining)</h4>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{fmt(debtStats.toGive)}</p>
          </div>
        </div>
        <div className="p-5 bg-gradient-to-tr from-emerald-500/10 to-emerald-600/10 dark:from-emerald-950/30 dark:to-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-4">
          <div className="p-3 bg-emerald-500 rounded-xl text-white shadow-md shadow-emerald-500/10"><ArrowUpRight size={20} /></div>
          <div>
            <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Owed to Me (Remaining)</h4>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{fmt(debtStats.toReceive)}</p>
          </div>
        </div>
        <div className={`p-5 rounded-2xl border flex items-center gap-4 ${
          debtStats.balance >= 0
            ? 'bg-gradient-to-tr from-indigo-50/50 to-indigo-100/30 dark:from-indigo-950/30 dark:to-indigo-900/10 border-indigo-100 dark:border-indigo-900/50'
            : 'bg-gradient-to-tr from-rose-50 to-rose-100/30 dark:from-pink-950/30 dark:to-pink-900/10 border-rose-150 dark:border-rose-900/50'
        }`}>
          <div className={`p-3 rounded-xl shadow-md ${debtStats.balance >= 0 ? 'bg-indigo-500 text-white' : 'bg-pink-500 text-white'}`}>
            <Scale size={20} />
          </div>
          <div>
            <h4 className={`text-xs font-semibold uppercase tracking-wider ${debtStats.balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-pink-600 dark:text-pink-400'}`}>
              {debtStats.balance >= 0 ? 'Net Borrowing Balance (+)' : 'Net Borrowing Deficit (-)'}
            </h4>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {debtStats.balance >= 0 ? '+' : '-'}{fmt(Math.abs(debtStats.balance))}
            </p>
          </div>
        </div>
      </div>

      {/* Record form */}
      <div className="lg:col-span-12 xl:col-span-5 glass-panel rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-white/60 dark:border-slate-800/30" id="record-friend-debt-box">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-400"><Users size={18} /></div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Record Loan Tab</h2>
            <p className="text-xs text-slate-400">Track cash swaps directly between friends</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" id="record-loan-form">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-2xl text-xs flex items-center gap-2">
              <HelpCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Lending Position</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setType('to_receive')}
                className={`py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border transition-all duration-200 ${type === 'to_receive' ? 'bg-emerald-500 border-emerald-400 text-white shadow-md' : 'border-white/40 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-400 hover:bg-white/65'}`}>
                <ArrowUpRight size={16} />Lent (Receiving)
              </button>
              <button type="button" onClick={() => setType('to_give')}
                className={`py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border transition-all duration-200 ${type === 'to_give' ? 'bg-rose-500 border-rose-450 text-white shadow-md' : 'border-white/40 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-400 hover:bg-white/65'}`}>
                <ArrowDownLeft size={16} />Borrowed (To Give)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Friend's / Contact's Name</label>
            <input type="text" value={personName} onChange={e => setPersonName(e.target.value)} placeholder="e.g. Alex Watson..."
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/8 focus:border-indigo-500 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all shadow-sm"
              maxLength={40} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Sum Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/8 focus:border-indigo-500 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all shadow-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar size={12} />Due Date <span className="font-normal normal-case tracking-normal opacity-60">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Calendar size={15} /></span>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/8 focus:border-indigo-500 text-slate-900 dark:text-white transition-all cursor-pointer shadow-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Description</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. birthday gift share, groceries split..."
              rows={2}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/8 focus:border-indigo-500 text-slate-900 dark:text-white placeholder:text-slate-400 resize-none transition-all shadow-sm"
              maxLength={200} />
          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2">
            <Plus size={18} />{isSubmitting ? 'Recording...' : 'Record Swaps Tab'}
          </button>
        </form>
      </div>

      {/* Register feed */}
      <div className="lg:col-span-12 xl:col-span-7 glass-panel rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-white/60 dark:border-slate-800/30 flex flex-col" id="friend-swaps-box">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-400"><TrendingDown size={18} /></div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white">Lending & Debts Register</h2>
              <p className="text-xs text-slate-400 font-medium">Settle fully or pay in multiple slots</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white/30 dark:bg-slate-900/40 border border-white/50 dark:border-slate-800 rounded-2xl p-1">
            {(['pending', 'resolved', 'all'] as const).map(s => (
              <button key={s} type="button" onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${statusFilter === s ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm font-black' : 'text-slate-400 dark:text-slate-500 hover:text-slate-800'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 max-h-[640px] overflow-y-auto pr-1 space-y-4" id="debts-listing-feed">
          {sortedDebts.length === 0 ? (
            <div className="text-center py-20 text-slate-400 flex flex-col items-center justify-center">
              <CheckCircle2 className="w-10 h-10 mb-2 opacity-30 text-emerald-500" />
              <p className="font-semibold text-sm">Perfect Balance!</p>
              <p className="text-xs mt-1 opacity-80">No active pending credits or debts under current filter.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {sortedDebts.map((d, index) => {
                const isToReceive = d.type === 'to_receive';
                const isPending = d.status === 'pending';
                const slots = d.settlements || [];
                const totalPaid = slots.reduce((s, sl) => s + sl.amount, 0);
                const remaining = Math.max(0, d.amount - totalPaid);
                const paidPct = d.amount > 0 ? Math.min(100, (totalPaid / d.amount) * 100) : 0;
                const hasSlots = slots.length > 0;
                const isHistoryOpen = historyOpenId === d.id;
                const isSlotFormOpen = slotOpenId === d.id;

                return (
                  <motion.div key={d.id}
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
                    className={`rounded-2xl border transition-all ${isPending ? 'bg-white/45 dark:bg-slate-900/30 border-white/55 dark:border-slate-800/10 shadow-sm' : 'bg-emerald-50/10 dark:bg-emerald-950/5 border-emerald-100/50 dark:border-emerald-900/20 opacity-70'}`}
                  >
                    {/* Main row */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-800 dark:text-white text-sm">{d.personName}</h4>
                            <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full ${isToReceive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200'}`}>
                              {isToReceive ? 'Owes Me' : 'I Owe'}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${isPending ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'}`}>
                              {isPending ? <Clock size={8} /> : <CheckCircle2 size={8} />}
                              {d.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{d.notes || 'No description added'}</p>
                          <div className="flex items-center gap-5 mt-1.5 text-[10px] text-slate-400 font-medium flex-wrap">
                            {d.dueDate && <span className="flex items-center gap-1"><Clock size={9} />Due: {d.dueDate}</span>}
                            <span>Since: {new Date(d.createdAt).toLocaleDateString('en-IN')}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="text-right">
                            <span className={`font-black text-sm ${isToReceive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                              {fmt(d.amount)}
                            </span>
                            {hasSlots && isPending && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Remaining: <span className="font-bold text-amber-600 dark:text-amber-400">{fmt(remaining)}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isPending && (
                              <>
                                <button type="button" onClick={() => isSlotFormOpen ? closeSlotForm() : openSlotForm(d.id)}
                                  title="Add Payment Slot"
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${isSlotFormOpen ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' : 'border-white/40 dark:border-slate-700 bg-white/50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-600'}`}>
                                  <SplitSquareHorizontal size={11} />Add Slot
                                </button>
                                <button type="button"
                                  onClick={() => { if (confirm(`Fully settle this tab with ${d.personName}?`)) onResolveDebt(d.id, true); }}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all">
                                  Full Settle
                                </button>
                              </>
                            )}
                            <button type="button"
                              onClick={() => { if (confirm('Delete this loan record permanently?')) onDeleteDebt(d.id); }}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-all">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar — shown when there are slots */}
                      {hasSlots && (
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1.5">
                            <span>Paid <span className="text-emerald-600 dark:text-emerald-400 font-bold">{fmt(totalPaid)}</span></span>
                            <span className="font-bold">{paidPct.toFixed(0)}% of {fmt(d.amount)}</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                              style={{ width: `${paidPct}%` }} />
                          </div>

                          {/* Toggle slot history */}
                          <button type="button" onClick={() => setHistoryOpenId(isHistoryOpen ? null : d.id)}
                            className="flex items-center gap-1 mt-2 text-[10px] font-bold text-indigo-500 dark:text-indigo-400 hover:underline">
                            {isHistoryOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            {slots.length} payment slot{slots.length !== 1 ? 's' : ''} · tap to {isHistoryOpen ? 'hide' : 'view'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Slot history timeline */}
                    <AnimatePresence>
                      {isHistoryOpen && hasSlots && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                          className="border-t border-white/40 dark:border-slate-800/50 overflow-hidden">
                          <div className="px-4 py-3 space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Payment History</p>
                            {[...slots].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                              .map((sl, i) => (
                                <div key={sl.createdAt} className="flex items-center gap-3 p-2.5 bg-white/40 dark:bg-slate-900/30 rounded-xl border border-white/50 dark:border-slate-800/30">
                                  <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-black flex-shrink-0">
                                    {i + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                      {sl.notes || `Slot ${i + 1}`}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{sl.date}</p>
                                  </div>
                                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                                    +{fmt(sl.amount)}
                                  </span>
                                </div>
                              ))
                            }
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Add slot form */}
                    <AnimatePresence>
                      {isSlotFormOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                          className="border-t border-indigo-100/60 dark:border-indigo-900/40 overflow-hidden">
                          <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/10">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                <SplitSquareHorizontal size={12} />Add Payment Slot
                              </p>
                              <button type="button" onClick={closeSlotForm} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                                <X size={14} />
                              </button>
                            </div>

                            {slotError && (
                              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl px-3 py-2 mb-3">
                                {slotError}
                              </p>
                            )}

                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Amount (₹)</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                                  <input type="number" step="0.01" value={slotAmount} onChange={e => setSlotAmount(e.target.value)}
                                    placeholder="0.00" autoFocus
                                    className="w-full pl-7 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Date</label>
                                <input type="date" value={slotDate} onChange={e => setSlotDate(e.target.value)}
                                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white transition-all cursor-pointer" />
                              </div>
                            </div>

                            <div className="mb-3">
                              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Notes (optional)</label>
                              <input type="text" value={slotNotes} onChange={e => setSlotNotes(e.target.value)}
                                placeholder="e.g. Paid via UPI, cash transfer..."
                                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
                                maxLength={100} />
                            </div>

                            <button type="button" onClick={() => handleAddSlot(d.id)} disabled={slotSubmitting}
                              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2">
                              <Plus size={13} />{slotSubmitting ? 'Saving...' : 'Save Payment Slot'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
