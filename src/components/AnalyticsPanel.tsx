import { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  TrendingUp, 
  PiggyBank, 
  PieChart as PieIcon, 
  Users, 
  AlertCircle 
} from 'lucide-react';
import { Category, Transaction, Debt } from '../types';

interface AnalyticsPanelProps {
  categories: Category[];
  transactions: Transaction[];
  debts: debts[];
}

type debts = Debt;

export default function AnalyticsPanel({ categories, transactions, debts }: AnalyticsPanelProps) {
  
  // 1. Spending allocation by Category (for outgoing Type transactions)
  const categorySpendingData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'outgoing');
    const categoryTotals: Record<string, { name: string; value: number; color: string }> = {};

    expenses.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const catId = t.categoryId;
      const catName = cat ? cat.name : 'Other / Unassigned';
      const catColor = cat ? cat.color : '#94a3b8';

      if (!categoryTotals[catId]) {
        categoryTotals[catId] = { name: catName, value: 0, color: catColor };
      }
      categoryTotals[catId].value += t.amount;
    });

    return Object.values(categoryTotals).sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  // 2. Timeline chart: Inflow vs Outflow trended
  const dailyCashflowData = useMemo(() => {
    const dailyTotals: Record<string, { date: string; Inflow: number; Outflow: number }> = {};
    
    // Get last 15 days or unique dates sorted
    transactions.forEach(t => {
      const dateKey = t.date; // "YYYY-MM-DD"
      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = { date: dateKey, Inflow: 0, Outflow: 0 };
      }
      if (t.type === 'incoming') {
        dailyTotals[dateKey].Inflow += t.amount;
      } else {
        dailyTotals[dateKey].Outflow += t.amount;
      }
    });

    return Object.values(dailyTotals)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10); // Display trending for recent 10 active days
  }, [transactions]);

  // 3. Savings allocations
  const savingsAllocationData = useMemo(() => {
    // Filter categories that are savings type
    const savingsCats = categories.filter(c => c.type === 'savings');
    return savingsCats.map(cat => {
      // Sum outgoing transfers to this savings category
      const totalAmount = transactions
        .filter(t => t.categoryId === cat.id)
        .reduce((sum, t) => sum + t.amount, 0);
      
      return {
        name: cat.name,
        amount: totalAmount,
        color: cat.color
      };
    }).filter(item => item.amount > 0);
  }, [categories, transactions]);

  const totalSavings = useMemo(() => {
    return savingsAllocationData.reduce((sum, s) => sum + s.amount, 0);
  }, [savingsAllocationData]);

  // 4. Friend balances Bar data
  const friendsBalancesData = useMemo(() => {
    const pendingDebts = debts.filter(d => d.status === 'pending');
    const friendTotals: Record<string, { name: string; balance: number }> = {};

    pendingDebts.forEach(d => {
      const name = d.personName;
      if (!friendTotals[name]) {
        friendTotals[name] = { name, balance: 0 };
      }
      // if it's "to_receive" (friend owes me), it's + balance
      // if it's "to_give" (I owe friend), it's - balance
      if (d.type === 'to_receive') {
        friendTotals[name].balance += d.amount;
      } else {
        friendTotals[name].balance -= d.amount;
      }
    });

    return Object.values(friendTotals).sort((a, b) => b.balance - a.balance);
  }, [debts]);

  // Dynamic custom Tooltip render
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card border border-white/60 dark:border-slate-800/40 p-4 rounded-2xl shadow-lg backdrop-blur-md">
          {label && <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 font-mono">{label}</p>}
          {payload.map((item: any, i: number) => (
            <p key={i} className="text-sm font-semibold flex items-center gap-2" style={{ color: item.color || item.payload.color || '#6366f1' }}>
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color || item.payload.color || '#6366f1' }} />
              {item.name}: <span className="font-bold text-slate-800 dark:text-white">₹{item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in" id="analytics-panel-root">
      
      {/* 1. Cash Inflow vs Outflow trending */}
      <div className="glass-panel rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-white/60 dark:border-slate-800/30" id="cashflow-trend-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-500/10 rounded-2xl text-indigo-505 dark:text-indigo-400">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Active Cashflow Balance</h3>
            <p className="text-xs text-slate-400 dark:text-slate-450 font-medium">Trending ledger events (Revenue vs. Outgoings)</p>
          </div>
        </div>

        <div className="h-[300px]" id="cashflow-chart-container">
          {dailyCashflowData.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              <AlertCircle className="w-8 h-8 opacity-40 mb-2" />
              <p className="text-xs">Insufficient transaction data to graph timelines.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyCashflowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                  </linearGradient>
                  <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/50" horizontal={true} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Area type="monotone" dataKey="Inflow" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorInflow)" name="Cash Inflow" />
                <Area type="monotone" dataKey="Outflow" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorOutflow)" name="Cash Outflow" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 2. Monthly Outgoing Categories spending breakdown */}
      <div className="glass-panel rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-white/60 dark:border-slate-800/30" id="spending-allocation-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-500/10 rounded-2xl text-indigo-500">
            <PieIcon size={18} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Channel Outflow Allocation</h3>
            <p className="text-xs text-slate-400 dark:text-slate-450 font-medium">Relative spending ratios by category channels</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 h-[300px]" id="spending-pie-container">
          {categorySpendingData.length === 0 ? (
            <div className="sm:col-span-12 flex flex-col items-center justify-center text-slate-400">
              <AlertCircle className="w-8 h-8 opacity-40 mb-2" />
              <p className="text-xs">No recorded expense transactions exists yet to chart.</p>
            </div>
          ) : (
            <>
              {/* Pie Graphic */}
              <div className="sm:col-span-7 h-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomTooltip />} />
                    <Pie
                      data={categorySpendingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categorySpendingData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} stroke={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Value overlay at center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Total Spent</span>
                  <span className="text-base font-black text-slate-800 dark:text-white">
                    ₹{categorySpendingData.reduce((sum, e) => sum + e.value, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* Labels list */}
              <div className="sm:col-span-5 flex flex-col justify-center overflow-y-auto max-h-full pr-1 space-y-2.5">
                {categorySpendingData.slice(0, 5).map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs">
                    <span className="w-3 h-3 rounded-md flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-600 dark:text-slate-300 font-medium truncate flex-1">{entry.name}</span>
                    <span className="font-bold text-slate-800 dark:text-white">₹{entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
                {categorySpendingData.length > 5 && (
                  <span className="text-[10px] text-center font-bold text-indigo-500 dark:text-indigo-400">+ {categorySpendingData.length - 5} other categories</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Savings Allocations progression */}
      <div className="glass-panel rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-white/60 dark:border-slate-800/30" id="savings-progress-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-rose-500/10 rounded-2xl text-rose-500">
            <PiggyBank size={18} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Savings Target Allocations</h3>
            <p className="text-xs text-slate-400 dark:text-slate-450 font-medium">Growth of active assets & investment canisters</p>
          </div>
        </div>

        <div className="h-[250px] flex flex-col justify-center" id="savings-progress-container">
          {savingsAllocationData.length === 0 ? (
            <div className="w-full text-center text-slate-400 py-10">
              <AlertCircle className="w-8 h-8 opacity-40 mx-auto mb-2" />
              <p className="text-xs">No registered deposits to savings categories.</p>
              <p className="text-[10px] mt-1">Design a &apos;savings&apos; type category and log outgoing transfers to fill it.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Saved This Month</span>
                <span className="text-2xl font-black text-rose-500 dark:text-rose-400">₹{totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Progress bars stack */}
              <div className="space-y-3.5 pr-1 max-h-[160px] overflow-y-auto">
                {savingsAllocationData.map((item, idx) => {
                  const percentage = totalSavings > 0 ? (item.amount / totalSavings) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-600 dark:text-slate-300">{item.name}</span>
                        <span className="text-slate-800 dark:text-white font-bold">₹{item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-50 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%`, backgroundColor: item.color }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Friends balance reconciliation bar graph */}
      <div className="glass-panel rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-white/60 dark:border-slate-800/30" id="friends-reconcile-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-500/10 rounded-2xl text-indigo-500">
            <Users size={18} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Peer Loan Ledger</h3>
            <p className="text-xs text-slate-400 dark:text-slate-450 font-semibold font-medium">Credits (+) vs. payables (-) by friends</p>
          </div>
        </div>

        <div className="h-[250px]" id="friends-reconcile-container">
          {friendsBalancesData.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              <Users className="w-8 h-8 opacity-40 mb-2" />
              <p className="text-xs">No active pending friend balances tracked.</p>
              <p className="text-[10px] mt-1">Borrow or lend cash using the Friends swaps tab!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={friendsBalancesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/50" horizontal={true} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                {/* Color columns based on credit/debit levels */}
                <Bar dataKey="balance" name="Outstanding Balance" radius={[6, 6, 0, 0]}>
                  {friendsBalancesData.map((entry, idx) => {
                    const barColor = entry.balance >= 0 ? '#10b981' : '#f43f5e'; // Green for credit, Rose for owes
                    return <Cell key={`cell-${idx}`} fill={barColor} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
}
