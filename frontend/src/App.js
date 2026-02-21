import React, { useState, useEffect } from 'react';
import useAppStore from './stores/appStore';
import SetupWizard from './components/setup/SetupWizard';
import OverlayContainer from './components/overlay/OverlayContainer';
import { checkHealth } from './services/api';
import { Mic, Keyboard, Monitor } from 'lucide-react';

function App() {
  const { isSetupComplete, setSetupComplete, setBackendStatus } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('voice-overlay-setup-complete');
    if (stored === 'true') setSetupComplete(true);

    const checkBackend = async (retries = 10) => {
      for (let i = 0; i < retries; i++) {
        try {
          const data = await checkHealth();
          setBackendStatus({
            isRunning: true,
            asrLoaded: data.asr_loaded,
            llmLoaded: data.llm_loaded,
          });
          setBackendReady(true);
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
      setIsLoading(false);
    };
    checkBackend();
  }, [setSetupComplete, setBackendStatus]);

  const handleSetupComplete = () => {
    localStorage.setItem('voice-overlay-setup-complete', 'true');
    setSetupComplete(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen desktop-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-white/20 border-t-green-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-white/40">Loading Voice Overlay...</p>
        </div>
      </div>
    );
  }

  if (!isSetupComplete) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  return (
    <div data-testid="overlay-desktop" className="min-h-screen desktop-bg flex flex-col relative overflow-hidden">
      {/* Desktop area — simulates macOS desktop */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <DesktopInfo />
      </div>

      {/* Overlay area — bottom center, 80px from bottom */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
        <OverlayContainer demoMode={true} />
      </div>

      {/* Subtle status bar */}
      <div className="fixed top-4 right-4 z-50">
        <StatusBadge connected={backendReady} />
      </div>
    </div>
  );
}

function DesktopInfo() {
  return (
    <div className="text-center space-y-8 max-w-md">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-500/20 flex items-center justify-center">
        <Mic size={40} className="text-green-500/60" />
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-white/90 tracking-tight">Voice Overlay</h1>
        <p className="text-sm text-white/30 leading-relaxed">
          Your always-available voice command overlay. Press F1, speak a command,
          and fire off emails without switching context.
        </p>
      </div>

      <div className="flex flex-col gap-3 text-left">
        <ShortcutHint icon={<Keyboard size={14} />} keys="F1 / Space" desc="Toggle voice overlay" />
        <ShortcutHint icon={<Mic size={14} />} keys="Speak" desc="Say your command" />
        <ShortcutHint icon={<Monitor size={14} />} keys="Esc" desc="Dismiss overlay" />
      </div>

      <p className="text-xs text-white/15">
        Web preview - In the real app, this runs as a system overlay on macOS
      </p>
    </div>
  );
}

function ShortcutHint({ icon, keys, desc }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
      <div className="text-white/30">{icon}</div>
      <kbd className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono text-white/50">{keys}</kbd>
      <span className="text-xs text-white/30">{desc}</span>
    </div>
  );
}

function StatusBadge({ connected }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
      style={{
        background: 'var(--overlay-bg)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--overlay-border)',
      }}
    >
      <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
      <span className="text-white/40">{connected ? 'Backend ready' : 'Connecting...'}</span>
    </div>
  );
}

export default App;
