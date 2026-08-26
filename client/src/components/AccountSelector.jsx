import React, { useState, useRef, useEffect } from 'react';

/** Custom Commercial Account Switcher Dropdown (replaces native select). */
export function AccountSelector({ accounts, selectedAccountId, onSelectAccount }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentAccount = accounts.find(a => a.account_id === selectedAccountId) || {
    account_id: 'ACCT-001',
    account_name: 'Northstar Logistics',
    plan: 'Enterprise'
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPlanBadgeClass = (plan) => {
    if (plan === 'Enterprise') return 'plan-badge enterprise';
    if (plan === 'Growth') return 'plan-badge growth';
    return 'plan-badge standard';
  };

  return (
    <div className="account-selector-container" ref={dropdownRef}>
      <span className="selector-label">Logged in as:</span>
      <button 
        className="account-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="account-icon">🏢</span>
        <div className="account-info">
          <span className="account-name">{currentAccount.account_name}</span>
          <span className="account-id">({currentAccount.account_id})</span>
        </div>
        <span className={getPlanBadgeClass(currentAccount.plan)}>{currentAccount.plan}</span>
        <span className={`dropdown-chevron ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="account-dropdown-menu">
          <div className="dropdown-header">Switch Customer Context:</div>
          {accounts.map(acc => (
            <div
              key={acc.account_id}
              className={`dropdown-item ${acc.account_id === selectedAccountId ? 'selected' : ''}`}
              onClick={() => {
                onSelectAccount(acc.account_id);
                setIsOpen(false);
              }}
            >
              <div className="item-left">
                <span className="item-name">{acc.account_name}</span>
                <span className="item-id">{acc.account_id}</span>
              </div>
              <span className={getPlanBadgeClass(acc.plan)}>{acc.plan}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
