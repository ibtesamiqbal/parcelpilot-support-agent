import React, { useEffect, useState } from 'react';

/** Renders Proactive Issue Detection Dashboard (Bonus Problem 1). */
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
          <p>Analyzing operational dataset for proactive issue detection signals...</p>
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
      {/* Top Banner explaining the Proactive Engine */}
      <div className="proactive-explanation-banner">
        <div className="banner-icon">⚡</div>
        <div className="banner-content">
          <h4>Automated Operational Health Scanner</h4>
          <p>
            This engine automatically monitors all customer activity, open orders, and tickets at reference snapshot <strong>{dashboardData?.snapshot || '2026-08-16 11:00 Asia/Kolkata'}</strong>. It proactively surfaces SLA risks, carrier delays, and recurring product bugs <em>before</em> customers submit complaints.
          </p>
        </div>
      </div>

      {/* Dashboard Control Panel Header */}
      <div className="dashboard-header-bar">
        <div>
          <div className="dashboard-title-row">
            <h2>Proactive Issue Detection Dashboard</h2>
            <span className="live-status-pill">● LIVE SCAN ENGINE ACTIVE</span>
          </div>
          <p className="dashboard-subtitle">
            Dataset Snapshot: {dashboardData?.snapshot} | {allIssues.length} Operational Signals Flagged
          </p>
        </div>

        <button 
          className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
        >
          🔄 {refreshing ? 'Scanning...' : 'Rescan Engine'}
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="dashboard-controls-row">
        <div className="severity-tabs">
          <button 
            className={`severity-tab ${filterSeverity === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterSeverity('ALL')}
          >
            All ({countBySeverity.ALL})
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
            placeholder="Search signals by ticket, order, or customer..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      </div>

      {/* Issue Grid */}
      <div className="dashboard-grid">
        {filteredIssues.length === 0 ? (
          <div className="no-issues-card">
            <p>No operational signals match your selected filter.</p>
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
                  <strong>📋 Audit Rule Cited:</strong> {issue.rule_reason}
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
