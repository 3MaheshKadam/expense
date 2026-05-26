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
  Calendar
} from 'lucide-react';
import { Debt } from '../types';

interface DebtTrackerProps {
  debts: Debt[];
  onCreateDebt: (type: 'to_give' | 'to_receive', personName: string, amount: number, notes?: string, dueDate?: string) => Promise<void>;
  onResolveDebt: (id: string, earnOrPay: boolean) => Promise<void>;
  onDeleteDebt: (id: string) => Promise<void>;
}

export default function DebtTracker({ debts, onCreateDebt, onResolveDebt, onDeleteDebt }: DebtTrackerProps) {
  // states
  const [personName, setPersonName] = useState('');
  const [type, setType] = useState<'to_give' | 'to_receive'>('to_receive');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('pending');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!personName.trim()) {
      setError('Please provide a contact person name.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive debt/credit amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateDebt(type, personName.trim(), parsedAmount, notes.trim() || undefined, dueDate || undefined);
      setPersonName('');
      setAmount('');
      setNotes('');
      setDueDate('');
    } catch (err) {
      setError('Failed to record debt. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const debtStats = useMemo(() => {
    const toGive = debts
      .filter(d => d.status === 'pending' && d.type === 'to_give')
      .reduce((sum, d) => sum + d.amount, 0);

    const toReceive = debts
      .filter(d => d.status === 'pending' && d.type === 'to_receive')
      .reduce((sum, d) => sum + d.amount, 0);

    return {
      toGive,
      toReceive,
      balance: toReceive - toGive
    };
  }, [debts]);

  const sortedDebts = useMemo(() => {
    return debts
      .filter(d => statusFilter === 'all' || d.status === statusFilter)
      .sort((a, b) => {
        // Pending first
        if (a.status !== b.status) {
          return a.status === 'pending' ? -1 : 1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [debts, statusFilter]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="debt-tracker-root">
      
      {/* Balances Board */}
      <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-6" id="debt-balances-board">
        <div className="p-5 bg-gradient-to-tr from-rose-500/10 to-rose-600/10 dark:from-rose-950/30 dark:to-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/50 flex items-center gap-4">
          <div className="p-3 bg-rose-500 rounded-xl text-white shadow-md shadow-rose-500/10">
            <ArrowDownLeft size={20} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Total I Owe (To Give)</h4>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">₹{debtStats.toGive.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-tr from-emerald-500/10 to-emerald-600/10 dark:from-emerald-950/30 dark:to-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-4">
          <div className="p-3 bg-emerald-500 rounded-xl text-white shadow-md shadow-emerald-500/10">
            <ArrowUpRight size={20} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Owed (To Receive)</h4>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">₹{debtStats.toReceive.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border flex items-center gap-4 ${
          debtStats.balance >= 0 
            ? 'bg-gradient-to-tr from-indigo-50/50 to-indigo-100/30 dark:from-indigo-950/30 dark:to-indigo-900/10 border-indigo-100 dark:border-indigo-900/50'
            : 'bg-gradient-to-tr from-rose-50 to-rose-100/30 dark:from-pink-950/30 dark:to-pink-900/10 border-rose-150 dark:border-rose-900/50'
        }`}>
          <div className={`p-3 rounded-xl shadow-md ${
            debtStats.balance >= 0 ? 'bg-indigo-505 bg-indigo-500 text-white' : 'bg-pink-500 text-white'
          }`}>
            <Scale size={20} />
          </div>
          <div>
            <h4 className={`text-xs font-semibold uppercase tracking-wider ${
              debtStats.balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-pink-600 dark:text-pink-400'
            }`}>
              {debtStats.balance >= 0 ? 'Net Borrowing Balance (+)' : 'Net Borrowing Deficit (-)'}
            </h4>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {debtStats.balance >= 0 ? '+' : '-'}₹{Math.abs(debtStats.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Record loan/borrow logs */}
      <div className="lg:col-span-12 xl:col-span-5 glass-panel rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-white/60 dark:border-slate-800/30" id="record-friend-debt-box">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-650 dark:text-indigo-400">
            <Users size={18} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Record Loan Tab</h2>
            <p className="text-xs text-slate-400 dark:text-slate-450">Track cash swaps directly between friends</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" id="record-loan-form">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-2xl text-xs flex items-center gap-2">
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type of Debt Option */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Lending Position
            </label>
            <div className="grid grid-cols-2 gap-2" id="debt-type-toggle">
              <button
                type="button"
                onClick={() => setType('to_receive')}
                className={`py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border transition-all duration-200 ${
                  type === 'to_receive'
                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-md'
                    : 'border-white/40 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-400 hover:bg-white/65'
                }`}
              >
                <ArrowUpRight size={16} />
                Lent (Receiving)
              </button>
              <button
                type="button"
                onClick={() => setType('to_give')}
                className={`py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border transition-all duration-200 ${
                  type === 'to_give'
                    ? 'bg-rose-500 border-rose-450 text-white shadow-md'
                    : 'border-white/40 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-400 hover:bg-white/65'
                }`}
              >
                <ArrowDownLeft size={16} />
                Borrowed (To Give)
              </button>
            </div>
          </div>

          {/* Person's contact Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Friend's/Contact's Name
            </label>
            <input
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="e.g. Alex Watson, Emma Watson..."
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/8 dark:focus:ring-indigo-500/15 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-sm"
              maxLength={40}
              id="debt-contact-input"
            />
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Sum Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/8 dark:focus:ring-indigo-500/15 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-sm"
                id="debt-amount-input"
              />
            </div>
          </div>

          {/* Due date input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar size={12} />
              Due Date <span className="font-normal normal-case tracking-normal opacity-60">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Calendar size={15} />
              </span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                autoComplete="off"
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/8 dark:focus:ring-indigo-500/15 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-white transition-all cursor-pointer shadow-sm"
                id="debt-due-date"
              />
            </div>
          </div>

          {/* Reason memo */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Lending Reasons / Description
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Details e.g. for birthday gift share, groceries split, concert ticket..."
              rows={2}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/8 dark:focus:ring-indigo-500/15 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none transition-all shadow-sm"
              maxLength={200}
              id="debt-reason-input"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            id="debt-submit-btn"
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm uppercase tracking-wider rounded-2xl shadow-xl hover:scale-101 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            {isSubmitting ? 'Recording Swaps...' : 'Record Swaps Tab'}
          </button>
        </form>
      </div>

      {/* Friends Swaps Register Feed list */}
      <div className="lg:col-span-12 xl:col-span-12 xl:col-span-7 glass-panel rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-white/60 dark:border-slate-800/30 flex flex-col" id="friend-swaps-box">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-650 dark:text-indigo-400">
              <TrendingDown size={18} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white">Lending & Debts Register</h2>
              <p className="text-xs text-slate-400 dark:text-slate-450 font-medium">Clear and reconcile peer liabilities</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white/30 dark:bg-slate-900/40 border border-white/50 dark:border-slate-800 rounded-2xl p-1" id="debt-status-filters">
            {(['pending', 'resolved', 'all'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm font-black'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-800'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 max-h-[500px] overflow-y-auto pr-2 space-y-3" id="debts-listing-feed">
          {sortedDebts.length === 0 ? (
            <div className="text-center py-20 text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center">
              <CheckCircle2 className="w-10 h-10 mb-2 opacity-30 text-emerald-500" />
              <p className="font-semibold text-sm">Perfect Balance!</p>
              <p className="text-xs mt-1 opacity-80">You have no active pending credits or debts under filters.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {sortedDebts.map((d, index) => {
                const isToReceive = d.type === 'to_receive';
                const isPending = d.status === 'pending';
                
                return (
                  <motion.div
                    key={d.id}
                    id={`debt-item-${d.id}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
                    className={`p-4 rounded-2xl border transition-all ${
                      isPending 
                        ? 'bg-white/45 dark:bg-slate-900/30 border-white/55 dark:border-slate-800/10 hover:bg-white/70 dark:hover:bg-slate-900/50 shadow-sm' 
                        : 'bg-emerald-50/10 dark:bg-emerald-950/5 border-emerald-100/50 dark:border-emerald-900/20 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate">
                            {d.personName}
                          </h4>
                          <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            isToReceive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-450 border border-rose-200'
                          }`}>
                            {isToReceive ? 'Owes Me' : 'I Owe'}
                          </span>

                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            isPending
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                          }`}>
                            {isPending ? <Clock size={8} /> : <CheckCircle2 size={8} />}
                            {d.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                          {d.notes || 'No description added'}
                        </p>

                        <div className="flex items-center gap-8 mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {d.dueDate && (
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              Due: {d.dueDate}
                            </span>
                          )}
                          <span>Recorded: {new Date(d.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 flex-shrink-0">
                        <span className={`font-black text-sm ${isToReceive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                          ₹{d.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>

                        <div className="flex items-center gap-1.5" id={`actions-debt-${d.id}`}>
                          {isPending && (
                            <button
                              onClick={() => {
                                if (confirm(`Settle this tab with ${d.personName}? Click OK to also record a matching cash transaction in the ledger, or Cancel to abort.`)) {
                                  onResolveDebt(d.id, true);
                                }
                              }}
                              id={`btn-settle-${d.id}`}
                              type="button"
                              className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all"
                              title="Mark as Settled"
                            >
                              Settle Tab
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm('Delete this loan tab record permanently?')) {
                                onDeleteDebt(d.id);
                              }
                            }}
                            id={`btn-del-debt-${d.id}`}
                            type="button"
                            className="p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-4000 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
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
