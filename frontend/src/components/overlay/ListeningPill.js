import React from 'react';
import { X, Square } from 'lucide-react';
import PillWaveform from './PillWaveform';

export default function ListeningPill({ audioLevel, onDismiss, onStop }) {
  return (
    <div
      data-testid="listening-pill"
      className="flex items-center gap-4 px-4 py-2 rounded-full animate-slide-up"
      style={{
        background: 'var(--overlay-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--overlay-border)',
        width: '300px',
        height: '56px',
      }}
    >
      {/* Dismiss button */}
      <button
        data-testid="listening-dismiss-btn"
        onClick={onDismiss}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
      >
        <X size={18} color="#999" />
      </button>

      {/* Waveform */}
      <div className="flex-1 flex justify-center">
        <PillWaveform audioLevel={audioLevel} barCount={15} />
      </div>

      {/* Stop button */}
      <button
        data-testid="listening-stop-btn"
        onClick={onStop}
        className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 transition-colors"
        style={{ background: 'var(--stop-red)' }}
      >
        <Square size={14} color="#fff" fill="#fff" />
      </button>
    </div>
  );
}
