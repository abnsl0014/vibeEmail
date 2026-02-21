import React, { useState, useEffect } from 'react';
import useAppStore from '../../stores/appStore';
import { checkHealth, getModelsStatus, downloadModels, loadModels } from '../../services/api';
import { Download, Loader, CheckCircle, AlertCircle } from 'lucide-react';

export default function ModelDownload({ onComplete, onSkip }) {
  const { backendStatus, setBackendStatus } = useAppStore();
  const [phase, setPhase] = useState('checking'); // checking, ready, downloading, loading, done, error
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [modelsStatus, setModelsStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const health = await checkHealth();
        if (cancelled) return;
        setBackendStatus({ isRunning: true, asrLoaded: health.asr_loaded, llmLoaded: health.llm_loaded });

        const status = await getModelsStatus();
        if (cancelled) return;
        setModelsStatus(status);

        if (status.asr.loaded && status.llm.loaded) {
          setPhase('done');
        } else if (status.asr.downloaded && status.llm.downloaded) {
          setPhase('ready');
        } else {
          setPhase('ready');
        }
      } catch {
        if (!cancelled) {
          setTimeout(check, 2000);
        }
      }
    };
    check();
    return () => { cancelled = true; };
  }, [setBackendStatus]);

  const startDownload = async () => {
    setPhase('downloading');
    setError(null);
    try {
      await downloadModels((data) => {
        setProgress(data);
        if (data.status === 'complete') {
          setPhase('loading');
          doLoadModels();
        }
      });
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  };

  const doLoadModels = async () => {
    try {
      await loadModels();
      setPhase('done');
      setTimeout(onComplete, 500);
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  };

  if (phase === 'checking') {
    return (
      <div data-testid="model-download-checking" className="text-center space-y-4">
        <Loader size={32} className="mx-auto animate-spin text-white/40" />
        <p className="text-sm text-white/50">Connecting to backend...</p>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div data-testid="model-download-done" className="text-center space-y-4">
        <CheckCircle size={48} className="mx-auto text-green-500" />
        <h2 className="text-xl font-bold text-white">AI Models Ready</h2>
        <p className="text-sm text-white/50">Speech recognition and language models are loaded.</p>
        <button
          data-testid="model-continue-btn"
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
    <div data-testid="model-download" className="text-center space-y-5">
      <Download size={32} className="mx-auto text-white/60" />
      <h2 className="text-xl font-bold text-white">Download AI Models</h2>
      <p className="text-sm text-white/50 leading-relaxed">
        Two local AI models need to be downloaded. This is a one-time setup.
      </p>

      {/* Model cards */}
      <div className="space-y-2 text-left">
        <ModelRow
          name="Parakeet TDT 0.6B"
          purpose="Speech Recognition"
          size="~2.3 GB"
          downloaded={modelsStatus?.asr?.downloaded}
        />
        <ModelRow
          name="Llama 3.2 1B"
          purpose="Email Drafting"
          size="~680 MB"
          downloaded={modelsStatus?.llm?.downloaded}
        />
      </div>

      {phase === 'downloading' && progress && (
        <div className="space-y-2">
          <div className="bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress.percent || 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/40">
            <span>{progress.model || 'Preparing...'}</span>
            <span>{Math.round(progress.percent || 0)}%</span>
          </div>
        </div>
      )}

      {phase === 'loading' && (
        <div className="flex items-center justify-center gap-2 text-sm text-white/50">
          <Loader size={16} className="animate-spin" />
          <span>Loading models into memory...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {(phase === 'ready' || phase === 'error') && (
        <div className="flex flex-col gap-2">
          <button
            data-testid="model-download-btn"
            onClick={startDownload}
            className="px-6 py-2.5 rounded-full text-sm font-medium text-white"
            style={{ background: 'var(--send-green)' }}
          >
            Download Models (~3 GB)
          </button>
          <button
            data-testid="model-skip-btn"
            onClick={onSkip}
            className="text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            Skip for now (demo mode)
          </button>
        </div>
      )}
    </div>
  );
}

function ModelRow({ name, purpose, size, downloaded }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
      <div>
        <div className="text-sm font-medium text-white/80">{name}</div>
        <div className="text-xs text-white/40">{purpose}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/30">{size}</span>
        {downloaded && <CheckCircle size={14} className="text-green-500" />}
      </div>
    </div>
  );
}
