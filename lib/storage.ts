import AsyncStorage from '@react-native-async-storage/async-storage';
import { Movie } from './tmdb';

const WATCH_LATER_KEY = 'watchLater';
const MOVIE_JAIL_KEY = 'movieJail';
const SOFT_JAIL_KEY = 'softJail';
const SELECTED_PROVIDERS_KEY = 'selectedProviders';
const SOFT_JAIL_DURATION_KEY = 'softJailDurationDays';
const SOFT_JAIL_THRESHOLD_KEY = 'softJailThresholdMs';

const DEFAULT_SOFT_JAIL_DURATION_DAYS = 30;
const DEFAULT_SOFT_JAIL_THRESHOLD_MS = 1000;

export type WatchLaterEntry = { movie: Movie; addedAt: string };
export type SoftJailEntry = { movie: Movie; addedAt: string };

// --- Watch Later ---

async function readWatchLater(): Promise<WatchLaterEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(WATCH_LATER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    let migrated = false;
    const normalized: WatchLaterEntry[] = parsed.map((item: any) => {
      if (item && item.movie) return item;
      migrated = true;
      return { movie: item, addedAt: new Date().toISOString() };
    });

    if (migrated) await writeWatchLater(normalized);
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

// --- Movie Jail ---

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

// --- Soft Jail-indstillinger ---

export async function getSoftJailDurationDays(): Promise<number> {
  const raw = await AsyncStorage.getItem(SOFT_JAIL_DURATION_KEY);
  return raw ? Number(raw) : DEFAULT_SOFT_JAIL_DURATION_DAYS;
}

export async function setSoftJailDurationDays(days: number): Promise<void> {
  await AsyncStorage.setItem(SOFT_JAIL_DURATION_KEY, String(days));
}

export async function getSoftJailThresholdMs(): Promise<number> {
  const raw = await AsyncStorage.getItem(SOFT_JAIL_THRESHOLD_KEY);
  return raw ? Number(raw) : DEFAULT_SOFT_JAIL_THRESHOLD_MS;
}

export async function setSoftJailThresholdMs(ms: number): Promise<void> {
  await AsyncStorage.setItem(SOFT_JAIL_THRESHOLD_KEY, String(ms));
}

export function getSoftJailRemainingMs(addedAt: string, durationDays: number): number {
  const expiresAt = new Date(addedAt).getTime() + durationDays * 24 * 60 * 60 * 1000;
  return Math.max(0, expiresAt - Date.now());
}

// --- Soft Jail ---

async function readSoftJail(): Promise<SoftJailEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(SOFT_JAIL_KEY);
    if (!raw) return [];
    const parsed: SoftJailEntry[] = JSON.parse(raw);

    const durationDays = await getSoftJailDurationDays();
    const cutoff = Date.now() - durationDays * 24 * 60 * 60 * 1000;
    const stillValid = parsed.filter((e) => new Date(e.addedAt).getTime() > cutoff);

    if (stillValid.length !== parsed.length) {
      await AsyncStorage.setItem(SOFT_JAIL_KEY, JSON.stringify(stillValid));
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

export async function releaseFromSoftJail(movieId: number): Promise<void> {
  const list = await readSoftJail();
  await AsyncStorage.setItem(SOFT_JAIL_KEY, JSON.stringify(list.filter((e) => e.movie.id !== movieId)));
}

// --- Valgte streaming-tjenester ---

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

const WATCHED_KEY = 'watchedMovies';

export type WatchedEntry = { movie: Movie; rating: number | null; watchedAt: string };

async function readWatched(): Promise<WatchedEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(WATCHED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeWatched(entries: WatchedEntry[]): Promise<void> {
  await AsyncStorage.setItem(WATCHED_KEY, JSON.stringify(entries));
}

export async function getWatched(): Promise<WatchedEntry[]> {
  return readWatched();
}

export async function getWatchedEntry(movieId: number): Promise<WatchedEntry | null> {
  const list = await readWatched();
  return list.find((e) => e.movie.id === movieId) ?? null;
}

export async function markWatched(movie: Movie, rating: number | null): Promise<void> {
  const list = await readWatched();
  const index = list.findIndex((e) => e.movie.id === movie.id);
  const entry: WatchedEntry = { movie, rating, watchedAt: new Date().toISOString() };

  if (index === -1) {
    await writeWatched([...list, entry]);
  } else {
    const updated = [...list];
    updated[index] = { ...updated[index], rating };
    await writeWatched(updated);
  }
}

export async function unmarkWatched(movieId: number): Promise<void> {
  const list = await readWatched();
  await writeWatched(list.filter((e) => e.movie.id !== movieId));
}