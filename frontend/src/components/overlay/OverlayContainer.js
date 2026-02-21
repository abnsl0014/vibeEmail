import React, { useCallback, useEffect, useRef } from 'react';
import useOverlayStore from '../../stores/overlayStore';
import { parseIntent, draftEmail, sendEmail } from '../../services/api';
import ListeningPill from './ListeningPill';
import ProcessingPill from './ProcessingPill';
import EmailCard from './EmailCard';
import SuccessPill from './SuccessPill';
import ErrorCard from './ErrorCard';

export default function OverlayContainer({ demoMode = false }) {
  const {
    state,
    emailDraft,
    audioLevel,
    error,
    setState,
    setEmailDraft,
    setError,
    setAudioLevel,
    reset,
  } = useOverlayStore();

  const audioLevelInterval = useRef(null);

  // Simulate audio levels in demo mode
  const startDemoAudio = useCallback(() => {
    if (!demoMode) return;
    audioLevelInterval.current = setInterval(() => {
      setAudioLevel(0.2 + Math.random() * 0.6);
    }, 100);
  }, [demoMode, setAudioLevel]);

  const stopDemoAudio = useCallback(() => {
    if (audioLevelInterval.current) {
      clearInterval(audioLevelInterval.current);
      audioLevelInterval.current = null;
    }
    setAudioLevel(0);
  }, [setAudioLevel]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1' || (demoMode && e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName))) {
        e.preventDefault();
        if (state === 'hidden') {
          setState('listening');
          startDemoAudio();
        } else {
          stopDemoAudio();
          reset();
        }
      }
      if (e.key === 'Escape' && state !== 'hidden') {
        e.preventDefault();
        stopDemoAudio();
        reset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, setState, reset, demoMode, startDemoAudio, stopDemoAudio]);

  // Dismiss handler
  const handleDismiss = useCallback(() => {
    stopDemoAudio();
    reset();
  }, [reset, stopDemoAudio]);

  // Stop recording → process
  const handleStopRecording = useCallback(async () => {
    stopDemoAudio();
    setState('processing');

    try {
      // In demo mode, simulate a voice command
      const simulatedText = 'Email Sarah about rescheduling the meeting to Friday';

      const intent = await parseIntent(simulatedText);

      if (intent.action === 'email') {
        const draft = await draftEmail(intent);
        setEmailDraft(draft);
        setState('email_card');
      } else {
        setError('Could not understand the command. Please try again.');
        setState('error');
      }
    } catch (err) {
      setError(err.message || 'Failed to process voice command');
      setState('error');
    }
  }, [setState, setEmailDraft, setError, stopDemoAudio]);

  // Send email
  const handleSendEmail = useCallback(async (emailData) => {
    setState('sending');
    try {
      await sendEmail(emailData.to, emailData.subject, emailData.body);
      setState('success');
    } catch (err) {
      setError(err.message || 'Failed to send email');
      setState('error');
    }
  }, [setState, setError]);

  // Success done → hide
  const handleSuccessDone = useCallback(() => {
    reset();
  }, [reset]);

  // Retry
  const handleRetry = useCallback(() => {
    setState('listening');
    startDemoAudio();
  }, [setState, startDemoAudio]);

  // Trigger overlay (for demo button)
  const triggerOverlay = useCallback(() => {
    if (state === 'hidden') {
      setState('listening');
      startDemoAudio();
    } else {
      stopDemoAudio();
      reset();
    }
  }, [state, setState, reset, startDemoAudio, stopDemoAudio]);

  if (state === 'hidden') {
    return (
      <div data-testid="overlay-container-hidden" className="flex flex-col items-center gap-4">
        <button
          data-testid="trigger-overlay-btn"
          onClick={triggerOverlay}
          className="group flex items-center gap-3 px-6 py-3 rounded-full transition-all"
          style={{
            background: 'var(--overlay-bg)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--overlay-border)',
          }}
        >
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-white/70 group-hover:text-white transition-colors">
            Press F1 or tap to activate
          </span>
        </button>
      </div>
    );
  }

  return (
    <div data-testid="overlay-container" className="flex flex-col items-center">
      {state === 'listening' && (
        <ListeningPill
          audioLevel={audioLevel}
          onDismiss={handleDismiss}
          onStop={handleStopRecording}
        />
      )}
      {state === 'processing' && <ProcessingPill />}
      {(state === 'email_card' || state === 'sending') && (
        <EmailCard
          draft={emailDraft}
          onSend={handleSendEmail}
          onCancel={handleDismiss}
          isSending={state === 'sending'}
        />
      )}
      {state === 'success' && <SuccessPill onDone={handleSuccessDone} />}
      {state === 'error' && (
        <ErrorCard
          error={error}
          onRetry={handleRetry}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}
