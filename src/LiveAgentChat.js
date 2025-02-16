// src/LiveAgentChat.js
import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Maximize2,
  Minimize2,
  MessageSquare,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

// Instagram-inspired theme
const theme = {
  primary: '#0095F6',
  secondary: '#262626',
  background: '#FFFFFF',
  border: '#DBDBDB',
  text: '#262626',
  headerGradient: 'linear-gradient(90deg, #FF5F6B, #FB63B8, #9C54EF)',
  messageBackground: '#F7F7F7',
  inputBackground: '#FAFAFA',
  activeNowColor: '#4BB543',
  avatarGradient: 'linear-gradient(45deg, #FEA04C, #F83A95, #8E47EB)',
  controlsBackground: '#E8F0FE',
  controlsHighlight: '#2374E1',
  iconHover: '#F0F6FF'
};

// Namespaced keys (should match your dashboard)
const ACCOUNTS_KEY = "myapp_finance_accounts";
const TRANSACTIONS_KEY = "myapp_finance_transactions";

// Ensure keys are initialized if missing
const initializeStorage = () => {
  if (!localStorage.getItem(ACCOUNTS_KEY)) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(TRANSACTIONS_KEY)) {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify([]));
  }
};
initializeStorage();

// -------------------- Simulated API Call --------------------
const getChatResponse = async (userMessage, model) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return `${model} response: ${userMessage}`;
};

// -------------------- Business Logic Functions --------------------
const loadData = () => {
  const storedAccounts = localStorage.getItem(ACCOUNTS_KEY);
  const storedTransactions = localStorage.getItem(TRANSACTIONS_KEY);
  const accounts = storedAccounts ? JSON.parse(storedAccounts) : [];
  const transactions = storedTransactions ? JSON.parse(storedTransactions) : [];
  return { accounts, transactions };
};

const saveData = (accounts, transactions) => {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
};

const calculateBalance = (account, transactions, date = new Date()) => {
  const relevant = transactions.filter(
    t => t.accountId === account.id && new Date(t.date) <= date
  );
  return relevant.reduce(
    (sum, t) => sum + (t.type === 'credit' ? Number(t.amount) : -Number(t.amount)),
    0
  );
};

const getBusinessMetrics = () => {
  const { accounts, transactions } = loadData();
  const totalBalance = accounts.reduce(
    (sum, account) => sum + calculateBalance(account, transactions),
    0
  );
  const creditAccounts = accounts.filter(a => a.accountType === 'credit');
  const totalLimit = creditAccounts.reduce((sum, a) => sum + Number(a.limit || 0), 0);
  const totalUsed = creditAccounts.reduce(
    (sum, account) => sum + Math.max(0, calculateBalance(account, transactions)),
    0
  );
  const creditUsed = totalLimit ? (totalUsed / totalLimit) * 100 : 0;
  return { totalBalance, creditUsed };
};

// -------------------- Helper: Parse Key-Value Pairs --------------------
const parseKeyValuePairs = (text) => {
  const pairs = text.split(/[,;]/).map(part => part.trim());
  const obj = {};
  pairs.forEach(pair => {
    const [key, ...rest] = pair.split('=');
    if (key && rest.length > 0) {
      obj[key.trim().toLowerCase()] = rest.join('=').trim();
    }
  });
  return obj;
};

// -------------------- Secure Component Rendering --------------------

// Renders Total Balance and Credit Used cards
const BusinessCards = () => {
  const { totalBalance, creditUsed } = getBusinessMetrics();
  return (
    <div className="flex gap-4 p-4">
      <div className="flex-1 p-4 bg-white rounded shadow border border-gray-300">
        <p className="text-sm text-gray-700">Total Balance</p>
        <p className="text-xl font-bold">${totalBalance.toFixed(2)}</p>
      </div>
      <div className="flex-1 p-4 bg-white rounded shadow border border-gray-300">
        <p className="text-sm text-gray-700">Credit Used</p>
        <p className="text-xl font-bold text-red-600">{creditUsed.toFixed(1)}%</p>
      </div>
    </div>
  );
};

// Renders a secure Add Account form as a chat widget
const AddAccountWidget = ({ onClose }) => {
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('debit');
  const [limit, setLimit] = useState('');
  const [apr, setApr] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !accountType) {
      alert('Please provide at least a name and account type.');
      return;
    }
    const { accounts, transactions } = loadData();
    const newAccount = {
      id: Date.now().toString(),
      name,
      accountType,
      limit: accountType === 'credit' ? Number(limit) || 0 : 0,
      apr: accountType === 'credit' ? Number(apr) || 0 : 0,
    };
    const updatedAccounts = [...accounts, newAccount];
    saveData(updatedAccounts, transactions);
    // Dispatch event to refresh dashboard data
    window.dispatchEvent(new CustomEvent('financeDataUpdated'));
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="p-4">
        <p className="text-sm text-green-700">Account added successfully!</p>
        <button onClick={onClose} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm text-gray-700">Account Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Account Type</label>
          <select 
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="debit">Debit Account</option>
            <option value="credit">Credit Card</option>
          </select>
        </div>
        {accountType === 'credit' && (
          <>
            <div>
              <label className="block text-sm text-gray-700">Credit Limit</label>
              <input 
                type="number" 
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">APR (%)</label>
              <input 
                type="number" 
                value={apr}
                onChange={(e) => setApr(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
          </>
        )}
        <button 
          type="submit" 
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save Account
        </button>
      </form>
    </div>
  );
};

// -------------------- Command Handler --------------------
const handleCommand = (trimmed) => {
  const lower = trimmed.toLowerCase();
  const { accounts, transactions } = loadData();

  if (lower === 'balance info') {
    return { component: 'BusinessCards' };
  }

  if (lower.startsWith('add account:')) {
    const result = { component: 'AddAccountWidget' };
    // Dispatch event so that dashboard updates data
    window.dispatchEvent(new CustomEvent('financeDataUpdated'));
    return result;
  }

  if (lower.startsWith('add transaction:')) {
    const params = parseKeyValuePairs(trimmed.substring(16));
    if (!params.accountid || !params.amount) {
      return { text: 'Error: Please provide at least "accountId" and "amount" for transaction.' };
    }
    const newTransaction = {
      id: Date.now().toString(),
      accountId: params.accountid,
      amount: Number(params.amount),
      type: params.type || 'debit',
      category: params.category || 'Other',
      date: new Date().toISOString(),
      details: params.details || '',
    };
    const updatedTransactions = [...transactions, newTransaction];
    saveData(accounts, updatedTransactions);
    window.dispatchEvent(new CustomEvent('financeDataUpdated'));
    const metrics = getBusinessMetrics();
    return {
      text: `Transaction added.\nTotal Balance: $${metrics.totalBalance.toFixed(2)}\nCredit Used: ${metrics.creditUsed.toFixed(1)}%`
    };
  }
  return null;
};

// -------------------- LiveAgentChat Component --------------------
export default function LiveAgentChat({ brandColor = theme.primary, websiteName = 'Live Chat' }) {
  const [windowState, setWindowState] = useState('bottom'); // 'bottom' | 'expanded' | 'side'
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('OpenAI');
  const [lastActivity, setLastActivity] = useState(Date.now());
  const messagesEndRef = useRef(null);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-collapse after inactivity
  useEffect(() => {
    const inactivityTimeout = 300000; // 5 minutes
    const checkInactivity = () => {
      if (windowState === 'expanded' && Date.now() - lastActivity > inactivityTimeout) {
        setWindowState('bottom');
      }
    };
    const timer = setInterval(checkInactivity, 60000);
    return () => clearInterval(timer);
  }, [windowState, lastActivity]);

  const updateActivity = () => setLastActivity(Date.now());
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'mousemove', 'touchstart'];
    events.forEach(event => document.addEventListener(event, updateActivity));
    return () => events.forEach(event => document.removeEventListener(event, updateActivity));
  }, []);

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (windowState !== 'expanded') setWindowState('expanded');
    const userMsg = { text: trimmed, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    const commandResult = handleCommand(trimmed);
    if (commandResult !== null) {
      const agentMsg = { ...commandResult, sender: 'agent', timestamp: new Date() };
      setMessages(prev => [...prev, agentMsg]);
      return;
    }
    const response = await getChatResponse(trimmed, selectedModel);
    const agentMsg = { text: response, sender: 'agent', timestamp: new Date() };
    setMessages(prev => [...prev, agentMsg]);
  };

  // Render messages; if a message has a special component flag, render that component
  const renderMessage = (msg, idx) => {
    if (msg.component === 'BusinessCards') {
      return <BusinessCards key={idx} />;
    }
    if (msg.component === 'AddAccountWidget') {
      return <AddAccountWidget key={idx} onClose={() => setMessages(prev => prev.filter(m => m !== msg))} />;
    }
    return (
      <div key={idx} className="mb-3 flex flex-col">
        <div className="flex items-start gap-2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm shrink-0"
            style={{ backgroundColor: msg.sender === 'user' ? '#5E5E5E' : theme.primary }}
          >
            {msg.sender === 'user' ? 'U' : 'A'}
          </div>
          <div 
            className="relative p-3 rounded-lg max-w-[80%]"
            style={{ backgroundColor: theme.messageBackground, color: theme.text }}
          >
            <div className="text-sm">{msg.text}</div>
            <div className="text-[10px] mt-1 text-gray-500">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getContainerStyles = () => {
    const baseStyles = "fixed transition-all duration-300 ease-in-out bg-white shadow-xl mx-[10%]";
    switch (windowState) {
      case 'bottom':
        return `${baseStyles} bottom-0 left-0 right-0 border-t border-[${theme.border}]`;
      case 'expanded':
        return `${baseStyles} bottom-0 left-0 right-0 border-t border-[${theme.border}]`;
      case 'side':
        return `fixed bottom-4 right-[10%] w-14 h-14 rounded-full cursor-pointer hover:shadow-2xl`;
      default:
        return baseStyles;
    }
  };

  if (windowState === 'side') {
    return (
      <div 
        className={getContainerStyles()}
        onClick={() => setWindowState('bottom')}
        style={{ backgroundColor: theme.primary }}
      >
        <div className="w-full h-full flex items-center justify-center text-white">
          <MessageSquare size={20} />
        </div>
      </div>
    );
  }

  return (
    <div className={getContainerStyles()}>
      <div className={`${windowState === 'expanded' ? 'h-[60vh]' : 'h-auto'} transition-all duration-300`}>
        {/* Chat Header */}
        <div 
          className="relative px-3 py-2 flex justify-between items-center border-b"
          style={{ background: theme.headerGradient, borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <div className="flex items-center gap-2">
            <div className="relative w-7 h-7">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FEA04C" />
                    <stop offset="50%" stopColor="#F83A95" />
                    <stop offset="100%" stopColor="#8E47EB" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="48" stroke="url(#avatarGradient)" strokeWidth="4" fill="none" />
              </svg>
              <div className="absolute inset-0.5 rounded-full bg-white p-0.5">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">AI</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[13px] text-white leading-tight">{websiteName}</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.activeNowColor }}></div>
                <span className="text-[11px] text-white/90">Active now</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative mr-1">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="appearance-none text-[12px] font-medium focus:outline-none cursor-pointer px-2 py-1 rounded-full pr-6 transition-colors"
                style={{ backgroundColor: theme.controlsBackground, color: theme.controlsHighlight }}
              >
                <option value="OpenAI" className="text-black">OpenAI</option>
                <option value="Claude" className="text-black">Claude</option>
              </select>
              <ChevronDown 
                size={12} 
                className="absolute right-2 top-1/2 transform -translate-y-1/2" 
                style={{ color: theme.controlsHighlight }}
              />
            </div>
            <button
              onClick={() => setWindowState(windowState === 'expanded' ? 'bottom' : 'expanded')}
              className="p-1.5 rounded-full transition-colors"
              style={{ backgroundColor: theme.controlsBackground, color: theme.controlsHighlight }}
              aria-label={windowState === 'expanded' ? 'Minimize chat' : 'Maximize chat'}
            >
              {windowState === 'expanded' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={() => setWindowState('side')}
              className="p-1.5 rounded-full transition-colors"
              style={{ backgroundColor: theme.controlsBackground, color: theme.controlsHighlight }}
              aria-label="Minimize to side"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        {windowState === 'expanded' && (
          <div className="p-4 overflow-y-auto" style={{ height: 'calc(60vh - 130px)', backgroundColor: theme.background }}>
            {messages.map((msg, idx) => renderMessage(msg, idx))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area */}
        <div className="px-4 py-3 bg-white border-t" style={{ borderColor: theme.border }}>
          <div className="max-w-6xl mx-auto flex items-end">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="w-full pl-3 pr-12 py-2.5 text-sm border rounded-full focus:outline-none focus:border-gray-300"
                style={{ backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="absolute right-3 bottom-1/2 transform translate-y-1/2 p-1.5 rounded-full focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                style={{ color: theme.text }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}