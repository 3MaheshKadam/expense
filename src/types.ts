export type CategoryType = 'expense' | 'income' | 'savings' | 'friend';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string; // Lucide icon identifier
  color: string; // CSS or Tailwind color
  userId: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'incoming' | 'outgoing';
  categoryId: string;
  notes?: string;
  date: string; // ISO date string (YYYY-MM-DD)
  friendName?: string;
  paymentMethod?: 'cash' | 'online';
  createdAt: string; // string timestamp
}

export interface Debt {
  id: string;
  userId: string;
  type: 'to_give' | 'to_receive';
  personName: string;
  amount: number;
  notes?: string;
  dueDate?: string; // ISO date string or empty
  status: 'pending' | 'resolved';
  createdAt: string; // string timestamp
  resolvedAt?: string; // set when debt is settled — used for month-based reporting
}

export type Period = { type: 'month'; year: number; month: number } | { type: 'all' };

export interface BudgetStatus {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  netWorth: number;
}

export interface Investment {
  id: string;
  userId: string;
  name: string;
  principal: number;
  expectedReturn: number;
  startDate: string;
  maturityDate: string;
  status: 'active' | 'confirmed';
  notes?: string;
  createdAt: string;
  confirmedAt?: string;
}
