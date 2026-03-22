import { create } from "zustand";

export interface DashboardVoiceRegistrar {
  focusAndStart: () => void;
}

interface State {
  registrar: DashboardVoiceRegistrar | null;
  setRegistrar: (r: DashboardVoiceRegistrar | null) => void;
  requestFromFab: () => void;
}

export const useDashboardVoiceFabStore = create<State>((set, get) => ({
  registrar: null,
  setRegistrar: (r) => set({ registrar: r }),
  requestFromFab: () => {
    get().registrar?.focusAndStart();
  },
}));
