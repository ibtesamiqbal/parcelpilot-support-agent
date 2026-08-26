import React, { useState, useRef, useEffect } from 'react';
import { ToolBadge } from './ToolBadge';
import { ConfirmDialog } from './ConfirmDialog';

export function Chat({ accountId, accountName }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I am ParcelPilot's support assistant for ${accountName}. How can I assist you with your orders, cancellations, SLAs, or service credits today?`,
      toolCalls: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

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
      <div className="sample-prompts">
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', alignSelf: 'center' }}>Try asking:</span>
        <button
          className="prompt-chip"
          onClick={() => handleSend('Can Northstar cancel ORD-1001 without a cancellation fee? Explain why.')}
        >
          Can Northstar cancel ORD-1001 without a fee?
        </button>
        <button
          className="prompt-chip"
          onClick={() => handleSend('ORD-2002 pickup was delayed over 4 hours due to carrier fault. Do I get a service credit?')}
        >
          ORD-2002 service credit eligibility?
        </button>
        <button
          className="prompt-chip"
          onClick={() => handleSend('Escalate my open ticket TKT-501')}
        >
          Escalate open ticket TKT-501
        </button>
      </div>

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
              {msg.content}

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
            <div className="bubble" style={{ fontStyle: 'italic', color: '#94a3b8' }}>
              ParcelPilot assistant is looking up documents & order data...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-bar">
        <input
          type="text"
          placeholder={`Ask about orders, SLAs, cancellations, or service credits for ${accountName}...`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button onClick={() => handleSend()} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}
