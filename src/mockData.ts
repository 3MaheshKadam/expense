import { Category, Transaction, Debt } from './types';

export const INITIAL_CATEGORIES = (userId: string): Category[] => [
  { id: 'cat-income-salary',     name: 'Salary',         type: 'income',   icon: 'Briefcase',  color: '#10b981', userId },
  { id: 'cat-income-freelance',  name: 'Freelance',      type: 'income',   icon: 'TrendingUp', color: '#06b6d4', userId },
  { id: 'cat-income-other',      name: 'Other Income',   type: 'income',   icon: 'ArrowDownLeft', color: '#84cc16', userId },
  { id: 'cat-expense-food',      name: 'Food & Dining',  type: 'expense',  icon: 'Utensils',   color: '#f97316', userId },
  { id: 'cat-expense-home',      name: 'Home & Rent',    type: 'expense',  icon: 'Home',       color: '#ef4444', userId },
  { id: 'cat-expense-transport', name: 'Transport',      type: 'expense',  icon: 'Car',        color: '#3b82f6', userId },
  { id: 'cat-expense-shopping',  name: 'Shopping',       type: 'expense',  icon: 'Sparkles',   color: '#8b5cf6', userId },
  { id: 'cat-expense-other',     name: 'Other Expense',  type: 'expense',  icon: 'ArrowUpRight', color: '#64748b', userId },
  { id: 'cat-savings-emergency', name: 'Emergency Fund', type: 'savings',  icon: 'PiggyBank',  color: '#10b981', userId },
  { id: 'cat-savings-bank',      name: 'Bank Savings',   type: 'savings',  icon: 'Scale',      color: '#22c55e', userId },
  { id: 'cat-friend-general',    name: 'Friends',        type: 'friend',   icon: 'Users',      color: '#6366f1', userId },
];

export const INITIAL_TRANSACTIONS = (_userId: string): Transaction[] => [];

export const INITIAL_DEBTS = (_userId: string): Debt[] => [];
