import AsyncStorage from '@react-native-async-storage/async-storage';
import { Movie } from './tmdb';

const WATCH_LATER_KEY = 'watchLater';
const MOVIE_JAIL_KEY = 'movieJail';

const SELECTED_PROVIDERS_KEY = 'selectedProviders';

/** null = aldrig valgt endnu (skal vises i onboarding). Tomt array sker reelt aldrig, da UI kræver mindst 1 valg. */
export async function getSelectedProviderIds(): Promise<number[] | null> {
  try {
    const raw = await AsyncStorage.getItem(SELECTED_PROVIDERS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveSelectedProviderIds(ids: number[]): Promise<void> {
  await AsyncStorage.setItem(SELECTED_PROVIDERS_KEY, JSON.stringify(ids));
}

export type WatchLaterEntry = { movie: Movie; addedAt: string };

async function readWatchLater(): Promise<WatchLaterEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(WATCH_LATER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    // Migrering: en tidligere version gemte filmen direkte (Movie[]),
    // ikke indpakket i { movie, addedAt }. Genkend og ret det automatisk.
    let migrated = false;
    const normalized: WatchLaterEntry[] = parsed.map((item: any) => {
      if (item && item.movie) return item;
      migrated = true;
      return { movie: item, addedAt: new Date().toISOString() };
    });

    if (migrated) {
      await writeWatchLater(normalized); // gem den rettede version, så det kun sker én gang
    }

    return normalized;
  } catch {
    return [];
  }
}

async function writeWatchLater(entries: WatchLaterEntry[]): Promise<void> {
  await AsyncStorage.setItem(WATCH_LATER_KEY, JSON.stringify(entries));
}

export async function getWatchLater(): Promise<WatchLaterEntry[]> {
  return readWatchLater();
}

export async function isInWatchLater(movieId: number): Promise<boolean> {
  const list = await readWatchLater();
  return list.some((e) => e.movie.id === movieId);
}

export async function toggleWatchLater(movie: Movie): Promise<boolean> {
  const list = await readWatchLater();
  const exists = list.some((e) => e.movie.id === movie.id);
  const updated = exists
    ? list.filter((e) => e.movie.id !== movie.id)
    : [...list, { movie, addedAt: new Date().toISOString() }];
  await writeWatchLater(updated);
  return !exists;
}

export async function removeFromWatchLater(movieId: number): Promise<void> {
  const list = await readWatchLater();
  await writeWatchLater(list.filter((e) => e.movie.id !== movieId));
}

// --- Movie jail (uændret) ---

async function readList(key: string): Promise<Movie[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeList(key: string, movies: Movie[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(movies));
}

export async function getMovieJail(): Promise<Movie[]> {
  return readList(MOVIE_JAIL_KEY);
}

export async function getMovieJailIds(): Promise<Set<number>> {
  const list = await getMovieJail();
  return new Set(list.map((m) => m.id));
}

export async function sendToMovieJail(movie: Movie): Promise<void> {
  const list = await getMovieJail();
  if (list.some((m) => m.id === movie.id)) return;
  await writeList(MOVIE_JAIL_KEY, [...list, movie]);
}

export async function releaseFromMovieJail(movieId: number): Promise<void> {
  const list = await getMovieJail();
  await writeList(MOVIE_JAIL_KEY, list.filter((m) => m.id !== movieId));
}
//----SOft Jail ----

const SOFT_JAIL_KEY = 'softJail';
const SOFT_JAIL_EXPIRY_DAYS = 30;

export type SoftJailEntry = { movie: Movie; addedAt: string };

async function readSoftJail(): Promise<SoftJailEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(SOFT_JAIL_KEY);
    if (!raw) return [];
    const parsed: SoftJailEntry[] = JSON.parse(raw);

    const cutoff = Date.now() - SOFT_JAIL_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    const stillValid = parsed.filter((e) => new Date(e.addedAt).getTime() > cutoff);

    if (stillValid.length !== parsed.length) {
      await AsyncStorage.setItem(SOFT_JAIL_KEY, JSON.stringify(stillValid)); // rydder udløbne entries fra disk
    }

    return stillValid;
  } catch {
    return [];
  }
}

export async function getSoftJail(): Promise<SoftJailEntry[]> {
  return readSoftJail();
}

export async function getSoftJailIds(): Promise<Set<number>> {
  const list = await readSoftJail();
  return new Set(list.map((e) => e.movie.id));
}

export async function addToSoftJail(movie: Movie): Promise<void> {
  const list = await readSoftJail();
  if (list.some((e) => e.movie.id === movie.id)) return;
  await AsyncStorage.setItem(SOFT_JAIL_KEY, JSON.stringify([...list, { movie, addedAt: new Date().toISOString() }]));
}