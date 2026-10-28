import { create } from 'zustand';
import { Movie } from '../lib/tmdb';

type Position = { x: number; y: number };

type UIState = {
  tabBarHidden: boolean;
  setTabBarHidden: (hidden: boolean) => void;
  lastActiveTab: string;
  setLastActiveTab: (tab: string) => void;
  listsTabPosition: Position | null;
  setListsTabPosition: (pos: Position) => void;
  actionModalMovie: Movie | null;
  actionModalOnJailed: (() => void) | null;
  openActionModal: (movie: Movie, onJailed?: () => void) => void;
  closeActionModal: () => void;
  searchModalOpen: boolean;
  openSearchModal: () => void;
  closeSearchModal: () => void;
  hasStarted: boolean;
  setHasStarted: (hasStarted: boolean) => void;
  pendingSilentCheck: boolean;
  setPendingSilentCheck: (value: boolean) => void;
};

export const useUIStore = create<UIState>()((set) => ({
  tabBarHidden: false,
  setTabBarHidden: (hidden) => set({ tabBarHidden: hidden }),
  lastActiveTab: 'index',
  setLastActiveTab: (tab) => set({ lastActiveTab: tab }),
  listsTabPosition: null,
  setListsTabPosition: (pos) => set({ listsTabPosition: pos }),
  actionModalMovie: null,
  actionModalOnJailed: null,
  openActionModal: (movie, onJailed) => set({ actionModalMovie: movie, actionModalOnJailed: onJailed ?? null }),
  closeActionModal: () => set({ actionModalMovie: null, actionModalOnJailed: null }),
  searchModalOpen: false,
  openSearchModal: () => set({ searchModalOpen: true }),
  closeSearchModal: () => set({ searchModalOpen: false }),
  hasStarted: false,
  setHasStarted: (hasStarted) => set({ hasStarted }),
  pendingSilentCheck: false,
  setPendingSilentCheck: (value) => set({ pendingSilentCheck: value }),
}));