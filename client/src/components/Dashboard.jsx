import React, { useEffect, useState } from 'react';

/** Renders Executive Proactive Issue Detection Dashboard (Bonus Problem 1). */
export function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDashboardData = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        setDashboardData(data);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(err => {
        console.error('Failed to fetch dashboard data:', err);
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>Running real-time operational scan over customer dataset...</p>
        </div>
      </div>
    );
  }

  const allIssues = dashboardData?.issues || [];

  const filteredIssues = allIssues.filter(issue => {
    const matchesSeverity = filterSeverity === 'ALL' || issue.severity === filterSeverity;
    const matchesSearch = searchQuery === '' || 
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (issue.account_name && issue.account_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (issue.affected_ticket_ids && issue.affected_ticket_ids.some(id => id.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesSeverity && matchesSearch;
  });

  const countBySeverity = {
    ALL: allIssues.length,
    CRITICAL: allIssues.filter(i => i.severity === 'CRITICAL').length,
    HIGH: allIssues.filter(i => i.severity === 'HIGH').length,
    MEDIUM: allIssues.filter(i => i.severity === 'MEDIUM').length
  };

  return (
    <div className="dashboard-container">
      {/* Executive Control Header */}
      <div className="dashboard-header-bar">
        <div className="header-left">
          <div className="dashboard-title-row">
            <h2>Operations Control Center</h2>
            <span className="live-status-pill">● LIVE SCAN ENGINE ACTIVE</span>
          </div>
          <p className="dashboard-subtitle">
            Reference Snapshot: {dashboardData?.snapshot || '2026-08-16 11:00 Asia/Kolkata'} | Real-Time Issue Monitoring
          </p>
        </div>

        <div className="header-right">
          <button 
            className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
          >
            🔄 {refreshing ? 'Scanning...' : 'Rescan Engine'}
          </button>
        </div>
      </div>

      {/* KPI Executive Summary Row */}
      <div className="kpi-summary-grid">
        <div className="kpi-card critical">
          <div className="kpi-top">
            <span className="kpi-label">Active P1 Outages</span>
            <span className="kpi-icon">🚨</span>
          </div>
          <div className="kpi-value">{countBySeverity.CRITICAL}</div>
          <div className="kpi-subtext">Immediate Escalation Required</div>
        </div>

        <div className="kpi-card high">
          <div className="kpi-top">
            <span className="kpi-label">SLA Breach Warnings</span>
            <span className="kpi-icon">⏱️</span>
          </div>
          <div className="kpi-value">{countBySeverity.HIGH}</div>
          <div className="kpi-subtext">Exceeding Response Targets</div>
        </div>

        <div className="kpi-card medium">
          <div className="kpi-top">
            <span className="kpi-label">Carrier Pickup Delays</span>
            <span className="kpi-icon">🚚</span>
          </div>
          <div className="kpi-value">{countBySeverity.MEDIUM}</div>
          <div className="kpi-subtext">Overdue Carrier Pickups</div>
        </div>

        <div className="kpi-card info">
          <div className="kpi-top">
            <span className="kpi-label">System Health</span>
            <span className="kpi-icon">🛡️</span>
          </div>
          <div className="kpi-value">84%</div>
          <div className="kpi-subtext">Monitored Across 4 Accounts</div>
        </div>
      </div>

      {/* Control Bar: Severity Filters & Search */}
      <div className="dashboard-controls-row">
        <div className="severity-tabs">
          <button 
            className={`severity-tab ${filterSeverity === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterSeverity('ALL')}
          >
            All Signals ({countBySeverity.ALL})
          </button>
          <button 
            className={`severity-tab critical ${filterSeverity === 'CRITICAL' ? 'active' : ''}`}
            onClick={() => setFilterSeverity('CRITICAL')}
          >
            Critical ({countBySeverity.CRITICAL})
          </button>
          <button 
            className={`severity-tab high ${filterSeverity === 'HIGH' ? 'active' : ''}`}
            onClick={() => setFilterSeverity('HIGH')}
          >
            High ({countBySeverity.HIGH})
          </button>
          <button 
            className={`severity-tab medium ${filterSeverity === 'MEDIUM' ? 'active' : ''}`}
            onClick={() => setFilterSeverity('MEDIUM')}
          >
            Medium ({countBySeverity.MEDIUM})
          </button>
        </div>

        <div className="dashboard-search-box">
          <span>🔍</span>
          <input 
            type="text" 
            placeholder="Filter signals by ticket, order, or customer..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      </div>

      {/* Issue Signals Grid */}
      <div className="dashboard-grid">
        {filteredIssues.length === 0 ? (
          <div className="no-issues-card">
            <p>No operational signals match your selected filter criteria.</p>
          </div>
        ) : (
          filteredIssues.map(issue => (
            <div key={issue.id} className={`issue-card ${issue.severity}`}>
              <div className="card-top-bar">
                <span className="issue-type-badge">{issue.type}</span>
                <span className={`severity-tag ${issue.severity}`}>{issue.severity}</span>
              </div>

              <h3 className="issue-title">{issue.title}</h3>
              <p className="issue-summary">{issue.summary}</p>

              {issue.rule_reason && (
                <div className="rule-reason-box">
                  <strong>📋 Policy Rule Cited:</strong> {issue.rule_reason}
                </div>
              )}

              {issue.workaround && (
                <div className="workaround-box">
                  💡 <strong>Recommended Workaround:</strong> {issue.workaround}
                </div>
              )}

              <div className="card-footer">
                {issue.account_name && (
                  <span className="account-tag">🏢 {issue.account_name}</span>
                )}
                {issue.affected_ticket_ids && (
                  <span className="affected-tag">🎫 Tickets: {issue.affected_ticket_ids.join(', ')}</span>
                )}
                {issue.affected_order_ids && (
                  <span className="affected-tag">📦 Orders: {issue.affected_order_ids.join(', ')}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
