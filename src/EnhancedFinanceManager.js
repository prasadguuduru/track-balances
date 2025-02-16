// src/EnhancedFinanceManager.js
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth0 } from '@auth0/auth0-react';
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function EnhancedFinanceManager() {
  const { logout, isAuthenticated, isLoading } = useAuth0();

  // Data state management
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories] = useState([
    'Housing',
    'Transportation',
    'Food',
    'Utilities',
    'Healthcare',
    'Entertainment',
    'Shopping',
    'Other',
  ]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('account'); // "account" or "transaction"
  const [editingItem, setEditingItem] = useState(null);
  const [projectionScenario, setProjectionScenario] = useState('current');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [timeframe, setTimeframe] = useState('6m');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteType, setDeleteType] = useState(null);

  // Sorting and pagination for Accounts widget (left section)
  const [acctSortField, setAcctSortField] = useState('name'); // "name", "type", "balance"
  const [acctSortOrder, setAcctSortOrder] = useState('asc'); // "asc" or "desc"
  const [acctCurrentPage, setAcctCurrentPage] = useState(1);
  const acctPageSize = 3;

  // Sorting and pagination for Recent Transactions (bottom section)
  const [transSortField, setTransSortField] = useState('date'); // "date", "account", "category", "amount"
  const [transSortOrder, setTransSortOrder] = useState('desc'); // "asc" or "desc"
  const [transCurrentPage, setTransCurrentPage] = useState(1);
  const transPageSize = 5;

  // Initialization flag
  const [initialized, setInitialized] = useState(false);

  // Helper: Calculate months difference between two dates
  const monthsDifference = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  };

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const storedAccounts = localStorage.getItem('finance_accounts');
      const storedTransactions = localStorage.getItem('finance_transactions');
      const loadedAccounts = storedAccounts ? JSON.parse(storedAccounts) : [];
      const loadedTransactions = storedTransactions ? JSON.parse(storedTransactions) : [];
      setAccounts(loadedAccounts);
      setTransactions(loadedTransactions);
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      setAccounts([]);
      setTransactions([]);
    } finally {
      setInitialized(true);
    }
  }, []);

  // Persist data after initialization
  useEffect(() => {
    if (initialized) {
      localStorage.setItem('finance_accounts', JSON.stringify(accounts));
      localStorage.setItem('finance_transactions', JSON.stringify(transactions));
    }
  }, [accounts, transactions, initialized]);

  // Sync data across tabs
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'finance_accounts') {
        try {
          const newAccounts = event.newValue ? JSON.parse(event.newValue) : [];
          setAccounts(newAccounts);
        } catch (err) {
          console.error('Error parsing accounts from storage event:', err);
        }
      }
      if (event.key === 'finance_transactions') {
        try {
          const newTransactions = event.newValue ? JSON.parse(event.newValue) : [];
          setTransactions(newTransactions);
        } catch (err) {
          console.error('Error parsing transactions from storage event:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Calculate account balance (with APR compounding for credit accounts)
  const calculateBalance = (accountId, date = new Date()) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return 0;
    const relevantTransactions = transactions.filter(
      (t) => t.accountId === accountId && new Date(t.date) <= date
    );
    let balance = relevantTransactions.reduce(
      (sum, t) => sum + (t.type === 'credit' ? Number(t.amount) : -Number(t.amount)),
      0
    );
    if (account.accountType === 'credit' && balance > 0 && account.apr) {
      const months =
        relevantTransactions.length > 0
          ? monthsDifference(new Date(Math.min(...relevantTransactions.map((t) => new Date(t.date)))), date)
          : 0;
      const monthlyRate = Number(account.apr) / 100 / 12;
      balance = balance * Math.pow(1 + monthlyRate, months);
    }
    return balance;
  };

  // Calculate credit utilization percentage
  const calculateCreditUtilization = () => {
    const creditAccounts = accounts.filter((a) => a.accountType === 'credit');
    const totalLimit = creditAccounts.reduce((sum, account) => sum + Number(account.limit || 0), 0);
    if (totalLimit === 0) return 0;
    const totalUsed = creditAccounts.reduce(
      (sum, account) => sum + Math.max(0, calculateBalance(account.id)),
      0
    );
    return (totalUsed / totalLimit) * 100;
  };

  // Debt Projection Calculations
  const calculateProjections = (scenario = 'current') => {
    const months = timeframe === '6m' ? 6 : timeframe === '1y' ? 12 : 24;
    const monthLabels = Array.from({ length: months + 1 }, (_, i) =>
      i === 0 ? 'Current' : `Month ${i}`
    );
    const relevantAccounts = accounts.filter(
      (account) =>
        (selectedAccount === 'all' || account.id === selectedAccount) &&
        account.accountType === 'credit' &&
        calculateBalance(account.id) > 0
    );
    return monthLabels.map((label, monthIndex) => {
      let projectedBalance = 0;
      let totalInterest = 0;
      let minimumPayment = 0;
      let additionalPayment = 0;
      relevantAccounts.forEach((account) => {
        let currentBalance = calculateBalance(account.id);
        const monthlyRate = Number(account.apr) / 100 / 12;
        const baseMinPayment = Math.max(currentBalance * 0.02, 25);
        let monthlyPayment = baseMinPayment;
        if (scenario === 'aggressive') {
          monthlyPayment = Math.max(baseMinPayment, currentBalance * 0.1);
        } else if (scenario === 'optimal') {
          monthlyPayment = Math.max(baseMinPayment, currentBalance * 0.05);
        }
        for (let i = 0; i < monthIndex; i++) {
          const interest = currentBalance * monthlyRate;
          totalInterest += interest;
          currentBalance += interest - monthlyPayment;
          if (currentBalance < 0) currentBalance = 0;
        }
        projectedBalance += currentBalance;
        minimumPayment += baseMinPayment;
        additionalPayment += monthlyPayment - baseMinPayment;
      });
      return {
        month: label,
        balance: projectedBalance,
        interest: totalInterest,
        minimumPayment,
        additionalPayment,
        totalPayment: minimumPayment + additionalPayment,
      };
    });
  };

  // Save handlers
  const handleSaveAccount = () => {
    if (!editingItem?.name) return;
    const account = {
      id: editingItem.id || Date.now().toString(),
      name: editingItem.name,
      accountType: editingItem.accountType || 'debit',
      limit: Number(editingItem.limit) || 0,
      apr: Number(editingItem.apr) || 0,
    };
    setAccounts((prev) =>
      editingItem.id ? prev.map((a) => (a.id === account.id ? account : a)) : [...prev, account]
    );
    setShowForm(false);
    setEditingItem(null);
  };

  const handleSaveTransaction = () => {
    if (!editingItem?.accountId || !editingItem?.amount) return;
    const transaction = {
      id: editingItem.id || Date.now().toString(),
      accountId: editingItem.accountId,
      amount: Number(editingItem.amount),
      type: editingItem.type || 'debit',
      category: editingItem.category || 'Other',
      date: editingItem.date || new Date().toISOString(),
      details: editingItem.details || '',
    };
    setTransactions((prev) => {
      const newTransactions = editingItem.id
        ? prev.map((t) => (t.id === transaction.id ? transaction : t))
        : [...prev, transaction];
      return newTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    });
    setShowForm(false);
    setEditingItem(null);
  };

  // Delete handlers
  const initiateDelete = (type, id) => {
    setDeleteType(type);
    setDeleteItem(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = () => {
    if (deleteType === 'account') {
      setTransactions((prev) => prev.filter((t) => t.accountId !== deleteItem));
      setAccounts((prev) => prev.filter((a) => a.id !== deleteItem));
    } else if (deleteType === 'transaction') {
      setTransactions((prev) => prev.filter((t) => t.id !== deleteItem));
    }
    setShowDeleteConfirm(false);
    setDeleteItem(null);
    setDeleteType(null);
  };

  // Accounts sorting & pagination
  const sortedAccounts = [...accounts].sort((a, b) => {
    let cmp = 0;
    if (acctSortField === 'name') {
      cmp = a.name.localeCompare(b.name);
    } else if (acctSortField === 'type') {
      cmp = a.accountType.localeCompare(b.accountType);
    } else if (acctSortField === 'balance') {
      cmp = calculateBalance(b.id) - calculateBalance(a.id);
    }
    return acctSortOrder === 'asc' ? cmp : -cmp;
  });
  const totalAcctPages = Math.ceil(sortedAccounts.length / acctPageSize);
  const paginatedAccounts = sortedAccounts.slice(
    (acctCurrentPage - 1) * acctPageSize,
    acctCurrentPage * acctPageSize
  );
  const toggleAcctSort = (field) => {
    if (acctSortField === field) {
      setAcctSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setAcctSortField(field);
      setAcctSortOrder('asc');
    }
    setAcctCurrentPage(1);
  };

  // Transactions sorting & pagination
  const sortedTransactions = [...transactions].sort((a, b) => {
    let compare = 0;
    if (transSortField === 'date') {
      compare = new Date(b.date) - new Date(a.date);
    } else if (transSortField === 'account') {
      const accountA = accounts.find((acc) => acc.id === a.accountId)?.name || '';
      const accountB = accounts.find((acc) => acc.id === b.accountId)?.name || '';
      compare = accountA.localeCompare(accountB);
    } else if (transSortField === 'category') {
      compare = (a.details || a.category || '').localeCompare(b.details || b.category || '');
    } else if (transSortField === 'amount') {
      compare = Number(b.amount) - Number(a.amount);
    }
    return transSortOrder === 'asc' ? -compare : compare;
  });
  const totalTransPages = Math.ceil(sortedTransactions.length / transPageSize);
  const paginatedTransactions = sortedTransactions.slice(
    (transCurrentPage - 1) * transPageSize,
    transCurrentPage * transPageSize
  );
  const toggleTransSort = (field) => {
    if (transSortField === field) {
      setTransSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTransSortField(field);
      setTransSortOrder('asc');
    }
    setTransCurrentPage(1);
  };

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in.</div>;

  return (
    <div className="h-screen bg-[#F0F8FF] text-black flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">TrackBalances</h1>
          <button
            onClick={() => logout({ returnTo: window.location.origin })}
            className="px-4 py-2 rounded bg-[#4A154B] hover:bg-[#5A1B60] text-white"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Top Section: Two-Column Layout (70% of screen) */}
      <div className="flex flex-1 min-h-0">
        {/* Left Column: Summary Cards, Action Buttons & Accounts Widget */}
        <div className="w-1/2 p-4 flex flex-col min-h-0">
          {/* Summary Cards */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 p-4 bg-white rounded shadow border border-gray-300">
              <p className="text-sm text-gray-700">Total Balance</p>
              <p className="text-xl font-bold">
                ${accounts.reduce((sum, account) => sum + calculateBalance(account.id), 0).toFixed(2)}
              </p>
            </div>
            <div className="flex-1 p-4 bg-white rounded shadow border border-gray-300">
              <p className="text-sm text-gray-700">Credit Used</p>
              <p className="text-xl font-bold text-red-600">
                {calculateCreditUtilization().toFixed(1)}%
              </p>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => {
                setEditingItem({ accountType: 'debit' });
                setFormType('account');
                setShowForm(true);
              }}
              className="flex-1 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              Add Account
            </button>
            <button
              onClick={() => {
                setEditingItem({});
                setFormType('transaction');
                setShowForm(true);
              }}
              className="flex-1 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
            >
              Add Transaction
            </button>
          </div>
          {/* Accounts Widget */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold">Accounts</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAcctSort('name')}
                  className="flex items-center gap-1 text-sm bg-white border border-gray-300 rounded px-2 py-1"
                >
                  Name {acctSortField === 'name' && (acctSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                </button>
                <button
                  onClick={() => toggleAcctSort('type')}
                  className="flex items-center gap-1 text-sm bg-white border border-gray-300 rounded px-2 py-1"
                >
                  Type {acctSortField === 'type' && (acctSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                </button>
                <button
                  onClick={() => toggleAcctSort('balance')}
                  className="flex items-center gap-1 text-sm bg-white border border-gray-300 rounded px-2 py-1"
                >
                  Balance {acctSortField === 'balance' && (acctSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white text-black">
                <thead>
                  <tr className="border-b border-gray-300 bg-gradient-to-r from-pink-300 via-red-300 to-yellow-300">
                    <th className="py-2 px-4 text-left text-sm">Name</th>
                    <th className="py-2 px-4 text-left text-sm">Type</th>
                    <th className="py-2 px-4 text-right text-sm">Balance</th>
                    <th className="py-2 px-4 text-right text-sm">Limit</th>
                    <th className="py-2 px-4 text-right text-sm">APR</th>
                    <th className="py-2 px-4 text-center text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAccounts && paginatedAccounts.length > 0 ? (
                    paginatedAccounts.map((account) => (
                      <tr key={account.id} className="border-b border-gray-300">
                        <td className="py-2 px-4 text-sm">{account.name}</td>
                        <td className="py-2 px-4 text-sm">{account.accountType}</td>
                        <td className="py-2 px-4 text-sm text-right">
                          ${Math.abs(calculateBalance(account.id)).toFixed(2)}
                        </td>
                        <td className="py-2 px-4 text-sm text-right">
                          {account.accountType === 'credit' ? `$${account.limit}` : ''}
                        </td>
                        <td className="py-2 px-4 text-sm text-right">
                          {account.accountType === 'credit' ? `${account.apr}%` : ''}
                        </td>
                        <td className="py-2 px-4 text-sm text-center">
                          <button
                            onClick={() => {
                              setEditingItem(account);
                              setFormType('account');
                              setShowForm(true);
                            }}
                            className="mr-2 text-blue-700 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => initiateDelete('account', account.id)}
                            className="text-red-700 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-4 text-center text-gray-600">
                        No accounts to display.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalAcctPages > 1 && (
              <div className="flex justify-center items-center mt-2 space-x-2">
                <button
                  onClick={() => setAcctCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={acctCurrentPage === 1}
                  className="px-3 py-1 rounded bg-white text-black disabled:opacity-50 border border-gray-300"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-700">
                  Page {acctCurrentPage} of {totalAcctPages}
                </span>
                <button
                  onClick={() => setAcctCurrentPage((prev) => Math.min(prev + 1, totalAcctPages))}
                  disabled={acctCurrentPage === totalAcctPages}
                  className="px-3 py-1 rounded bg-white text-black disabled:opacity-50 border border-gray-300"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Debt Projection */}
        <div className="w-1/2 p-4 flex flex-col min-h-0">
          <p className="text-sm text-gray-700 mb-2">Debt Projection</p>
          {/* Filters */}
          <div className="mb-2 flex flex-wrap gap-2 items-center">
            <select
              value={projectionScenario}
              onChange={(e) => setProjectionScenario(e.target.value)}
              className="bg-white border border-gray-300 rounded px-2 py-1 text-sm text-black"
            >
              <option value="current">Current Path</option>
              <option value="optimal">Optimal Path</option>
              <option value="aggressive">Aggressive Path</option>
            </select>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-white border border-gray-300 rounded px-2 py-1 text-sm text-black"
            >
              <option value="6m">6 Months</option>
              <option value="1y">1 Year</option>
              <option value="2y">2 Years</option>
            </select>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="bg-white border border-gray-300 rounded px-2 py-1 text-sm text-black"
            >
              <option value="all">All Accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 bg-white rounded shadow p-4 border border-gray-300">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={calculateProjections(projectionScenario)}
                margin={{ top: 5, right: 5, bottom: 20, left: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#666666", fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={40}
                  interval={0}
                />
                <YAxis
                  tick={{ fill: "#666666", fontSize: 10 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#36393F",
                    border: "none",
                    borderRadius: "0.375rem",
                    padding: "0.5rem",
                    color: "#FFFFFF",
                  }}
                />
                <Line type="monotone" dataKey="balance" stroke="#2EB67D" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="interest" stroke="#36C5F0" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="totalPayment" stroke="#ECB22E" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Transactions (no scrolling) */}
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Recent Transactions</h2>
        <div className="flex flex-wrap items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Sort by:</span>
            <button
              onClick={() => {
                if (transSortField === 'date') {
                  setTransSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                } else {
                  setTransSortField('date');
                  setTransSortOrder('desc');
                }
                setTransCurrentPage(1);
              }}
              className="flex items-center gap-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm text-black"
            >
              Date {transSortField === 'date' && (transSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
            </button>
            <button
              onClick={() => {
                if (transSortField === 'account') {
                  setTransSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                } else {
                  setTransSortField('account');
                  setTransSortOrder('asc');
                }
                setTransCurrentPage(1);
              }}
              className="flex items-center gap-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm text-black"
            >
              Account {transSortField === 'account' && (transSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
            </button>
            <button
              onClick={() => {
                if (transSortField === 'category') {
                  setTransSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                } else {
                  setTransSortField('category');
                  setTransSortOrder('asc');
                }
                setTransCurrentPage(1);
              }}
              className="flex items-center gap-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm text-black"
            >
              Category {transSortField === 'category' && (transSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
            </button>
            <button
              onClick={() => {
                if (transSortField === 'amount') {
                  setTransSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                } else {
                  setTransSortField('amount');
                  setTransSortOrder('desc');
                }
                setTransCurrentPage(1);
              }}
              className="flex items-center gap-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm text-black"
            >
              Amount {transSortField === 'amount' && (transSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTransCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={transCurrentPage === 1}
              className="px-3 py-1 rounded bg-white text-black disabled:opacity-50 border border-gray-300"
            >
              Prev
            </button>
            <span className="text-sm text-gray-700">
              Page {transCurrentPage} of {totalTransPages}
            </span>
            <button
              onClick={() => setTransCurrentPage((prev) => Math.min(prev + 1, totalTransPages))}
              disabled={transCurrentPage === totalTransPages}
              className="px-3 py-1 rounded bg-white text-black disabled:opacity-50 border border-gray-300"
            >
              Next
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-black">
            <thead>
              <tr className="border-b border-gray-400 bg-gradient-to-r from-pink-300 via-red-300 to-yellow-300">
                <th className="py-2 px-4 text-left text-sm">Date</th>
                <th className="py-2 px-4 text-left text-sm">Account</th>
                <th className="py-2 px-4 text-left text-sm">Category/Details</th>
                <th className="py-2 px-4 text-right text-sm">Amount</th>
                <th className="py-2 px-4 text-center text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions && paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((transaction) => {
                  const account = accounts.find((a) => a.id === transaction.accountId);
                  return (
                    <tr key={transaction.id} className="border-b border-gray-400">
                      <td className="py-2 px-4 text-sm">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-4 text-sm">
                        {account ? account.name : 'N/A'}
                      </td>
                      <td className="py-2 px-4 text-sm">
                        {transaction.details || transaction.category}
                      </td>
                      <td className="py-2 px-4 text-sm text-right">
                        <span className={transaction.type === 'credit' ? 'text-green-700' : 'text-red-700'}>
                          {transaction.type === 'credit' ? '+' : '-'}${transaction.amount}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-sm text-center">
                        <button
                          onClick={() => {
                            setEditingItem(transaction);
                            setFormType('transaction');
                            setShowForm(true);
                          }}
                          className="mr-2 text-blue-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => initiateDelete('transaction', transaction.id)}
                          className="text-red-700 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="py-4 text-center text-gray-600">
                    No transactions to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Account/Transaction Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-600 text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {formType === 'account' ? 'Account Details' : 'Add Transaction'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingItem(null);
                }}
                className="text-gray-300 hover:text-white"
              >
                Close
              </button>
            </div>
            {formType === 'account' ? (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Account Name"
                  value={editingItem ? editingItem.name : ''}
                  onChange={(e) =>
                    setEditingItem((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white"
                />
                <select
                  value={editingItem ? editingItem.accountType : 'debit'}
                  onChange={(e) =>
                    setEditingItem((prev) => ({ ...prev, accountType: e.target.value }))
                  }
                  className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white"
                >
                  <option value="debit">Debit Account</option>
                  <option value="credit">Credit Card</option>
                </select>
                {editingItem && editingItem.accountType === 'credit' && (
                  <>
                    <input
                      type="number"
                      placeholder="Credit Limit"
                      value={editingItem.limit || ''}
                      onChange={(e) =>
                        setEditingItem((prev) => ({ ...prev, limit: e.target.value }))
                      }
                      className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white"
                    />
                    <input
                      type="number"
                      placeholder="APR %"
                      value={editingItem.apr || ''}
                      onChange={(e) =>
                        setEditingItem((prev) => ({ ...prev, apr: e.target.value }))
                      }
                      className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white"
                    />
                  </>
                )}
                <button
                  onClick={handleSaveAccount}
                  className="w-full py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Account
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <select
                  value={editingItem ? editingItem.accountId : ''}
                  onChange={(e) =>
                    setEditingItem((prev) => ({ ...prev, accountId: e.target.value }))
                  }
                  className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white"
                >
                  <option value="">Select Account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={editingItem ? editingItem.amount : ''}
                  onChange={(e) =>
                    setEditingItem((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white"
                />
                <select
                  value={editingItem ? editingItem.type : 'debit'}
                  onChange={(e) =>
                    setEditingItem((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white"
                >
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
                <select
                  value={editingItem ? editingItem.category : 'Other'}
                  onChange={(e) =>
                    setEditingItem((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Details (optional)"
                  value={editingItem ? editingItem.details : ''}
                  onChange={(e) =>
                    setEditingItem((prev) => ({ ...prev, details: e.target.value }))
                  }
                  className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white"
                />
                <button
                  onClick={handleSaveTransaction}
                  className="w-full py-2 rounded bg-red-600 hover:bg-red-700 text-white"
                >
                  Save Transaction
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-600 text-white">
            <h2 className="text-2xl font-bold mb-4">Confirm Delete</h2>
            <p className="mb-4">
              Are you sure you want to delete this {deleteType}?{' '}
              {deleteType === 'account' && 'This will also delete all associated transactions.'}
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDelete}
                className="flex-1 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteItem(null);
                  setDeleteType(null);
                }}
                className="flex-1 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}