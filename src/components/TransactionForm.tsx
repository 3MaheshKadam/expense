import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Search, ArrowUpRight, ArrowDownLeft, Calendar, HelpCircle, DollarSign, Filter, Users } from 'lucide-react';
import { Category, Transaction } from '../types';
import DynamicIcon from './DynamicIcon';

interface TransactionFormProps {
  categories: Category[];
  transactions: Transaction[];
  onCreateTransaction: (amount: number, type: 'incoming' | 'outgoing', categoryId: string, notes: string, date: string, friendName?: string) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
}

export default function TransactionForm({ categories, transactions, onCreateTransaction, onDeleteTransaction }: TransactionFormProps) {
  // Form values
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'incoming' | 'outgoing'>('outgoing');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [friendName, setFriendName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [datePreset, setDatePreset] = useState('all');
  const [customN, setCustomN] = useState(1);
  const [customUnit, setCustomUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('weeks');

  // Categorize for UI selector grouping
  const categorizedForDropdown = useMemo(() => {
    const groups: Record<string, Category[]> = {
      expense: [],
      income: [],
      savings: [],
      friend: [],
    };
    categories.forEach(cat => {
      if (groups[cat.type]) {
        groups[cat.type].push(cat);
      }
    });
    return groups;
  }, [categories]);

  // Handle selected category changing (auto-preset the type or detect if friend category is selected)
  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    const selected = categories.find(c => c.id === catId);
    if (selected) {
      // Auto toggle matching flow type
      if (selected.type === 'income') {
        setType('incoming');
      } else if (selected.type === 'expense' || selected.type === 'savings') {
        setType('outgoing');
      }
      // If categories is not "friend", reset friendName
      if (selected.type !== 'friend') {
        setFriendName('');
      }
    }
  };

  const isFriendCategorySelected = useMemo(() => {
    const selected = categories.find(c => c.id === categoryId);
    return selected?.type === 'friend';
  }, [categoryId, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please provide a valid transaction amount greater than ₹0.');
      return;
    }

    if (!categoryId) {
      setError('Please select a valid budget category.');
      return;
    }

    if (!date) {
      setError('Please select a valid transaction date.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateTransaction(
        parsedAmount,
        type,
        categoryId,
        notes.trim(),
        date,
        isFriendCategorySelected ? friendName.trim() : undefined
      );

      // Reset Form fields
      setAmount('');
      setNotes('');
      setFriendName('');
    } catch (err) {
      setError('Failed to record transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const PRESETS = [
    { key: 'all',   label: 'All Time' },
    { key: 'today', label: 'Today' },
    { key: 'month', label: 'This Month' },
    { key: 'year',  label: 'This Year' },
    { key: 'custom', label: 'Custom' },
  ];

  function istToday(): Date {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const getDateRangeStart = (): Date | null => {
    const d = istToday();
    if (datePreset === 'all') return null;
    if (datePreset === 'today') return d;
    if (datePreset === 'month') { d.setDate(1); return d; }
    if (datePreset === 'year') { d.setMonth(0); d.setDate(1); return d; }
    if (datePreset === 'custom') {
      if (customUnit === 'days')   { d.setDate(d.getDate() - (customN - 1)); return d; }
      if (customUnit === 'weeks')  { d.setDate(d.getDate() - customN * 7 + 1); return d; }
      if (customUnit === 'months') { d.setMonth(d.getMonth() - customN + 1); d.setDate(1); return d; }
      if (customUnit === 'years')  { d.setFullYear(d.getFullYear() - customN + 1); d.setMonth(0); d.setDate(1); return d; }
    }
    return null;
  };

  // Filtered transactions for the scrollable history ledger
  const filteredTransactions = useMemo(() => {
    const rangeStart = getDateRangeStart();
    return transactions
      .filter(t => {
        const matchesSearch =
          t.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.friendName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          categories.find(c => c.id === t.categoryId)?.name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = filterCategory === 'all' || t.categoryId === filterCategory;

        const matchesDate = !rangeStart || new Date(t.date) >= rangeStart;

        return matchesSearch && matchesCategory && matchesDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, filterCategory, datePreset, customN, customUnit, categories]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in" id="transaction-manager-root">
      {/* Record a Inflow/Outflow */}
      <div className="lg:col-span-12 xl:col-span-5 glass-panel rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-white/60 dark:border-slate-800/30" id="record-transaction-box">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <DynamicIcon name="DollarSign" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Record Transaction</h2>
            <p className="text-xs text-slate-400 dark:text-slate-450">Log and book any expenses, savings, or peer incomes</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" id="transaction-booking-form">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-2xl text-xs flex items-center gap-2">
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-base font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/8 dark:focus:ring-indigo-500/15 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-sm"
                id="transaction-amount-field"
              />
            </div>
          </div>

          {/* Incoming vs Outgoing toggler */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Flow Direction
            </label>
            <div className="grid grid-cols-2 gap-2" id="transaction-type-selector">
              <button
                type="button"
                onClick={() => setType('outgoing')}
                className={`py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border transition-all duration-200 ${
                  type === 'outgoing'
                    ? 'bg-amber-500 border-amber-400 text-white shadow-md shadow-amber-500/10'
                    : 'border-white/40 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-400 hover:bg-white/65'
                }`}
              >
                <ArrowDownLeft size={16} />
                Outgoing (Pay)
              </button>
              <button
                type="button"
                onClick={() => setType('incoming')}
                className={`py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border transition-all duration-200 ${
                  type === 'incoming'
                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/10'
                    : 'border-white/40 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-400 hover:bg-white/65'
                }`}
              >
                <ArrowUpRight size={16} />
                Incoming (Earn)
              </button>
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Budget Category Link
            </label>
            <select
              value={categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/8 dark:focus:ring-indigo-500/15 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-white transition-all cursor-pointer shadow-sm"
              id="transaction-category-dropdown"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">-- Choose Category --</option>
              {categorizedForDropdown.income.length > 0 && (
                <optgroup label="Income Streams" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                  {categorizedForDropdown.income.map(cat => (
                    <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">{cat.name}</option>
                  ))}
                </optgroup>
              )}
              {categorizedForDropdown.expense.length > 0 && (
                <optgroup label="Core Expenses" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                  {categorizedForDropdown.expense.map(cat => (
                    <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">{cat.name}</option>
                  ))}
                </optgroup>
              )}
              {categorizedForDropdown.savings.length > 0 && (
                <optgroup label="Savings Allocations" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                  {categorizedForDropdown.savings.map(cat => (
                    <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">{cat.name}</option>
                  ))}
                </optgroup>
              )}
              {categorizedForDropdown.friend.length > 0 && (
                <optgroup label="Friend Settlements & Lending" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                  {categorizedForDropdown.friend.map(cat => (
                    <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">{cat.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Conditional Friend field */}
          <AnimatePresence>
            {isFriendCategorySelected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Friend Involved
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Users size={16} />
                  </span>
                  <input
                    type="text"
                    value={friendName}
                    onChange={(e) => setFriendName(e.target.value)}
                    placeholder="e.g. Alex Watson, Sophia Rivers"
                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/8 dark:focus:ring-indigo-500/15 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-sm"
                    maxLength={50}
                    id="transaction-friend-field"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transaction Date */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Book Date
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Calendar size={16} />
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/8 dark:focus:ring-indigo-500/15 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-white transition-all cursor-pointer shadow-sm"
                id="transaction-date-field"
              />
            </div>
          </div>

          {/* Memos/Memos */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Memo Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide a short transaction description..."
              rows={2}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/8 dark:focus:ring-indigo-500/15 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none transition-all shadow-sm"
              maxLength={200}
              id="transaction-memo-field"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            id="transaction-submit-btn"
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:scale-101 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            {isSubmitting ? 'Booking Event...' : 'Book Ledger Event'}
          </button>
        </form>
      </div>

      {/* Database Registry Ledger logs */}
      <div className="lg:col-span-12 xl:col-span-7 glass-panel rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-white/60 dark:border-slate-800/30" id="transaction-history-box">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <DynamicIcon name="Clock" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white">Transaction Ledger</h2>
              <p className="text-xs text-slate-400 dark:text-slate-450">Search and review historic ledger feeds</p>
            </div>
          </div>
        </div>

        {/* Date Range Filters */}
        <div className="mb-4 space-y-2" id="ledger-date-filters">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setDatePreset(key)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  datePreset === key
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-white/40 dark:bg-slate-900/40 border border-white/60 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-white/70'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Last</span>
              <input
                type="number"
                min={1}
                max={999}
                value={customN}
                onChange={e => setCustomN(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-center text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={customUnit}
                onChange={e => setCustomUnit(e.target.value as typeof customUnit)}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
          )}
        </div>

        {/* Filters and search grids */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6" id="ledger-filters-ribbon">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search memo, friend, category..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/40 dark:bg-slate-900/50 border border-white/60 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-440 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
              id="ledger-search-input"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/40 dark:bg-slate-900/50 border border-white/60 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm"
              id="ledger-cat-filter"
            >
              <option value="all">Filter: All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* List scroll block */}
        <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3" id="transaction-ledger-feed">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-20 text-slate-400 dark:text-slate-550 flex flex-col items-center justify-center">
              <Search className="w-10 h-10 mb-2 opacity-30" />
              <p className="font-medium text-sm">No recorded ledger events fit filters.</p>
              <p className="text-xs mt-1 opacity-80">Log your first inflows/outflows using the builder pane!</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filteredTransactions.map((t, index) => {
                const cat = categories.find(c => c.id === t.categoryId);
                const isIncoming = t.type === 'incoming';
                
                return (
                  <motion.div
                    key={t.id}
                    id={`t-item-${t.id}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
                    className="flex items-center justify-between p-4 bg-white/40 dark:bg-slate-900/30 rounded-2xl border border-white/55 dark:border-slate-800/10 transition-all hover:bg-white/70 dark:hover:bg-slate-900/50 shadow-sm"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Icon bubble */}
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: cat?.color || '#94a3b8' }}
                      >
                        <DynamicIcon name={cat?.icon || 'DollarSign'} className="text-white" />
                      </div>
                      <div className="min-w-0 leading-tight">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">
                            {cat ? cat.name : 'Unknown budget channel'}
                          </h4>
                          {t.friendName && (
                            <span className="inline-flex items-center gap-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              <Users size={10} />
                              {t.friendName}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-450 dark:text-slate-500 mt-1 truncate">
                          {t.notes || 'No description added'}
                        </p>
                        <span className="text-[9px] font-mono font-medium text-slate-400 dark:text-slate-550 block mt-1">
                          {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <span className={`font-bold text-sm ${isIncoming ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {isIncoming ? '+' : '-'}₹{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={() => {
                          if (confirm('Permanently remove this transaction log from records?')) {
                            onDeleteTransaction(t.id);
                          }
                        }}
                        id={`btn-del-tx-${t.id}`}
                        type="button"
                        className="p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
                        title="Delete log"
                      >
                        <Trash2 size={13} />
                      </button>
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
