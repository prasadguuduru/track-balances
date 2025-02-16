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
  controlsBackground: '#E8F0FE',
  controlsHighlight: '#2374E1',
};

const SUGGESTIONS = [
  "balance info",
  "add account:",
  "add transaction:"
];

// Storage keys
const ACCOUNTS_KEY = "myapp_finance_accounts";
const TRANSACTIONS_KEY = "myapp_finance_transactions";

// Initialize storage if missing
if (!localStorage.getItem(ACCOUNTS_KEY)) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([]));
}
if (!localStorage.getItem(TRANSACTIONS_KEY)) {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify([]));
}

// Simulated API call
const getChatResponse = async (userMessage, model) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return `${model} response: ${userMessage}`;
};

// Data loading/saving
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

// Basic calculations
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

// Renders a simple summary
const BusinessCards = () => {
  const { totalBalance, creditUsed } = getBusinessMetrics();
  return (
    <div className="flex gap-4 p-4">
      <div className="flex-1 p-4 bg-white rounded shadow border" style={{ borderColor: theme.border }}>
        <p className="text-sm text-gray-700">Total Balance</p>
        <p className="text-xl font-bold">${totalBalance.toFixed(2)}</p>
      </div>
      <div className="flex-1 p-4 bg-white rounded shadow border" style={{ borderColor: theme.border }}>
        <p className="text-sm text-gray-700">Credit Used</p>
        <p className="text-xl font-bold text-red-600">{creditUsed.toFixed(1)}%</p>
      </div>
    </div>
  );
};

// Widget for adding an account
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

// Command handler
const handleCommand = (trimmed) => {
  const lower = trimmed.toLowerCase();
  const { accounts, transactions } = loadData();

  if (lower === 'balance info') {
    return { component: 'BusinessCards' };
  }
  if (lower.startsWith('add account:')) {
    return { component: 'AddAccountWidget' };
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

// Main Chat Component
export default function LiveAgentChat({ websiteName = 'Live Chat' }) {
  const [windowState, setWindowState] = useState('bottom'); // 'bottom' | 'expanded' | 'side'
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('OpenAI');
  const [lastActivity, setLastActivity] = useState(Date.now());
  const messagesEndRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Inactivity auto-collapse
  useEffect(() => {
    const inactivityTimeout = 300000; // 5 minutes
    const timer = setInterval(() => {
      if (windowState === 'expanded' && Date.now() - lastActivity > inactivityTimeout) {
        setWindowState('bottom');
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [windowState, lastActivity]);

  // Update lastActivity on user interactions
  const updateActivity = () => setLastActivity(Date.now());
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'mousemove', 'touchstart'];
    events.forEach(event => document.addEventListener(event, updateActivity));
    return () => events.forEach(event => document.removeEventListener(event, updateActivity));
  }, []);

  // Suggestions row (one-liner)
  const renderTagSuggestions = () => {
    if (messages.length > 0) {
      return (
        <div 
          className="flex items-center px-4" 
          style={{ height: '24px', backgroundColor: theme.inputBackground, borderTop: `1px solid ${theme.border}` }}
        >
          <span className="text-xs text-gray-500 mr-2">Suggestions:</span>
          <div className="flex gap-2">
            {SUGGESTIONS.map((tag, index) => (
              <button
                key={index}
                onClick={() => setInputValue(tag)}
                className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs whitespace-nowrap"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Send message
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

  // Render each message
  const renderMessage = (msg, idx) => {
    // If the message has an <iframe> snippet, render it as HTML
    if (msg.text && msg.text.includes("<iframe")) {
      return (
        <div key={idx} className="mb-3">
          <div className="p-3 rounded-lg" style={{ backgroundColor: theme.messageBackground, color: theme.text }}>
            <div dangerouslySetInnerHTML={{ __html: msg.text }} />
          </div>
        </div>
      );
    }
    if (msg.component === 'BusinessCards') {
      return <BusinessCards key={idx} />;
    }
    if (msg.component === 'AddAccountWidget') {
      return <AddAccountWidget key={idx} onClose={() => setMessages(prev => prev.filter(m => m !== msg))} />;
    }
    // Default text message
    return (
      <div key={idx} className="mb-3">
        <div className="flex items-start gap-2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm shrink-0"
            style={{ backgroundColor: msg.sender === 'user' ? '#5E5E5E' : theme.primary }}
          >
            {msg.sender === 'user' ? 'U' : 'A'}
          </div>
          <div className="p-3 rounded-lg max-w-[80%]" style={{ backgroundColor: theme.messageBackground, color: theme.text }}>
            <div className="text-sm">{msg.text}</div>
            <div className="text-[10px] mt-1 text-gray-500">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Container style based on windowState
  const getContainerStyles = () => {
    const baseStyles = "fixed transition-all duration-300 ease-in-out bg-white shadow-xl mx-[10%]";
    switch (windowState) {
      case 'bottom':
        return `${baseStyles} bottom-0 left-0 right-0 border-t`;
      case 'expanded':
        return `${baseStyles} bottom-0 left-0 right-0 border-t`;
      case 'side':
        return `fixed bottom-4 right-[10%] w-14 h-14 rounded-full cursor-pointer hover:shadow-2xl`;
      default:
        return baseStyles;
    }
  };

  // If minimized to side
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
      {/* Grid layout: header (48px), messages area (1fr), bottom area (60px) */}
      <div style={{ height: '60vh', display: 'grid', gridTemplateRows: '48px 1fr 60px' }}>
        {/* Header */}
        <div className="px-3 py-2 flex justify-between items-center border-b" style={{ background: theme.headerGradient }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
              <span className="text-xs font-semibold" style={{ color: theme.primary }}>AI</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[13px] text-white">{websiteName}</span>
              <span className="text-[11px] text-white/90">Active now</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="text-[12px] font-medium px-2 py-1 rounded-full"
              style={{ backgroundColor: theme.controlsBackground, color: theme.controlsHighlight }}
            >
              <option value="OpenAI">OpenAI</option>
              <option value="Claude">Claude</option>
            </select>
            <button
              onClick={() => setWindowState(windowState === 'expanded' ? 'bottom' : 'expanded')}
              className="p-1.5 rounded-full"
              style={{ backgroundColor: theme.controlsBackground, color: theme.controlsHighlight }}
              aria-label={windowState === 'expanded' ? 'Minimize chat' : 'Maximize chat'}
            >
              {windowState === 'expanded' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={() => setWindowState('side')}
              className="p-1.5 rounded-full"
              style={{ backgroundColor: theme.controlsBackground, color: theme.controlsHighlight }}
              aria-label="Minimize to side"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Messages Area (scrollable) */}
        <div className="overflow-y-auto p-4" style={{ backgroundColor: theme.background }}>
          {messages.map((msg, idx) => renderMessage(msg, idx))}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Area: 60px total, flex-col for suggestions row + input row */}
        <div style={{ backgroundColor: theme.inputBackground, borderTop: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column' }}>
          {/* Suggestions row (24px) */}
          {renderTagSuggestions()}
          {/* Input row (36px) */}
          <div className="flex-none px-4" style={{ height: '36px', display: 'flex', alignItems: 'center' }}>
            <div className="relative w-full h-full">
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
                className="w-full pl-3 pr-12 text-sm border rounded-full focus:outline-none h-full"
                style={{ backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full focus:outline-none transition-colors disabled:opacity-50"
                style={{ backgroundColor: theme.primary, color: '#fff' }}
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