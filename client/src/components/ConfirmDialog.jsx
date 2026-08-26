import React from 'react';

/** Renders confirmation gate dialog for staged state-changing actions. */
export function ConfirmDialog({ onConfirm, onCancel }) {
  return (
    <div className="confirm-box">
      <div className="confirm-title">
        <span>⚠️</span>
        <span>Confirmation Required</span>
      </div>
      <p style={{ fontSize: '0.88rem', color: '#e2e8f0' }}>
        This action requires explicit user confirmation before executing on your account. Would you like to proceed?
      </p>
      <div className="confirm-actions">
        <button className="confirm-btn yes" onClick={onConfirm}>
          ✓ Yes, Confirm Action
        </button>
        <button className="confirm-btn no" onClick={onCancel}>
          ✕ Cancel
        </button>
      </div>
    </div>
  );
}
