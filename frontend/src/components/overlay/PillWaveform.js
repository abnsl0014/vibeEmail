import React from 'react';

export default function PillWaveform({ audioLevel = 0, barCount = 15 }) {
  const bars = Array.from({ length: barCount }, (_, i) => {
    const centerDist = Math.abs(i - Math.floor(barCount / 2)) / Math.floor(barCount / 2);
    const baseHeight = 0.2 + (1 - centerDist) * 0.3;
    const animatedHeight = baseHeight + audioLevel * (1 - centerDist) * 0.5;
    const delay = (i * 0.04).toFixed(2);

    return (
      <div
        key={i}
        data-testid={`waveform-bar-${i}`}
        className="waveform-bar rounded-full"
        style={{
          width: '3px',
          height: `${Math.max(8, animatedHeight * 32)}px`,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          animationDelay: `${delay}s`,
          animationDuration: `${0.4 + Math.random() * 0.3}s`,
          transition: 'height 0.1s ease',
        }}
      />
    );
  });

  return (
    <div
      data-testid="pill-waveform"
      className="flex items-center gap-[3px] h-8"
    >
      {bars}
    </div>
  );
}
