import React, { useEffect } from 'react';
import { Check } from 'lucide-react';

export default function SuccessPill({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(() => onDone?.(), 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      data-testid="success-pill"
      className="flex items-center gap-3 px-6 py-2 rounded-full animate-fade-in"
      style={{
        background: 'var(--overlay-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--overlay-border)',
        height: '56px',
      }}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20">
        <Check size={18} color="#22c55e" className="checkmark-animate" />
      </div>
      <span className="text-sm font-medium text-white/90">Email sent</span>
    </div>
  );
}
