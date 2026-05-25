import { useMemo } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  PiggyBank, 
  ArrowRightLeft, 
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Transaction, Debt } from '../types';

interface MetricCardsProps {
  transactions: Transaction[];
  debts: Debt[];
  isDarkMode?: boolean;
}

export default function MetricCards({ transactions, debts, isDarkMode }: MetricCardsProps) {
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    
    transactions.forEach(t => {
      if (t.type === 'incoming') {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });

    const pendingToGive = debts
      .filter(d => d.status === 'pending' && d.type === 'to_give')
      .reduce((sum, d) => sum + d.amount, 0);

    const pendingToReceive = debts
      .filter(d => d.status === 'pending' && d.type === 'to_receive')
      .reduce((sum, d) => sum + d.amount, 0);

    const cashFlow = income - expense;

    return {
      income,
      expense,
      pendingToGive,
      pendingToReceive,
      cashFlow
    };
  }, [transactions, debts]);

  const cards = [
    {
      id: 'net-cashflow',
      title: 'Net Cashflow Balance',
      value: stats.cashFlow,
      description: 'Total revenue minus paid outgoings',
      icon: TrendingUp,
      bgColor: 'bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 dark:from-indigo-950/40 dark:to-indigo-900/10',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      shadowColor: 'shadow-indigo-500/10 dark:shadow-indigo-950/20',
      borderClass: 'border-l-4 border-indigo-500',
    },
    {
      id: 'total-income',
      title: 'Total Monthly Inflow',
      value: stats.income,
      description: 'Salary, consulting, gifts, gig earnings',
      icon: ArrowUpRight,
      bgColor: 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 dark:from-emerald-950/40 dark:to-emerald-900/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      shadowColor: 'shadow-emerald-500/10 dark:shadow-emerald-950/20',
      borderClass: 'border-l-4 border-emerald-500',
    },
    {
      id: 'total-outgoing',
      title: 'Total Monthly Outflow',
      value: stats.expense,
      description: 'Living costs, dining, rent, shopping',
      icon: ArrowDownLeft,
      bgColor: 'bg-gradient-to-br from-amber-500/10 to-amber-600/10 dark:from-amber-950/40 dark:to-amber-900/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
      shadowColor: 'shadow-amber-500/10 dark:shadow-amber-950/20',
      borderClass: 'border-l-4 border-amber-500',
    },
    {
      id: 'debts-credits',
      title: 'Friend Balances & Tab',
      value: stats.pendingToReceive - stats.pendingToGive,
      valuePrefix: stats.pendingToReceive - stats.pendingToGive >= 0 ? '+' : '',
      description: `Friend owes: ₹${stats.pendingToReceive} / You owe: ₹${stats.pendingToGive}`,
      icon: ArrowRightLeft,
      bgColor: stats.pendingToReceive - stats.pendingToGive >= 0 
        ? 'bg-gradient-to-br from-purple-500/10 to-purple-600/10 dark:from-purple-950/40 dark:to-purple-900/10'
        : 'bg-gradient-to-br from-rose-500/10 to-rose-600/10 dark:from-rose-950/40 dark:to-rose-900/10',
      iconColor: stats.pendingToReceive - stats.pendingToGive >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-rose-600 dark:text-rose-400',
      shadowColor: 'shadow-purple-500/10',
      borderClass: stats.pendingToReceive - stats.pendingToGive >= 0 ? 'border-l-4 border-purple-500' : 'border-l-4 border-rose-500',
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" id="dashboard-metric-cards">
      {cards.map(card => {
        const Icon = card.icon;
        const isNegative = card.value < 0;
        const absoluteValue = Math.abs(card.value);
        
        return (
          <div 
            key={card.id} 
            id={`card-${card.id}`}
            className={`relative overflow-hidden glass-card rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_55px_rgba(0,0,0,0.15)] border border-white/60 dark:border-slate-800/40 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_25px_60px_rgba(0,0,0,0.06)]`}
          >
            {/* Visual background ambient color glows, supporting Frosted refraction */}
            <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full filter blur-[40px] opacity-25 dark:opacity-20 pointer-events-none ${
              card.id === 'net-cashflow' ? 'bg-indigo-500' : 
              card.id === 'total-income' ? 'bg-emerald-500' : 
              card.id === 'total-outgoing' ? 'bg-amber-500' : 'bg-purple-500'
            }`} />

            <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.04] dark:opacity-[0.08]">
              <Icon size={120} className={card.iconColor} />
            </div>

            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {card.title}
                </p>
                <h3 className="text-3xl font-extrabold font-sans mt-2.5 tracking-tight text-slate-900 dark:text-white" style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                  {card.valuePrefix !== undefined ? card.valuePrefix : (isNegative ? '-' : '')}
                  ₹{absoluteValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
              <div className={`p-3 rounded-2xl bg-white/60 dark:bg-slate-900/50 shadow-sm border border-white/80 dark:border-slate-800/30 ${card.iconColor}`}>
                <Icon size={18} />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 relative z-10 font-medium">
              <span>{card.description}</span>
              {(card.id === 'debts-credits' && (stats.pendingToGive > 0 || stats.pendingToReceive > 0)) && (
                <span className="flex items-center gap-1 font-bold text-purple-650 dark:text-purple-400">
                  <AlertCircle size={12} />
                  Active Balance
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
