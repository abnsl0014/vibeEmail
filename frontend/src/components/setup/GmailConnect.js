import React, { useState, useEffect } from 'react';
import { getGmailStatus, getGmailAuthUrl } from '../../services/api';
import { Mail, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react';

export default function GmailConnect({ onComplete, onSkip }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const s = await getGmailStatus();
        if (!cancelled) setStatus(s);
      } catch {
        // Gmail service might not be configured yet
      }
    };
    check();

    // Listen for OAuth success message
    const handler = (event) => {
      if (event.data?.type === 'GMAIL_AUTH_SUCCESS') {
        setIsConnecting(false);
        check();
      }
    };
    window.addEventListener('message', handler);
    return () => {
      cancelled = true;
      window.removeEventListener('message', handler);
    };
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const { auth_url } = await getGmailAuthUrl();
      window.open(auth_url, 'gmail-auth', 'width=500,height=600');
    } catch (err) {
      setError(err.message || 'Could not start Gmail authentication');
      setIsConnecting(false);
    }
  };

  if (status?.connected) {
    return (
      <div data-testid="gmail-connected" className="text-center space-y-4">
        <CheckCircle size={48} className="mx-auto text-green-500" />
        <h2 className="text-xl font-bold text-white">Gmail Connected</h2>
        <p className="text-sm text-white/50">
          Connected as <span className="text-white/70">{status.email || 'your account'}</span>
        </p>
        <button
          data-testid="gmail-continue-btn"
          onClick={onComplete}
          className="px-6 py-2.5 rounded-full text-sm font-medium text-white"
          style={{ background: 'var(--send-green)' }}
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div data-testid="gmail-connect" className="text-center space-y-5">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 flex items-center justify-center">
        <Mail size={28} className="text-white/60" />
      </div>
      <h2 className="text-xl font-bold text-white">Connect Gmail</h2>
      <p className="text-sm text-white/50 leading-relaxed">
        Connect your Gmail account to send emails directly from voice commands.
        We only request permission to send emails.
      </p>

      <div className="bg-white/5 rounded-lg p-3 text-left">
        <div className="text-xs text-white/40 mb-2">Required setup:</div>
        <ol className="space-y-1.5 text-xs text-white/50">
          <li>1. Create a Google Cloud project with Gmail API enabled</li>
          <li>2. Download OAuth 2.0 client credentials JSON</li>
          <li>3. Place the file at <code className="px-1 py-0.5 rounded bg-white/10 text-white/60">~/VoiceOverlay/gmail_client.json</code></li>
          <li>4. Click Connect below to authorize</li>
        </ol>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          data-testid="gmail-connect-btn"
          onClick={handleConnect}
          disabled={isConnecting}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium text-white transition-all disabled:opacity-50"
          style={{ background: 'var(--send-green)' }}
        >
          {isConnecting ? (
            <span>Waiting for authorization...</span>
          ) : (
            <>
              <ExternalLink size={14} />
              <span>Connect Gmail</span>
            </>
          )}
        </button>
        <button
          data-testid="gmail-skip-btn"
          onClick={onSkip}
          className="text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          Skip for now (demo mode)
        </button>
      </div>
    </div>
  );
}
