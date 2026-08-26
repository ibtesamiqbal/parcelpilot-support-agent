import React from 'react';

/** Renders live tool execution badges for assistant responses. */
export function ToolBadge({ toolCall }) {
  if (!toolCall) return null;
  const { tool, input, result } = toolCall;

  if (tool === 'search_documents') {
    const query = input?.query || 'documents';
    const count = result?.count || 0;
    const topDoc = result?.results?.[0]?.source || '';
    return (
      <div className="tool-badge" title={`Search Query: "${query}" | Sources: ${topDoc}`}>
        <span>🔍</span>
        <span>Searched: "{query}" ({count} chunks)</span>
      </div>
    );
  }

  if (tool === 'query_data') {
    const op = input?.operation || 'data';
    const orderId = input?.params?.order_id || '';
    return (
      <div className="tool-badge" title={`Data Operation: ${op} ${orderId}`}>
        <span>📊</span>
        <span>Data Lookup: {op} {orderId ? `(${orderId})` : ''}</span>
      </div>
    );
  }

  if (tool === 'create_action') {
    const actionType = input?.action_type || 'action';
    const isPending = input?.confirmed === false;
    return (
      <div className={`tool-badge action ${isPending ? 'pending' : 'executed'}`}>
        <span>⚡</span>
        <span>Action: {actionType.toUpperCase()} ({isPending ? 'Pending Confirmation' : 'Executed'})</span>
      </div>
    );
  }

  return null;
}
