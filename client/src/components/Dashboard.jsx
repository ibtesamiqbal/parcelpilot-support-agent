import React, { useEffect, useState } from 'react';

/** Renders Proactive Issue Detection Dashboard (Bonus Problem 1). */
export function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        setDashboardData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch dashboard data:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="dashboard-container">
        <p style={{ color: '#94a3b8' }}>Analyzing dataset for proactive issue detection signals...</p>
      </div>
    );
  }

  const issues = dashboardData?.issues || [];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.4rem' }}>
          Proactive Issue Detection Dashboard
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Dataset Snapshot: {dashboardData?.snapshot || '2026-08-16 11:00 Asia/Kolkata'} | Detected Signals: {dashboardData?.total_issues_detected || 0}
        </p>
      </div>

      <div className="dashboard-grid">
        {issues.map(issue => (
          <div key={issue.id} className={`issue-card ${issue.severity}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="issue-type">{issue.type}</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '0.25rem',
                  background: issue.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                  color: 'white'
                }}
              >
                {issue.severity}
              </span>
            </div>

            <div className="issue-title">{issue.title}</div>
            <div className="issue-summary">{issue.summary}</div>

            {issue.workaround && (
              <div style={{ fontSize: '0.82rem', color: '#38bdf8', background: '#0f172a', padding: '0.5rem', borderRadius: '0.375rem' }}>
                💡 <strong>Recommended Workaround:</strong> {issue.workaround}
              </div>
            )}

            {issue.affected_ticket_ids && (
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Affected Tickets: {issue.affected_ticket_ids.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
