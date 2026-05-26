/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  FolderKanban, 
  LogOut, 
  LayoutDashboard, 
  ReceiptText, 
  PiggyBank, 
  FileText, 
  ShieldCheck, 
  HelpCircle,
  TrendingUp,
  Coins,
  Sparkles,
  ArrowRightLeft,
  ArrowUpRight
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  setDoc,
  doc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  getDocFromServer,
  updateDoc
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { db, auth, isPlaceholderConfig, handleFirestoreError, OperationType } from './firebase';
import { Category, Transaction, Debt, CategoryType, Investment, Period } from './types';
import { INITIAL_CATEGORIES, INITIAL_TRANSACTIONS, INITIAL_DEBTS } from './mockData';
import MetricCards from './components/MetricCards';
import CategoryManager from './components/CategoryManager';
import TransactionForm from './components/TransactionForm';
import DebtTracker from './components/DebtTracker';
import InvestmentTracker from './components/InvestmentTracker';
import AnalyticsPanel from './components/AnalyticsPanel';
import ThemeToggle from './components/ThemeToggle';
import DynamicIcon from './components/DynamicIcon';

type ActiveTab = 'dashboard' | 'ledger' | 'debts' | 'categories' | 'investments';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Period filter (shared across MetricCards + AnalyticsPanel)
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(() => {
    const now = new Date();
    return { type: 'month', year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  // Local/Firestore States
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [walletBalance, setWalletBalanceState] = useState<number>(() => {
    const saved = localStorage.getItem('etc_wallet_balance');
    return saved ? parseFloat(saved) : 0;
  });
  const [cashBalance, setCashBalanceState] = useState<number>(() => {
    const saved = localStorage.getItem('etc_cash_balance');
    return saved ? parseFloat(saved) : 0;
  });

  // Local Storage Utilities for Mock/Demo accounts
  const getLocalData = (key: string, fallback: any) => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (err) {
        return fallback;
      }
    }
    return fallback;
  };

  const saveLocalData = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // Sync Global Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('etc_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme ? savedTheme === 'dark' : systemPrefersDark;
    setIsDarkMode(shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const newVal = !isDarkMode;
    setIsDarkMode(newVal);
    localStorage.setItem('etc_theme', newVal ? 'dark' : 'light');
  };

  // Auth Handler on start
  useEffect(() => {
    if (isPlaceholderConfig) {
      // Missing Firebase credentials, prompt demo mode
      setIsDemoMode(true);
      setLoading(false);
    } else {
      // Setup dynamic connection validator as mandated
      const validateDB = async () => {
        try {
          await getDocFromServer(doc(db, 'test', 'connection'));
        } catch (error) {
          if (error instanceof Error && error.message.includes('offline')) {
            console.warn('Firebase seems to be offline. Gracefully falling back to cached queries.');
          }
        }
      };
      validateDB();

      const unsubscribe = auth.onAuthStateChanged((u) => {
        if (u) {
          setUser(u);
          setIsDemoMode(false);
        } else {
          setUser(null);
          // If logged out and not configuring, let user decide to join demo
        }
        setLoading(false);
      });
      return unsubscribe;
    }
  }, []);

  // Sync data streams based on auth and demo profiles
  useEffect(() => {
    const currentUserId = user ? user.uid : 'local-demo-user';

    if (isDemoMode || !user) {
      // 1. OFFLINE DEMO MODE SYNC (LocalStorage)
      const cachedCats = getLocalData(`etc_cats_${currentUserId}`, null);
      const cachedTxs = getLocalData(`etc_txs_${currentUserId}`, null);
      const cachedDebts = getLocalData(`etc_debts_${currentUserId}`, null);

      if (cachedCats && cachedCats.length > 0) {
        // Back-fill any missing default category types (e.g. savings) for existing users
        const hasSavings = cachedCats.some((c: Category) => c.type === 'savings');
        if (!hasSavings) {
          const savingsDefaults = INITIAL_CATEGORIES(currentUserId).filter(c => c.type === 'savings');
          const merged = [...cachedCats, ...savingsDefaults];
          setCategories(merged);
          saveLocalData(`etc_cats_${currentUserId}`, merged);
        } else {
          setCategories(cachedCats);
        }
      } else {
        const standard = INITIAL_CATEGORIES(currentUserId);
        setCategories(standard);
        saveLocalData(`etc_cats_${currentUserId}`, standard);
      }

      if (cachedTxs) {
        setTransactions(cachedTxs);
      } else {
        const standard = INITIAL_TRANSACTIONS(currentUserId);
        setTransactions(standard);
        saveLocalData(`etc_txs_${currentUserId}`, standard);
      }

      if (cachedDebts) {
        setDebts(cachedDebts);
      } else {
        const standard = INITIAL_DEBTS(currentUserId);
        setDebts(standard);
        saveLocalData(`etc_debts_${currentUserId}`, standard);
      }

      const cachedInvestments = getLocalData(`etc_investments_${currentUserId}`, null);
      setInvestments(cachedInvestments ?? []);
    } else {
      // 2. FIRESTORE REAL-TIME MODE SYNC
      setLoading(true);

      // Listen to Categories
      const catQuery = query(collection(db, 'categories'), where('userId', '==', user.uid));
      const unsubscribeCat = onSnapshot(catQuery, (snap) => {
        const items: Category[] = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() } as Category));
        
        if (items.length === 0) {
          // Seed all defaults for brand new users
          const standard = INITIAL_CATEGORIES(user.uid);
          standard.forEach(async (c) => {
            try {
              await setDoc(doc(db, 'categories', c.id), c);
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, `categories/${c.id}`);
            }
          });
        } else {
          // Back-fill savings categories for existing users who have none
          const hasSavings = items.some(c => c.type === 'savings');
          if (!hasSavings) {
            const savingsDefaults = INITIAL_CATEGORIES(user.uid).filter(c => c.type === 'savings');
            savingsDefaults.forEach(async (c) => {
              try {
                await setDoc(doc(db, 'categories', c.id), c);
              } catch (err) {
                handleFirestoreError(err, OperationType.CREATE, `categories/${c.id}`);
              }
            });
          } else {
            setCategories(items);
          }
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'categories');
      });

      // Listen to Transactions
      const txQuery = query(collection(db, 'transactions'), where('userId', '==', user.uid));
      const unsubscribeTx = onSnapshot(txQuery, (snap) => {
        const items: Transaction[] = [];
        snap.forEach(d => {
          const raw = d.data();
          items.push({ 
            id: d.id, 
            ...raw,
            // Convert server timestamps to string format safely
            createdAt: raw.createdAt?.seconds 
              ? new Date(raw.createdAt.seconds * 1000).toISOString() 
              : raw.createdAt 
          } as Transaction);
        });
        setTransactions(items);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'transactions');
      });

      // Listen to Debts
      const debtQuery = query(collection(db, 'debts'), where('userId', '==', user.uid));
      const unsubscribeDebt = onSnapshot(debtQuery, (snap) => {
        const items: Debt[] = [];
        snap.forEach(d => {
          const raw = d.data();
          items.push({ 
            id: d.id, 
            ...raw,
            createdAt: raw.createdAt?.seconds 
              ? new Date(raw.createdAt.seconds * 1000).toISOString() 
              : raw.createdAt 
          } as Debt);
        });
        setDebts(items);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'debts');
      });

      // Listen to Investments
      const investQuery = query(collection(db, 'investments'), where('userId', '==', user.uid));
      const unsubscribeInvest = onSnapshot(investQuery, (snap) => {
        const items: Investment[] = [];
        snap.forEach(d => {
          const raw = d.data();
          items.push({
            id: d.id,
            ...raw,
            createdAt: raw.createdAt?.seconds
              ? new Date(raw.createdAt.seconds * 1000).toISOString()
              : raw.createdAt,
          } as Investment);
        });
        setInvestments(items);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'investments');
      });

      setLoading(false);

      return () => {
        unsubscribeCat();
        unsubscribeTx();
        unsubscribeDebt();
        unsubscribeInvest();
      };
    }
  }, [user, isDemoMode]);

  // Auth Operations
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setIsDemoMode(false);
    } catch (err) {
      console.error('Core Signin Error: ', err);
      alert('Authentication failed to complete. Please try sandbox mode instead!');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsDemoMode(true); // Return to standard sandbox
    } catch (err) {
      console.error('Signout Error: ', err);
    }
  };

  const handleSetWalletBalance = (amount: number) => {
    setWalletBalanceState(amount);
    localStorage.setItem('etc_wallet_balance', String(amount));
  };

  const handleSetCashBalance = (amount: number) => {
    setCashBalanceState(amount);
    localStorage.setItem('etc_cash_balance', String(amount));
  };

  // --- BUSINESS LOGIC CRUD WRAPPERS ---

  // Category CRUD
  const handleCreateCategory = async (name: string, type: CategoryType, icon: string, color: string) => {
    const currentUserId = user ? user.uid : 'local-demo-user';
    const id = `cat-${Date.now()}`;
    const newCat: Category = { id, name, type, icon, color, userId: currentUserId };

    if (isDemoMode) {
      const revised = [...categories, newCat];
      setCategories(revised);
      saveLocalData(`etc_cats_${currentUserId}`, revised);
    } else {
      try {
        await setDoc(doc(db, 'categories', id), newCat);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `categories/${id}`);
      }
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const currentUserId = user ? user.uid : 'local-demo-user';

    if (isDemoMode) {
      const revisedCats = categories.filter(c => c.id !== id);
      setCategories(revisedCats);
      saveLocalData(`etc_cats_${currentUserId}`, revisedCats);
    } else {
      try {
        await deleteDoc(doc(db, 'categories', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
      }
    }
  };

  // Transaction CRUD
  const handleCreateTransaction = async (
    amount: number,
    type: 'incoming' | 'outgoing',
    categoryId: string,
    notes: string,
    date: string,
    friendName?: string,
    paymentMethod: 'cash' | 'online' = 'online'
  ) => {
    const currentUserId = user ? user.uid : 'local-demo-user';
    const id = `t-${Date.now()}`;

    const newTx: any = {
      id,
      userId: currentUserId,
      amount,
      type,
      categoryId,
      date,
      paymentMethod,
    };
    if (notes) newTx.notes = notes;
    if (friendName) newTx.friendName = friendName;

    if (isDemoMode) {
      newTx.createdAt = new Date().toISOString();
      const revised = [newTx, ...transactions];
      setTransactions(revised);
      saveLocalData(`etc_txs_${currentUserId}`, revised);
    } else {
      try {
        newTx.createdAt = serverTimestamp();
        await setDoc(doc(db, 'transactions', id), newTx);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `transactions/${id}`);
      }
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const currentUserId = user ? user.uid : 'local-demo-user';

    if (isDemoMode) {
      const revised = transactions.filter(t => t.id !== id);
      setTransactions(revised);
      saveLocalData(`etc_txs_${currentUserId}`, revised);
    } else {
      try {
        await deleteDoc(doc(db, 'transactions', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `transactions/${id}`);
      }
    }
  };

  const handleEditTransaction = async (
    id: string,
    amount: number,
    type: 'incoming' | 'outgoing',
    categoryId: string,
    notes: string,
    date: string,
    friendName?: string,
    paymentMethod: 'cash' | 'online' = 'online'
  ) => {
    const currentUserId = user ? user.uid : 'local-demo-user';
    const existing = transactions.find(t => t.id === id);
    if (!existing) return;

    const updated: any = {
      ...existing,
      amount,
      type,
      categoryId,
      notes: notes || '',
      date,
      paymentMethod,
      friendName: friendName || '',
    };
    if (!updated.friendName) delete updated.friendName;
    if (!updated.notes) delete updated.notes;

    if (isDemoMode) {
      const revised = transactions.map(t => t.id === id ? updated : t);
      setTransactions(revised);
      saveLocalData(`etc_txs_${currentUserId}`, revised);
    } else {
      try {
        const { createdAt, ...rest } = updated;
        await setDoc(doc(db, 'transactions', id), { ...rest, createdAt: existing.createdAt });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `transactions/${id}`);
      }
    }
  };

  // Debts and Lending CRUD
  const handleCreateDebt = async (
    type: 'to_give' | 'to_receive', 
    personName: string, 
    amount: number, 
    notes?: string, 
    dueDate?: string
  ) => {
    const currentUserId = user ? user.uid : 'local-demo-user';
    const id = `debt-${Date.now()}`;

    const newDebt: any = {
      id,
      userId: currentUserId,
      type,
      personName,
      amount,
      status: 'pending',
    };
    if (notes) newDebt.notes = notes;
    if (dueDate) newDebt.dueDate = dueDate;

    if (isDemoMode) {
      newDebt.createdAt = new Date().toISOString();
      const revised = [newDebt, ...debts];
      setDebts(revised);
      saveLocalData(`etc_debts_${currentUserId}`, revised);
    } else {
      try {
        newDebt.createdAt = serverTimestamp();
        await setDoc(doc(db, 'debts', id), newDebt);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `debts/${id}`);
      }
    }
  };

  const handleResolveDebt = async (id: string, earnOrPay: boolean) => {
    const currentUserId = user ? user.uid : 'local-demo-user';
    const target = debts.find(d => d.id === id);
    if (!target) return;

    if (isDemoMode) {
      const revised = debts.map(d => d.id === id ? { ...d, status: 'resolved' as const } : d);
      setDebts(revised);
      saveLocalData(`etc_debts_${currentUserId}`, revised);
    } else {
      try {
        await updateDoc(doc(db, 'debts', id), { status: 'resolved' });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `debts/${id}`);
      }
    }

    // Auto record matching cash transition if requested
    if (earnOrPay) {
      // Find matching friend category
      const friendCat = categories.find(c => c.type === 'friend') || categories[0];
      if (friendCat) {
        await handleCreateTransaction(
          target.amount,
          target.type === 'to_receive' ? 'incoming' : 'outgoing',
          friendCat.id,
          `Reconciled tab balance with ${target.personName}. Reason: ${target.notes || 'Reconciliation'}`,
          new Date().toISOString().split('T')[0],
          target.personName
        );
      }
    }
  };

  const handleDeleteDebt = async (id: string) => {
    const currentUserId = user ? user.uid : 'local-demo-user';

    if (isDemoMode) {
      const revised = debts.filter(d => d.id !== id);
      setDebts(revised);
      saveLocalData(`etc_debts_${currentUserId}`, revised);
    } else {
      try {
        await deleteDoc(doc(db, 'debts', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `debts/${id}`);
      }
    }
  };

  // Investment CRUD
  const handleCreateInvestment = async (
    name: string,
    principal: number,
    expectedReturn: number,
    startDate: string,
    maturityDate: string,
    notes?: string
  ) => {
    const currentUserId = user ? user.uid : 'local-demo-user';
    const id = `inv-${Date.now()}`;
    const newInv: any = {
      id, userId: currentUserId, name, principal, expectedReturn,
      startDate, maturityDate, status: 'active',
    };
    if (notes) newInv.notes = notes;

    if (isDemoMode) {
      newInv.createdAt = new Date().toISOString();
      const revised = [newInv, ...investments];
      setInvestments(revised);
      saveLocalData(`etc_investments_${currentUserId}`, revised);
    } else {
      try {
        newInv.createdAt = serverTimestamp();
        await setDoc(doc(db, 'investments', id), newInv);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `investments/${id}`);
      }
    }
  };

  const handleConfirmInvestment = async (id: string) => {
    const currentUserId = user ? user.uid : 'local-demo-user';
    const inv = investments.find(i => i.id === id);
    if (!inv) return;

    const today = new Date().toISOString().split('T')[0];

    // Book the return as an incoming transaction
    const incomeCat = categories.find(c => c.type === 'income') || categories[0];
    if (incomeCat) {
      await handleCreateTransaction(
        inv.expectedReturn,
        'incoming',
        incomeCat.id,
        `Investment return: ${inv.name}`,
        today,
        undefined,
        'online'
      );
    }

    // Mark investment as confirmed
    if (isDemoMode) {
      const revised = investments.map(i =>
        i.id === id ? { ...i, status: 'confirmed' as const, confirmedAt: today } : i
      );
      setInvestments(revised);
      saveLocalData(`etc_investments_${currentUserId}`, revised);
    } else {
      try {
        await updateDoc(doc(db, 'investments', id), { status: 'confirmed', confirmedAt: today });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `investments/${id}`);
      }
    }
  };

  const handleDeleteInvestment = async (id: string) => {
    const currentUserId = user ? user.uid : 'local-demo-user';

    if (isDemoMode) {
      const revised = investments.filter(i => i.id !== id);
      setInvestments(revised);
      saveLocalData(`etc_investments_${currentUserId}`, revised);
    } else {
      try {
        await deleteDoc(doc(db, 'investments', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `investments/${id}`);
      }
    }
  };

  // Period-filtered transactions (for AnalyticsPanel + MetricCards Cards 2 & 3)
  const periodTransactions = useMemo(() => {
    if (selectedPeriod.type === 'all') return transactions;
    const prefix = `${selectedPeriod.year}-${String(selectedPeriod.month).padStart(2, '0')}`;
    return transactions.filter(t => t.date.startsWith(prefix));
  }, [transactions, selectedPeriod]);

  // Recent transactions helper for Quick view on front panel
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#FAF9F6] dark:bg-slate-900 transition-colors duration-[400ms]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">
            Reconciling Ledgers...
          </p>
        </div>
      </div>
    );
  }

  // GREETING LANDING ACCOUNT GATE
  if (!user && !isDemoMode) {
    return (
      <div className={`min-h-screen relative flex items-center justify-center p-6 overflow-hidden transition-colors duration-[400ms] ${
        isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-[#F5F5F0] text-slate-800'
      }`}>
        {/* Dynamic Refractive Bubbles behind the Glass Pane */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[10%] left-[10%] w-[350px] h-[350px] bg-indigo-500/20 dark:bg-indigo-600/15 rounded-full filter blur-[100px] animate-blob" />
          <div className="absolute bottom-[10%] right-[10%] w-[380px] h-[380px] bg-purple-500/20 dark:bg-purple-600/15 rounded-full filter blur-[110px] animate-blob animation-delay-2000" />
        </div>

        <div className="relative z-10 w-full max-w-lg glass-card rounded-[40px] p-8 shadow-[0_25px_60px_rgba(0,0,0,0.04)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.25)] flex flex-col items-center text-center overflow-hidden">
          
          <div className="absolute top-4 right-4 z-50">
            <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
          </div>

          {/* Visual vector emblem */}
          <div className="w-20 h-20 bg-indigo-600 dark:bg-indigo-500 rounded-3xl flex items-center justify-center text-white mb-6 shadow-2xl shadow-indigo-500/20 rotate-3">
            <Coins size={36} className="animate-bounce-slow" />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Spendly.
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium max-w-sm">
            Budget smarter, track loans with friends in real-time, and monitor monthly financial reports.
          </p>

          <div className="w-full space-y-3.5 my-8 text-left border-y border-white/40 dark:border-slate-800/40 py-6" id="features-highlights">
            <div className="flex items-start gap-3.5">
              <span className="p-1.5 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                <FolderKanban size={16} />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">Category Forge</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Define custom expense/income categories, choose vibrant colors, and dynamic icons.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3.5">
              <span className="p-1.5 bg-rose-500/10 rounded-xl text-rose-600 dark:text-rose-400">
                <Users size={16} />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">Friend Swaps Tab</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Track what you owe friends or what they owe you, and reconcile balances with one click.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <span className="p-1.5 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                <LayoutDashboard size={16} />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">Spending Analytics</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Visualize cash inflows, outgoing patterns, and savings progression with direct charts.</p>
              </div>
            </div>
          </div>

          <div className="w-full space-y-3" id="landing-button-group">
            {isPlaceholderConfig ? (
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 text-[11px] rounded-2xl border border-white/50 dark:border-white/5 text-center leading-relaxed backdrop-blur-md">
                <span className="font-extrabold flex items-center justify-center gap-1.5 mb-1 text-indigo-950 dark:text-indigo-300">
                  <ShieldCheck size={14} />
                  Offline Sandbox Mode Active
                </span>
                AI Studio Firebase setup is ongoing. You can start managing records using the offline sandbox simulator right now.
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                type="button"
                id="landing-btn-google"
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/10 cursor-pointer hover:scale-[1.01] transition-all duration-200"
              >
                Sign In with Google
              </button>
            )}
            
            <button
              onClick={() => setIsDemoMode(true)}
              type="button"
              id="landing-btn-sandbox"
              className="w-full py-4 bg-white/45 hover:bg-white/70 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 text-slate-600 dark:text-slate-300 border border-white/55 dark:border-slate-800 font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 shadow-sm"
            >
              Enter Offline Sandbox
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative flex flex-col font-sans transition-colors duration-[400ms] overflow-hidden ${
      isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-[#F5F5F0] text-slate-800'
    }`} id="main-frame-root">
      
      {/* Background Animated Blobs for realistic Frosted Glass refraction */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[5%] left-[10%] w-[350px] h-[350px] bg-indigo-500/15 dark:bg-indigo-600/10 rounded-full filter blur-[100px] opacity-60 dark:opacity-20 animate-blob" />
        <div className="absolute top-[45%] right-[5%] w-[400px] h-[400px] bg-purple-500/15 dark:bg-purple-600/10 rounded-full filter blur-[110px] opacity-60 dark:opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute bottom-[5%] left-[20%] w-[380px] h-[380px] bg-emerald-500/10 dark:bg-emerald-600/10 rounded-full filter blur-[100px] opacity-50 dark:opacity-15 animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 flex-grow flex flex-col w-full">
        {/* GLOBAL SANDBOX / PROVISIONED STATUS CHIP */}
        {isPlaceholderConfig && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-bold py-2 px-4 shadow-sm flex items-center justify-between z-50 overflow-hidden relative">
            <div className="flex items-center gap-2 mx-auto">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>Running in offline Sandbox Demo Mode. Click &quot;Authorize Firebase&quot; in AI Studio workspace to synchronise on-cloud database.</span>
            </div>
          </div>
        )}

        {/* HEADER NAV CONTAINER */}
        <header className="sticky top-0 z-40 glass-header shadow-[0_2px_20px_rgba(0,0,0,0.02)] px-6 py-4 flex items-center justify-between" id="app-landing-header">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl shadow-md rotate-2">
              <Coins size={18} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
                Spendly.
                {isDemoMode && (
                  <span className="bg-white/50 border border-white/60 dark:bg-slate-900/40 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    Demo
                  </span>
                )}
              </h1>
              {user && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Logged as: {user.email}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
            
            {user ? (
              <button
                onClick={handleSignOut}
                id="header-btn-logout"
                type="button"
                className="p-2 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-white/40 dark:hover:bg-slate-900 rounded-xl transition"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            ) : (
              !isPlaceholderConfig && (
                <button
                  onClick={handleGoogleSignIn}
                  id="header-btn-login"
                  type="button"
                  className="px-3.5 py-2 bg-indigo-50/50 border border-indigo-200/50 dark:bg-indigo-950/30 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-100 transition"
                >
                  Sign In
                </button>
              )
            )}
          </div>
        </header>

        {/* DASHBOARD CONTAINER BODY */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-8" id="scrolling-stage">

          {/* TABS SELECT NAVIGATION BAR — desktop only */}
          <div className="hidden md:flex items-center gap-1.5 glass-panel p-1.5 rounded-3xl shadow-[0_15px_35px_rgba(0,0,0,0.03)] mb-8 overflow-x-auto scroller-none" id="dashboard-navbar">
            <button
              onClick={() => setActiveTab('dashboard')}
              id="nav-tab-dashboard"
              type="button"
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-xl shadow-indigo-500/10'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/30'
              }`}
            >
              <LayoutDashboard size={14} />
              Overview Dashboard
            </button>
            
            <button
              onClick={() => setActiveTab('ledger')}
              id="nav-tab-ledger"
              type="button"
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'ledger'
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-xl shadow-indigo-500/10'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/30'
              }`}
            >
              <ReceiptText size={14} />
              Book Ledger Log
            </button>

            <button
              onClick={() => setActiveTab('debts')}
              id="nav-tab-debts"
              type="button"
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'debts'
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-xl shadow-indigo-500/10'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/30'
              }`}
            >
              <ArrowRightLeft size={14} />
              Borrow & Debt Register
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              id="nav-tab-categories"
              type="button"
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'categories'
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-xl shadow-indigo-500/10'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/30'
              }`}
            >
              <FolderKanban size={14} />
              Manage Categories
            </button>

            <button
              onClick={() => setActiveTab('investments')}
              id="nav-tab-investments"
              type="button"
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'investments'
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-xl shadow-indigo-500/10'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-900/30'
              }`}
            >
              <TrendingUp size={14} />
              Investments
            </button>
          </div>

          {/* METRICS TOP BOARD — always visible on desktop; mobile shows only on dashboard */}
          <div className={activeTab !== 'dashboard' ? 'hidden md:block' : ''}>
            <MetricCards
              transactions={transactions}
              periodTransactions={periodTransactions}
              debts={debts}
              categories={categories}
              isDarkMode={isDarkMode}
              walletBalance={walletBalance}
              onSetWalletBalance={handleSetWalletBalance}
              cashBalance={cashBalance}
              onSetCashBalance={handleSetCashBalance}
              compact={activeTab !== 'dashboard'}
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
            />
          </div>

          {/* INTERACTIVE COMPONENT SWITCH DESKTOP-CENTRIC */}
          <div className="mt-4" id="app-routing-viewport">
            {activeTab === 'dashboard' && (
              <div className="space-y-8" id="viewport-dashboard">
                {/* Analytics report */}
                <AnalyticsPanel categories={categories} transactions={periodTransactions} debts={debts} />
                
                {/* Recent actions grid below */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="dashboard-recent-actions">
                  <div className="lg:col-span-12 glass-panel rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-white/60 dark:border-slate-800/30">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                          <ArrowUpRight size={16} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 dark:text-white text-base">Recent Ledger Entries</h4>
                          <p className="text-xs text-slate-400 dark:text-slate-450">Quick review of the last 5 registered cash splits</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setActiveTab('ledger')}
                        id="dashboard-btn-full-ledger"
                        type="button"
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        View Full Ledger &rarr;
                      </button>
                    </div>

                    <div className="space-y-2.5" id="dashboard-recent-txs-feed">
                      {recentTransactions.length === 0 ? (
                        <div className="py-10 text-center text-slate-400">
                          <p className="text-xs font-medium">No registered events. Log an outflow or income stream in the Log tab.</p>
                        </div>
                      ) : (
                        recentTransactions.map((t) => {
                          const cat = categories.find(c => c.id === t.categoryId);
                          const isIncoming = t.type === 'incoming';
                          return (
                            <div key={t.id} className="flex items-center justify-between p-4 bg-white/40 dark:bg-slate-900/30 rounded-2xl border border-white/50 dark:border-slate-800/20 hover:bg-white/80 dark:hover:bg-slate-900/50 transition-all duration-150 shadow-sm">
                              <div className="flex items-center gap-3 min-w-0">
                                <div 
                                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs shadow-sm"
                                  style={{ backgroundColor: cat?.color || '#94a3b8' }}
                                >
                                  <DynamicIcon name={cat?.icon || 'DollarSign'} size={15} />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate block">{cat?.name || 'Unassigned channel'}</span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-450 truncate block mt-0.5">{t.notes || 'No notes added'}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 flex-shrink-0">
                                <span className="text-[10px] text-slate-400 font-semibold font-mono">{t.date}</span>
                                <span className={`font-bold text-sm ${isIncoming ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                  {isIncoming ? '+' : '-'}₹{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ledger' && (
              <TransactionForm
                categories={categories}
                transactions={transactions}
                onCreateTransaction={handleCreateTransaction}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
              />
            )}

            {activeTab === 'debts' && (
              <DebtTracker 
                debts={debts} 
                onCreateDebt={handleCreateDebt} 
                onResolveDebt={handleResolveDebt} 
                onDeleteDebt={handleDeleteDebt} 
              />
            )}

            {activeTab === 'categories' && (
              <CategoryManager
                categories={categories}
                onCreateCategory={handleCreateCategory}
                onDeleteCategory={handleDeleteCategory}
              />
            )}

            {activeTab === 'investments' && (
              <InvestmentTracker
                investments={investments}
                onCreateInvestment={handleCreateInvestment}
                onConfirmInvestment={handleConfirmInvestment}
                onDeleteInvestment={handleDeleteInvestment}
              />
            )}
          </div>
        </main>

        {/* FOOTER ADHERENCE LINE — desktop only */}
        <footer className="hidden md:block mt-8 py-6 text-center text-[10px] text-slate-400 dark:text-slate-500 bg-white/20 dark:bg-slate-950/10 border-t border-white/30 dark:border-slate-900" id="app-footer-brand">
          <p className="font-medium">Spendly. &copy; {new Date().getFullYear()} &bull; Synced with Enterprise Firebase Database securely</p>
        </footer>

        {/* MOBILE BOTTOM NAV BAR — floating pill with sliding indicator */}
        {(() => {
          const bottomTabs: { tab: ActiveTab; icon: any; label: string }[] = [
            { tab: 'dashboard',   icon: LayoutDashboard, label: 'Home'   },
            { tab: 'ledger',      icon: ReceiptText,      label: 'Ledger' },
            { tab: 'debts',       icon: ArrowRightLeft,   label: 'Debts'  },
            { tab: 'investments', icon: TrendingUp,       label: 'Invest' },
            { tab: 'categories',  icon: FolderKanban,     label: 'More'   },
          ];
          const activeIndex = bottomTabs.findIndex(t => t.tab === activeTab);
          return (
            <nav
              id="mobile-bottom-nav"
              className="md:hidden fixed left-3 right-3 z-50 flex items-center bg-white/88 dark:bg-slate-900/92 backdrop-blur-2xl rounded-[28px] border border-white/70 dark:border-slate-700/40 shadow-[0_10px_44px_rgba(0,0,0,0.16),0_2px_10px_rgba(0,0,0,0.07)] overflow-hidden"
              style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom)', padding: '6px' }}
            >
              {/* Sliding background pill */}
              <div
                className="absolute top-[6px] bottom-[6px] rounded-[20px] bg-indigo-600 dark:bg-indigo-500 shadow-[0_4px_16px_rgba(99,102,241,0.45)]"
                style={{
                  width: 'calc(20% - 3px)',
                  left: `calc(${activeIndex} * 20% + 1.5px)`,
                  transition: 'left 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
                  willChange: 'left',
                }}
              />

              {/* Tab buttons */}
              {bottomTabs.map(({ tab, icon: Icon, label }) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    title={label}
                    onClick={() => setActiveTab(tab)}
                    className="relative z-10 flex items-center justify-center flex-1 py-2.5 active:scale-95 transition-transform duration-150"
                  >
                    <Icon
                      size={21}
                      strokeWidth={active ? 2.5 : 1.7}
                      className={`transition-colors duration-[400ms] ${active ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}
                    />
                  </button>
                );
              })}
            </nav>
          );
        })()}
      </div>
    </div>
  );
}
