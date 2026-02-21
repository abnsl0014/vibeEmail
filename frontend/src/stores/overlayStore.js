import { create } from 'zustand';

const useOverlayStore = create((set) => ({
  state: 'hidden',
  emailDraft: null,
  transcribedText: '',
  error: null,
  audioLevel: 0,

  setState: (state) => set({ state }),
  setEmailDraft: (emailDraft) => set({ emailDraft }),
  setTranscribedText: (transcribedText) => set({ transcribedText }),
  setError: (error) => set({ error }),
  setAudioLevel: (audioLevel) => set({ audioLevel }),
  reset: () => set({
    state: 'hidden',
    emailDraft: null,
    transcribedText: '',
    error: null,
    audioLevel: 0,
  }),
}));

export default useOverlayStore;
