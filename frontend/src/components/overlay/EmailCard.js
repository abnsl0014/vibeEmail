import React, { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';

export default function EmailCard({ draft, onSend, onCancel, isSending }) {
  const [to, setTo] = useState(draft?.to || '');
  const [subject, setSubject] = useState(draft?.subject || '');
  const [body, setBody] = useState(draft?.body || '');
  const toRef = useRef(null);

  useEffect(() => {
    if (draft) {
      setTo(draft.to || '');
      setSubject(draft.subject || '');
      setBody(draft.body || '');
    }
  }, [draft]);

  useEffect(() => {
    toRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!to.trim()) return;
    onSend({ to: to.trim(), subject: subject.trim(), body: body.trim() });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      data-testid="email-card"
      className="animate-fade-in"
      style={{
        background: 'var(--overlay-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--overlay-border)',
        borderRadius: '16px',
        width: '480px',
        maxHeight: '420px',
        display: 'flex',
        flexDirection: 'column',
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center px-4 h-12 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white border-b-2 border-white pb-1">
            Email
          </span>
        </div>
      </div>

      {/* To field */}
      <div className="flex items-center px-4 h-12 border-b border-white/10 gap-3">
        <span className="text-sm text-white/40 w-14 flex-shrink-0">To</span>
        <input
          ref={toRef}
          data-testid="email-to-input"
          className="overlay-input text-sm"
          placeholder="recipient@email.com"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          disabled={isSending}
        />
      </div>

      {/* Subject field */}
      <div className="flex items-center px-4 h-12 border-b border-white/10 gap-3">
        <span className="text-sm text-white/40 w-14 flex-shrink-0">Subject</span>
        <input
          data-testid="email-subject-input"
          className="overlay-input text-sm"
          placeholder="Email subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={isSending}
        />
      </div>

      {/* Body area */}
      <div className="flex-1 px-4 py-3 min-h-[120px] max-h-[200px] overflow-y-auto">
        <textarea
          data-testid="email-body-input"
          className="overlay-textarea text-sm"
          placeholder="Email body..."
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={isSending}
          style={{ minHeight: '100px' }}
        />
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
        <button
          data-testid="email-send-btn"
          onClick={handleSend}
          disabled={isSending || !to.trim()}
          className="flex items-center gap-2 px-5 h-9 rounded-full text-sm font-medium text-white transition-all disabled:opacity-40"
          style={{
            background: isSending ? '#444' : 'var(--send-green)',
          }}
        >
          {isSending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send size={14} />
              <span>Send</span>
            </>
          )}
        </button>
        <button
          data-testid="email-cancel-btn"
          onClick={onCancel}
          disabled={isSending}
          className="text-sm text-white/50 hover:text-white/80 transition-colors px-3 py-1"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
