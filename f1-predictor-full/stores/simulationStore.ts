import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DriverConfig = {
  name: string;
  team: string;
  strengthsEnabled: string[];
  weaknessesEnabled: string[];
};

type State = {
  currentRun: { id: number } | null;
  isRunning: boolean;
  isFinished: boolean;
  history: Array<{ id: number }>;
  activeDrivers: DriverConfig[];
  startRun: () => void;
  endRun: () => void;
  resetRun: () => void;
  toggleDriver: (name: string, team: string) => void;
  toggleStrength: (name: string, s: string) => void;
  toggleWeakness: (name: string, w: string) => void;
  resetDrivers: () => void;
  resetAll: () => void;
};

export const useSimulationStore = create<State>()(
  persist(
    (set, get) => ({
      currentRun: null,
      isRunning: false,
      isFinished: false,
      history: [],
      activeDrivers: [],
      startRun: () => set({ currentRun: { id: Date.now() }, isRunning: true, isFinished: false }),
      endRun: () => {
        const s = get();
        if (!s.currentRun) return;
        set({ isRunning: false, isFinished: true, history: [...s.history, s.currentRun] });
      },
      resetRun: () => set({ currentRun: null, isRunning: false, isFinished: false }),
      toggleDriver: (name, team) => {
        const list = get().activeDrivers;
        const exists = list.find(d => d.name === name);
        set({
          activeDrivers: exists
            ? list.filter(d => d.name !== name)
            : [...list, { name, team, strengthsEnabled: [], weaknessesEnabled: [] }]
        });
      },
      toggleStrength: (name, sKey) => set({
        activeDrivers: get().activeDrivers.map(d =>
          d.name !== name ? d : {
            ...d,
            strengthsEnabled: d.strengthsEnabled.includes(sKey)
              ? d.strengthsEnabled.filter(x => x !== sKey)
              : [...d.strengthsEnabled, sKey]
          })
      }),
      toggleWeakness: (name, wKey) => set({
        activeDrivers: get().activeDrivers.map(d =>
          d.name !== name ? d : {
            ...d,
            weaknessesEnabled: d.weaknessesEnabled.includes(wKey)
              ? d.weaknessesEnabled.filter(x => x !== wKey)
              : [...d.weaknessesEnabled, wKey]
          })
      }),
      resetDrivers: () => set({ activeDrivers: [] }),
      resetAll: () => set({
        currentRun: null,
        isRunning: false,
        isFinished: false,
        history: [],
        activeDrivers: []
      })
    }),
    { name: "simulation-store" }
  )
);
