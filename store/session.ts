import { create } from 'zustand';

export type SourceType = 'streamingOnly' | 'includeRental';
export type Vibe = 'classics' | 'cult' | 'mustWatch' |'hiddenGem' | 'awardWinners' | 'trending';

type SessionState = {
  sourceType: SourceType | null;
  providerIds: number[];
  maxRuntimeMinutes: number | null; // null = ingen grænse (slider helt til højre)
  familyFriendly: boolean;
  genreIds: number[];
  vibes: Vibe[];

  setSourceType: (type: SourceType) => void;
  toggleProvider: (id: number) => void;
  setMaxRuntime: (minutes: number | null) => void;
  setFamilyFriendly: (value: boolean) => void;
  toggleGenre: (id: number) => void;
  toggleVibe: (vibe: Vibe) => void;
  reset: () => void;
};

const initialState = {
  sourceType: null as SourceType | null,
  providerIds: [] as number[],
  maxRuntimeMinutes: 120, // default 2 timer
  familyFriendly: false,
  genreIds: [] as number[],
  vibes: [] as Vibe[],
};

export const useSessionStore = create<SessionState>()((set) => ({
  ...initialState,

  setSourceType: (type) => set({ sourceType: type }),

  toggleProvider: (id) =>
    set((state) => ({
      providerIds: state.providerIds.includes(id)
        ? state.providerIds.filter((p) => p !== id)
        : [...state.providerIds, id],
    })),

  setMaxRuntime: (minutes) => set({ maxRuntimeMinutes: minutes }),
  setFamilyFriendly: (value) => set({ familyFriendly: value }),

  toggleGenre: (id) =>
    set((state) => ({
      genreIds: state.genreIds.includes(id)
        ? state.genreIds.filter((g) => g !== id)
        : [...state.genreIds, id],
    })),

  toggleVibe: (vibe) =>
    set((state) => ({
      vibes: state.vibes.includes(vibe)
        ? state.vibes.filter((v) => v !== vibe)
        : [...state.vibes, vibe],
    })),

  reset: () => set(initialState),
}));