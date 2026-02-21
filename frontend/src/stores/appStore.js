import { create } from 'zustand';

const useAppStore = create((set) => ({
  isSetupComplete: false,
  backendStatus: {
    isRunning: false,
    asrLoaded: false,
    llmLoaded: false,
    port: 8765,
  },

  setSetupComplete: (complete) => set({ isSetupComplete: complete }),
  setBackendStatus: (status) => set((prev) => ({
    backendStatus: { ...prev.backendStatus, ...status },
  })),
}));

export default useAppStore;
