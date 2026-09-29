import AsyncStorage from '@react-native-async-storage/async-storage';
import { processBatched } from './batch';
import { getWatched } from './storage';
import { fetchMovieCredits } from './tmdb';

const MIN_RATING_FOR_SEED = 8;
const MAX_PROFILE_MOVIES = 30;
const VERIFY_BATCH_SIZE = 8;
const PROFILE_VERSION = 1;
const TASTE_PROFILE_KEY = 'tasteProfile';

export type TasteProfile = {
  genreCounts: Record<number, number>;
  directorIds: number[];
  actorIds: number[];
  eligibleMovieIds: number[];
  version: number;
};

async function readCachedProfile(): Promise<TasteProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(TASTE_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeCachedProfile(profile: TasteProfile): Promise<void> {
  await AsyncStorage.setItem(TASTE_PROFILE_KEY, JSON.stringify(profile));
}

function sameIdSet(a: number[], b: Set<number>): boolean {
  if (a.length !== b.size) return false;
  return a.every((id) => b.has(id));
}

export async function getTasteProfile(forceRefresh = false): Promise<TasteProfile> {
  const watched = await getWatched();
  const loved = watched.filter((e) => (e.rating ?? 0) >= MIN_RATING_FOR_SEED).slice(0, MAX_PROFILE_MOVIES);
  const eligibleIds = new Set(loved.map((e) => e.movie.id));

  const cached = forceRefresh ? null : await readCachedProfile();
  if (cached && cached.version === PROFILE_VERSION && sameIdSet(cached.eligibleMovieIds, eligibleIds)) {
    return cached;
  }

  const genreCounts: Record<number, number> = {};
  for (const entry of loved) {
    for (const g of entry.movie.genre_ids) genreCounts[g] = (genreCounts[g] ?? 0) + 1;
  }

  const creditsList = await processBatched(loved, VERIFY_BATCH_SIZE, async (entry) => fetchMovieCredits(entry.movie.id));

  const directorIds = new Set<number>();
  const actorIds = new Set<number>();
  for (const credits of creditsList) {
    if (credits.director) directorIds.add(credits.director.id);
    credits.cast.slice(0, 3).forEach((a) => actorIds.add(a.id));
  }

  const profile: TasteProfile = {
    genreCounts,
    directorIds: Array.from(directorIds),
    actorIds: Array.from(actorIds),
    eligibleMovieIds: Array.from(eligibleIds),
    version: PROFILE_VERSION,
  };

  await writeCachedProfile(profile);
  return profile;
}