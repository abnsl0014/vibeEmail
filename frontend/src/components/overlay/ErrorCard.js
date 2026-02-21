import React from 'react';
import { AlertCircle, RotateCcw, X } from 'lucide-react';

export default function ErrorCard({ error, onRetry, onDismiss }) {
  return (
    <div
      data-testid="error-card"
      className="flex flex-col gap-3 p-4 rounded-2xl animate-fade-in"
      style={{
        background: 'var(--overlay-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        width: '360px',
      }}
    >
      <div className="flex items-center gap-3">
        <AlertCircle size={20} color="#ef4444" />
        <span className="text-sm text-white/80 flex-1">{error || 'Something went wrong'}</span>
        <button
          data-testid="error-dismiss-btn"
          onClick={onDismiss}
          className="text-white/40 hover:text-white/70 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      <button
        data-testid="error-retry-btn"
        onClick={onRetry}
        className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-sm text-white/80 transition-colors"
      >
        <RotateCcw size={14} />
        <span>Retry</span>
      </button>
    </div>
  );
}
