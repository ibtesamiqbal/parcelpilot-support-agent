import React, { useState, useRef, useEffect } from 'react';
import { ToolBadge } from './ToolBadge';
import { ConfirmDialog } from './ConfirmDialog';

export function Chat({ accountId, accountName, accountPlan }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I am ParcelPilot's AI Support Assistant for ${accountName} (${accountPlan} Plan). How can I assist you with your orders, cancellations, SLAs, or service credits today?`,
      toolCalls: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Update greeting when account switches
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `Hello! Switched context to ${accountName} (${accountId} - ${accountPlan || 'Standard'} Plan). How can I assist you with your account's orders, contract terms, or SLAs today?`,
        toolCalls: []
      }
    ]);
  }, [accountId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (customText = null) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = { role: 'user', content: textToSend };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (!customText) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          message: textToSend,
          history: updatedMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await res.json();
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply || 'No response generated.',
          toolCalls: data.toolCalls || [],
          pendingConfirmation: data.pendingConfirmation
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Error communicating with support agent: ${err.message}`,
          toolCalls: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      {/* Scope Info Header Bar */}
      <div className="chat-scope-bar">
        <div className="scope-info">
          <span className="scope-indicator">●</span>
          <span>Active Context: <strong>{accountName}</strong> ({accountId})</span>
          <span className="scope-badge">{accountPlan || 'Standard'} Plan</span>
        </div>
        <div className="scope-notice">🔒 Access Control Active: Data scoped to {accountId}</div>
      </div>

      {/* Categorized Quick Sample Prompts */}
      <div className="sample-prompts">
        <span className="prompt-label">Quick Prompts:</span>
        <button
          className="prompt-chip contract"
          onClick={() => handleSend('Can Northstar cancel ORD-1001 without a cancellation fee? Explain why.')}
        >
          📜 Cancellation Terms (ORD-1001)
        </button>
        <button
          className="prompt-chip order"
          onClick={() => handleSend('ORD-2002 pickup was delayed over 4 hours due to carrier fault. Do I get a service credit?')}
        >
          📦 Delayed Pickup Credit (ORD-2002)
        </button>
        <button
          className="prompt-chip action"
          onClick={() => handleSend('Escalate my open ticket TKT-501')}
        >
          ⚡ Escalate Ticket (TKT-501)
        </button>
      </div>

      {/* Messages Feed */}
      <div className="messages-list">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message-wrapper ${msg.role}`}>
            {msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="tool-badges-row">
                {msg.toolCalls.map((tc, tcIdx) => (
                  <ToolBadge key={tcIdx} toolCall={tc} />
                ))}
              </div>
            )}

            <div className="bubble">
              <div className="bubble-content">{msg.content}</div>

              {msg.role === 'assistant' && msg.pendingConfirmation && (
                <ConfirmDialog
                  onConfirm={() => handleSend('Yes, confirm escalation')}
                  onCancel={() => setMessages(prev => [...prev, { role: 'user', content: 'No, cancel' }, { role: 'assistant', content: 'Action cancelled.' }])}
                />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message-wrapper assistant">
            <div className="bubble loading-bubble">
              <div className="typing-dots">
                <span></span><span></span><span></span>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Analyzing contract clauses & order data...
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="input-bar">
        <input
          type="text"
          placeholder={`Ask about orders, SLAs, cancellations, or service credits for ${accountName}...`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="send-btn" onClick={() => handleSend()} disabled={loading}>
          <span>Send</span>
          <span className="send-icon">➔</span>
        </button>
      </div>
    </div>
  );
}
