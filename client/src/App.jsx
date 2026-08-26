import React, { useState, useEffect } from 'react';
import { Chat } from './components/Chat';
import { Dashboard } from './components/Dashboard';
import { AccountSelector } from './components/AccountSelector';

export function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('ACCT-001');

  useEffect(() => {
    fetch('/api/accounts')
      .then(res => res.json())
      .then(data => {
        if (data.accounts) {
          setAccounts(data.accounts);
        }
      })
      .catch(err => console.error('Failed to load accounts:', err));
  }, []);

  const selectedAccount = accounts.find(a => a.account_id === selectedAccountId) || {
    account_id: 'ACCT-001',
    account_name: 'Northstar Logistics',
    plan: 'Enterprise'
  };

  return (
    <div className="app-shell">
      <header className="header">
        <div className="brand">
          <div className="brand-logo">📦</div>
          <div>
            <div className="brand-title">ParcelPilot Support Agent</div>
            <div className="brand-subtitle">
              Snapshot Reference: 2026-08-16 11:00 Asia/Kolkata
            </div>
          </div>
        </div>

        <nav className="nav-tabs">
          <button
            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <span className="tab-icon">💬</span>
            <span>Support Chat</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="tab-icon">⚡</span>
            <span>Issue Detection Engine</span>
            <span className="live-pulse"></span>
          </button>
        </nav>

        <AccountSelector
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
        />
      </header>

      <main className="main-content">
        {activeTab === 'chat' ? (
          <Chat 
            accountId={selectedAccountId} 
            accountName={selectedAccount.account_name} 
            accountPlan={selectedAccount.plan}
          />
        ) : (
          <Dashboard />
        )}
      </main>
    </div>
  );
}

export default App;
