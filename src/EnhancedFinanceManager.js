import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { AlertCircle, CreditCard, Wallet, TrendingUp } from 'lucide-react';

// Define a safe storage object that uses localStorage if available,
// or a fallback in-memory storage if not.
const safeStorage = (() => {
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch (error) {
    console.warn('localStorage is not available; using fallback storage.');
    let store = {};
    return {
      getItem: (key) => (key in store ? store[key] : null),
      setItem: (key, value) => { store[key] = value; },
      removeItem: (key) => { delete store[key]; },
    };
  }
})();

export default function EnhancedFinanceManager() {
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
    'Other'
  ]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('account');
  const [editingItem, setEditingItem] = useState(null);
  const [projectionScenario, setProjectionScenario] = useState('current');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [timeframe, setTimeframe] = useState('6m');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteType, setDeleteType] = useState(null);

  const monthsDifference = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  };

  // Read data from safeStorage (localStorage or fallback)
  useEffect(() => {
    try {
      const loadedAccounts = JSON.parse(safeStorage.getItem('finance_accounts')) || [];
      const loadedTransactions = JSON.parse(safeStorage.getItem('finance_transactions')) || [];

      const validatedAccounts = loadedAccounts.filter(
        account =>
          account.id &&
          account.name &&
          ['debit', 'credit'].includes(account.accountType)
      );

      const validatedTransactions = loadedTransactions.filter(
        transaction => transaction.id && transaction.accountId && !isNaN(transaction.amount)
      );

      setAccounts(validatedAccounts);
      setTransactions(validatedTransactions);
    } catch (error) {
      console.error('Error loading data from storage:', error);
      setAccounts([]);
      setTransactions([]);
    }
  }, []);

  // Write data to safeStorage (localStorage or fallback)
  useEffect(() => {
    try {
      safeStorage.setItem('finance_accounts', JSON.stringify(accounts));
      safeStorage.setItem('finance_transactions', JSON.stringify(transactions));
    } catch (error) {
      console.error('Error saving data to storage:', error);
    }
  }, [accounts, transactions]);

  const calculateBalance = (accountId, date = new Date()) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;

    const relevantTransactions = transactions.filter(
      t => t.accountId === accountId && new Date(t.date) <= date
    );

    let balance = relevantTransactions.reduce(
      (sum, t) => sum + (t.type === 'credit' ? Number(t.amount) : -Number(t.amount)),
      0
    );

    if (account.accountType === 'credit' && balance > 0 && account.apr) {
      const monthsSinceFirstTransaction =
        relevantTransactions.length > 0
          ? monthsDifference(
              new Date(Math.min(...relevantTransactions.map(t => new Date(t.date)))),
              date
            )
          : 0;
      const monthlyRate = Number(account.apr) / 100 / 12;
      balance = balance * Math.pow(1 + monthlyRate, monthsSinceFirstTransaction);
    }

    return balance;
  };

  const calculateCreditUtilization = () => {
    const creditAccounts = accounts.filter(a => a.accountType === 'credit');
    const totalLimit = creditAccounts.reduce(
      (sum, account) => sum + Number(account.limit || 0),
      0
    );
    if (totalLimit === 0) return 0;

    const totalUsed = creditAccounts.reduce(
      (sum, account) => sum + Math.max(0, calculateBalance(account.id)),
      0
    );
    return (totalUsed / totalLimit) * 100;
  };

  const calculateProjections = (scenario = 'current') => {
    const months =
      timeframe === '6m' ? 6 : timeframe === '1y' ? 12 : 24;
    const monthLabels = Array.from({ length: months + 1 }, (_, i) =>
      i === 0 ? 'Current' : `Month ${i}`
    );

    const relevantAccounts = accounts.filter(
      account =>
        (selectedAccount === 'all' || account.id === selectedAccount) &&
        account.accountType === 'credit' &&
        calculateBalance(account.id) > 0
    );

    return monthLabels.map((label, monthIndex) => {
      let projectedBalance = 0;
      let totalInterest = 0;
      let minimumPayment = 0;
      let additionalPayment = 0;

      relevantAccounts.forEach(account => {
        let currentBalance = calculateBalance(account.id);
        const monthlyRate = (account.apr / 100) / 12;

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
        totalPayment: minimumPayment + additionalPayment
      };
    });
  };

  const handleSaveAccount = () => {
    if (!editingItem?.name) return;

    const account = {
      id: editingItem.id || Date.now().toString(),
      name: editingItem.name,
      accountType: editingItem.accountType || 'debit',
      limit: Number(editingItem.limit) || 0,
      apr: Number(editingItem.apr) || 0
    };

    setAccounts(prev =>
      editingItem.id
        ? prev.map(a => (a.id === account.id ? account : a))
        : [...prev, account]
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
      details: editingItem.details || ''
    };

    setTransactions(prev => {
      const newTransactions = editingItem.id
        ? prev.map(t => (t.id === transaction.id ? transaction : t))
        : [...prev, transaction];

      return newTransactions.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
    });

    setShowForm(false);
    setEditingItem(null);
  };

  const initiateDelete = (type, id) => {
    setDeleteType(type);
    setDeleteItem(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = () => {
    if (deleteType === 'account') {
      setTransactions(prev => prev.filter(t => t.accountId !== deleteItem));
      setAccounts(prev => prev.filter(a => a.id !== deleteItem));
    } else if (deleteType === 'transaction') {
      setTransactions(prev => prev.filter(t => t.id !== deleteItem));
    }
    setShowDeleteConfirm(false);
    setDeleteItem(null);
    setDeleteType(null);
  };

  const TransactionList = () => (
    <Card className="bg-white border border-blue-200">
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {transactions.slice(0, 5).map(transaction => {
            const account = accounts.find(a => a.id === transaction.accountId);
            return (
              <div
                key={transaction.id}
                className="flex justify-between items-center p-2 rounded bg-blue-50"
              >
                <div>
                  <p className="font-medium">
                    {account?.name} - {transaction.details || transaction.category}
                  </p>
                  <p className="text-sm text-blue-400">
                    {new Date(transaction.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className={transaction.type === 'credit' ? 'text-blue-500' : 'text-red-500'}>
                    {transaction.type === 'credit' ? '+' : '-'}${transaction.amount}
                  </p>
                  <button
                    onClick={() => initiateDelete('transaction', transaction.id)}
                    className="text-sm text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="fixed inset-0 flex bg-blue-50">
      <div className="w-80 p-4 overflow-y-auto bg-white border-r border-blue-200">
        <div className="flex items-center gap-2 mb-6">
          <Wallet className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-bold text-blue-500">Finance Manager</h1>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6">
          <Card className="bg-white border border-blue-200 p-3">
            <CardContent>
              <p className="text-sm text-blue-400">Total Balance</p>
              <p className="text-lg font-bold text-blue-500">
                ${accounts.reduce((sum, account) => sum + calculateBalance(account.id), 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-blue-200 p-3">
            <CardContent>
              <p className="text-sm text-blue-400">Credit Used</p>
              <p className="text-lg font-bold text-blue-500">
                {calculateCreditUtilization().toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-2 mb-6">
          <button
            onClick={() => {
              setFormType('account');
              setShowForm(true);
              setEditingItem({ accountType: 'debit' });
            }}
            className="w-full px-4 py-2 rounded flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
          >
            <CreditCard className="w-4 h-4" />
            Add Account
          </button>
          {accounts.length > 0 && (
            <button
              onClick={() => {
                setFormType('transaction');
                setShowForm(true);
                setEditingItem({});
              }}
              className="w-full px-4 py-2 rounded flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
            >
              <TrendingUp className="w-4 h-4" />
              Add Transaction
            </button>
          )}
        </div>

        <div className="space-y-2">
          {accounts.map(account => (
            <Card
              key={account.id}
              className="hover:bg-blue-50 cursor-pointer bg-white border border-blue-200"
            >
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{account.name}</h3>
                    <p className="text-sm text-blue-400">
                      {account.accountType === 'credit'
                        ? `${account.apr}% APR`
                        : 'Debit Account'}
                    </p>
                  </div>
                  <p className={`font-bold ${
                    account.accountType === 'credit' && calculateBalance(account.id) > 0
                      ? 'text-blue-500'
                      : 'text-blue-500'
                  }`}>
                    ${Math.abs(calculateBalance(account.id)).toFixed(2)}
                  </p>
                </div>
                {account.accountType === 'credit' && (
                  <div className="mt-2 h-1 rounded bg-blue-100">
                    <div
                      className="h-full rounded bg-blue-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (calculateBalance(account.id) / account.limit) * 100
                        )}%`
                      }}
                    />
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      setEditingItem(account);
                      setFormType('account');
                      setShowForm(true);
                    }}
                    className="text-sm text-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => initiateDelete('account', account.id)}
                    className="text-sm text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-4">
          {accounts.some(a => a.accountType === 'credit' && calculateBalance(a.id) > 0) && (
            <Card className="bg-white border border-blue-200">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Debt Projection</span>
                  <div className="flex gap-2">
                    <select
                      value={projectionScenario}
                      onChange={e => setProjectionScenario(e.target.value)}
                      className="rounded px-2 py-1 text-sm bg-white border border-blue-200 text-blue-500"
                    >
                      <option value="current">Current Path</option>
                      <option value="optimal">Optimal Path</option>
                      <option value="aggressive">Aggressive Path</option>
                    </select>
                    <select
                      value={timeframe}
                      onChange={e => setTimeframe(e.target.value)}
                      className="rounded px-2 py-1 text-sm bg-white border border-blue-200 text-blue-500"
                    >
                      <option value="6m">6 Months</option>
                      <option value="1y">1 Year</option>
                      <option value="2y">2 Years</option>
                    </select>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={calculateProjections(projectionScenario)}
                      margin={{ top: 5, right: 5, bottom: 20, left: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#CCE5FF" />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: '#6BAED6', fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={40}
                        interval={1}
                      />
                      <YAxis
                        tick={{ fill: '#6BAED6', fontSize: 10 }}
                        tickFormatter={value => `${(value / 1000).toFixed(1)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#F8FBFF',
                          border: 'none',
                          borderRadius: '0.375rem',
                          padding: '0.5rem'
                        }}
                        formatter={(value, name) => [`${name}: ${value.toLocaleString()}`, '']}
                      />
                      <Line
                        type="monotone"
                        name="Balance"
                        dataKey="balance"
                        stroke="#2563EB"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        name="Total Payment"
                        dataKey="totalPayment"
                        stroke="#16A34A"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        name="Minimum Payment"
                        dataKey="minimumPayment"
                        stroke="#9333EA"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        name="Interest Accrued"
                        dataKey="interest"
                        stroke="#DC2626"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <TransactionList />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black bg-opacity-50">
          <div className="rounded-lg p-6 w-full max-w-md bg-white border border-blue-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-blue-500">
                {formType === 'account' ? 'Account Details' : 'Add Transaction'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingItem(null);
                }}
                className="text-blue-400 hover:text-blue-500"
              >
                Close
              </button>
            </div>

            {formType === 'account' ? (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Account Name"
                  value={editingItem?.name || ''}
                  onChange={e =>
                    setEditingItem(prev => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full p-2 rounded-lg bg-white border border-blue-200 text-blue-500"
                />
                <select
                  value={editingItem?.accountType || 'debit'}
                  onChange={e =>
                    setEditingItem(prev => ({ ...prev, accountType: e.target.value }))
                  }
                  className="w-full p-2 rounded-lg bg-white border border-blue-200 text-blue-500"
                >
                  <option value="debit">Debit Account</option>
                  <option value="credit">Credit Card</option>
                </select>
                {editingItem?.accountType === 'credit' && (
                  <>
                    <input
                      type="number"
                      placeholder="Credit Limit"
                      value={editingItem?.limit || ''}
                      onChange={e =>
                        setEditingItem(prev => ({ ...prev, limit: e.target.value }))
                      }
                      className="w-full p-2 rounded-lg bg-white border border-blue-200 text-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="APR %"
                      value={editingItem?.apr || ''}
                      onChange={e =>
                        setEditingItem(prev => ({ ...prev, apr: e.target.value }))
                      }
                      className="w-full p-2 rounded-lg bg-white border border-blue-200 text-blue-500"
                    />
                  </>
                )}
                <button
                  onClick={handleSaveAccount}
                  className="w-full py-2 rounded-lg text-white bg-blue-500 hover:bg-blue-600"
                >
                  Save Account
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <select
                  value={editingItem?.accountId || ''}
                  onChange={e =>
                    setEditingItem(prev => ({ ...prev, accountId: e.target.value }))
                  }
                  className="w-full p-2 rounded-lg bg-white border border-blue-200 text-blue-500"
                >
                  <option value="">Select Account</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={editingItem?.amount || ''}
                  onChange={e =>
                    setEditingItem(prev => ({ ...prev, amount: e.target.value }))
                  }
                  className="w-full p-2 rounded-lg bg-white border border-blue-200 text-blue-500"
                />
                <select
                  value={editingItem?.type || 'debit'}
                  onChange={e =>
                    setEditingItem(prev => ({ ...prev, type: e.target.value }))
                  }
                  className="w-full p-2 rounded-lg bg-white border border-blue-200 text-blue-500"
                >
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
                <select
                  value={editingItem?.category || 'Other'}
                  onChange={e =>
                    setEditingItem(prev => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full p-2 rounded-lg bg-white border border-blue-200 text-blue-500"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Details (optional)"
                  value={editingItem?.details || ''}
                  onChange={e =>
                    setEditingItem(prev => ({ ...prev, details: e.target.value }))
                  }
                  className="w-full p-2 rounded-lg bg-white border border-blue-200 text-blue-500"
                />
                <button
                  onClick={handleSaveTransaction}
                  className="w-full py-2 rounded-lg text-white bg-blue-500 hover:bg-blue-600"
                >
                  Save Transaction
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black bg-opacity-50">
          <div className="rounded-lg p-6 w-full max-w-md bg-white border border-blue-200">
            <h2 className="text-xl font-bold mb-4 text-blue-500">Confirm Delete</h2>
            <p className="mb-4 text-blue-500">
              Are you sure you want to delete this {deleteType}?{' '}
              {deleteType === 'account' &&
                'This will also delete all associated transactions.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="flex-1 py-2 rounded-lg text-white bg-red-500 hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteItem(null);
                  setDeleteType(null);
                }}
                className="flex-1 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-500"
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
