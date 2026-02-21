import React from 'react';
import { Mail } from 'lucide-react';

export default function ProcessingPill() {
  return (
    <div
      data-testid="processing-pill"
      className="flex items-center gap-4 px-4 py-2 rounded-full animate-fade-in"
      style={{
        background: 'var(--overlay-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--overlay-border)',
        width: '300px',
        height: '56px',
      }}
    >
      {/* Email icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 flex-shrink-0">
        <Mail size={18} color="#aaa" />
      </div>

      {/* Status text */}
      <span className="flex-1 text-sm" style={{ color: 'var(--overlay-muted)' }}>
        Drafting email...
      </span>

      {/* Loading dots */}
      <div className="flex gap-1.5 flex-shrink-0">
        <div className="loading-dot w-2 h-2 rounded-full bg-white/60" />
        <div className="loading-dot w-2 h-2 rounded-full bg-white/60" />
        <div className="loading-dot w-2 h-2 rounded-full bg-white/60" />
      </div>
    </div>
  );
}
