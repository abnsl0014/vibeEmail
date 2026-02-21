import React, { useState, useEffect } from 'react';
import useAppStore from '../../stores/appStore';
import ModelDownload from './ModelDownload';
import GmailConnect from './GmailConnect';
import { Mic, Zap, Shield, ArrowRight } from 'lucide-react';

const STEPS = ['welcome', 'models', 'gmail', 'ready'];

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState('welcome');
  const stepIndex = STEPS.indexOf(step);

  const goNext = () => {
    const next = stepIndex + 1;
    if (next < STEPS.length) setStep(STEPS[next]);
  };

  return (
    <div data-testid="setup-wizard" className="min-h-screen flex flex-col items-center justify-center p-8 desktop-bg">
      {/* Progress dots */}
      {step !== 'welcome' && step !== 'ready' && (
        <div className="mb-8 flex gap-2">
          {STEPS.slice(1, -1).map((s, i) => (
            <div
              key={s}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i <= stepIndex - 1 ? 'bg-green-500' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      )}

      {/* Card */}
      <div
        className="max-w-lg w-full rounded-2xl p-8"
        style={{
          background: 'var(--overlay-bg)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--overlay-border)',
        }}
      >
        {step === 'welcome' && <WelcomeStep onNext={goNext} />}
        {step === 'models' && <ModelDownload onComplete={goNext} onSkip={goNext} />}
        {step === 'gmail' && <GmailConnect onComplete={goNext} onSkip={goNext} />}
        {step === 'ready' && <ReadyStep onComplete={onComplete} />}
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }) {
  return (
    <div data-testid="setup-welcome" className="text-center space-y-6">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
        <Mic size={32} color="#fff" />
      </div>
      <h1 className="text-2xl font-bold text-white">Voice Overlay</h1>
      <p className="text-white/60 text-sm leading-relaxed">
        A lightweight voice command overlay. Press F1, speak a command,
        and fire off emails without switching context.
      </p>

      <div className="space-y-3 text-left pt-2">
        <Feature icon={<Shield size={16} />} color="green" text="100% Private - All AI runs locally on your Mac" />
        <Feature icon={<Zap size={16} />} color="blue" text="Lightning Fast - Optimized for Apple Silicon" />
        <Feature icon={<Mic size={16} />} color="purple" text="Voice-First - Just speak and send" />
      </div>

      <button
        data-testid="setup-get-started-btn"
        onClick={onNext}
        className="flex items-center justify-center gap-2 mx-auto px-6 py-3 rounded-full text-sm font-medium text-white transition-all hover:scale-105"
        style={{ background: 'var(--send-green)' }}
      >
        Get Started <ArrowRight size={16} />
      </button>
    </div>
  );
}

function Feature({ icon, color, text }) {
  const colors = {
    green: 'bg-green-500/10 text-green-400',
    blue: 'bg-blue-500/10 text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
        {icon}
      </div>
      <span className="text-sm text-white/70">{text}</span>
    </div>
  );
}

function ReadyStep({ onComplete }) {
  return (
    <div data-testid="setup-ready" className="text-center space-y-6">
      <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
        <Zap size={32} color="#22c55e" />
      </div>
      <h2 className="text-2xl font-bold text-white">You're All Set!</h2>
      <p className="text-white/60 text-sm">
        Press <kbd className="px-2 py-1 rounded bg-white/10 text-white/80 text-xs font-mono">F1</kbd> anytime to activate the voice overlay.
        Speak your command and the app will handle the rest.
      </p>
      <div className="bg-white/5 rounded-lg p-4 text-left space-y-2">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">F1</kbd>
          <span>Toggle overlay</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Esc</kbd>
          <span>Dismiss</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Enter</kbd>
          <span>Send email</span>
        </div>
      </div>
      <button
        data-testid="setup-finish-btn"
        onClick={onComplete}
        className="px-6 py-3 rounded-full text-sm font-medium text-white transition-all hover:scale-105"
        style={{ background: 'var(--send-green)' }}
      >
        Start Using Voice Overlay
      </button>
    </div>
  );
}
