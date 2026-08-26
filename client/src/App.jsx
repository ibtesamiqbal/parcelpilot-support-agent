import React, { useState, useEffect } from 'react';
import { Chat } from './components/Chat';
import { Dashboard } from './components/Dashboard';

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
    account_name: 'Northstar Logistics'
  };

  return (
    <>
      <header className="header">
        <div className="brand">
          <span className="brand-icon">📦</span>
          <div>
            <div className="brand-title">ParcelPilot Support Agent</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Dataset Snapshot: 2026-08-16 11:00 Asia/Kolkata
            </div>
          </div>
        </div>

        <div className="nav-tabs">
          <button
            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            💬 Support Chat
          </button>
          <button
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Issue Detection Dashboard
          </button>
        </div>

        <div className="user-selector">
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Log in as:</span>
          <select
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
          >
            {accounts.map(acc => (
              <option key={acc.account_id} value={acc.account_id}>
                {acc.account_name} ({acc.account_id} - {acc.plan})
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'chat' ? (
          <Chat accountId={selectedAccountId} accountName={selectedAccount.account_name} />
        ) : (
          <Dashboard />
        )}
      </main>
    </>
  );
}

export default App;
