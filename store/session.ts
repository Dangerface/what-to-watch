import { create } from 'zustand';

export type Person = {
  name: string;
  genreIds: number[];
  decades: string[];
};

type SessionState = {
  persons: Person[];
  currentPersonIndex: number;
  initPersons: (count: number) => void;
  setName: (name: string) => void;
  toggleGenre: (id: number) => void;
  toggleDecade: (decade: string) => void;
  goToNextPerson: () => void;
};

const emptyPerson = (): Person => ({ name: '', genreIds: [], decades: [] });

export const useSessionStore = create<SessionState>()((set) => ({
  persons: [],
  currentPersonIndex: 0,

  initPersons: (count) =>
    set({ persons: Array.from({ length: count }, emptyPerson), currentPersonIndex: 0 }),

  setName: (name) =>
    set((state) => {
      const persons = [...state.persons];
      persons[state.currentPersonIndex] = { ...persons[state.currentPersonIndex], name };
      return { persons };
    }),

  toggleGenre: (id) =>
    set((state) => {
      const persons = [...state.persons];
      const current = persons[state.currentPersonIndex];
      const genreIds = current.genreIds.includes(id)
        ? current.genreIds.filter((g) => g !== id)
        : [...current.genreIds, id];
      persons[state.currentPersonIndex] = { ...current, genreIds };
      return { persons };
    }),

  toggleDecade: (decade) =>
    set((state) => {
      const persons = [...state.persons];
      const current = persons[state.currentPersonIndex];
      const decades = current.decades.includes(decade)
        ? current.decades.filter((d) => d !== decade)
        : [...current.decades, decade];
      persons[state.currentPersonIndex] = { ...current, decades };
      return { persons };
    }),

  goToNextPerson: () => set((state) => ({ currentPersonIndex: state.currentPersonIndex + 1 })),
}));