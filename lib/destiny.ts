import AsyncStorage from '@react-native-async-storage/async-storage';
import { popularityAdjustedScore, weightedShuffle } from './scoring';
import { DestinyPool, DestinyPoolEntry, getDestinyPool, getMovieJailIds, getWatched, saveDestinyPool } from './storage';
import { fetchRecommendationsPage, fetchSimilarPage, Movie } from './tmdb';

const MAX_SEEDS = 6;
const MIN_RATING_FOR_SEED = 8;
const MIN_SEEDS_REQUIRED = 3;
const POOL_SIZE = 60;
const MIN_POOL_SIZE_TARGET = 30;
const FINAL_PICK_POOL_SIZE = 15;
const MIN_VOTE_COUNT = 1000;
const MIN_VOTE_AVERAGE = 5.5;
const RECENT_AVOID_COUNT = 5;
const DESTINY_RECENT_KEY = 'destinyRecentlyShown';
const POOL_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const POOL_VERSION = 5;

export type DestinyResult =
  | { status: 'insufficient-seeds'; seedCount: number; required: number }
  | { status: 'ok'; topCandidates: Movie[] };

export function passesQualityBar(movie: Movie): boolean {
  return movie.vote_count >= MIN_VOTE_COUNT && movie.vote_average >= MIN_VOTE_AVERAGE;
}

function sameIdSet(a: number[], b: Set<number>): boolean {
  if (a.length !== b.size) return false;
  return a.every((id) => b.has(id));
}

function isPoolStale(pool: DestinyPool, eligibleIds: Set<number>): boolean {
  if (pool.version !== POOL_VERSION) return true;
  if (Date.now() - new Date(pool.generatedAt).getTime() > POOL_MAX_AGE_MS) return true;
  return !sameIdSet(pool.eligibleMovieIds, eligibleIds);
}

type CandidateMap = Map<number, { movie: Movie; count: number }>;

async function fetchCandidatesForSeeds(
  seedMovieIds: number[],
  excludedIds: Set<number>,
  page: number,
  target: CandidateMap
): Promise<void> {
  for (const seedId of seedMovieIds) {
    const [rec, sim] = await Promise.all([fetchRecommendationsPage(seedId, page), fetchSimilarPage(seedId, page)]);
    for (const movie of [...rec.movies, ...sim.movies]) {
      if (excludedIds.has(movie.id) || seedMovieIds.includes(movie.id)) continue;
      if (!passesQualityBar(movie)) continue;
      const existing = target.get(movie.id);
      if (existing) existing.count += 1;
      else target.set(movie.id, { movie, count: 1 });
    }
  }
}

async function buildPool(seedMovieIds: number[], excludedIds: Set<number>): Promise<DestinyPoolEntry[]> {
  const candidateSeedCounts: CandidateMap = new Map();

  await fetchCandidatesForSeeds(seedMovieIds, excludedIds, 1, candidateSeedCounts);
  if (candidateSeedCounts.size < MIN_POOL_SIZE_TARGET) {
    await fetchCandidatesForSeeds(seedMovieIds, excludedIds, 2, candidateSeedCounts);
  }

  const entries: DestinyPoolEntry[] = Array.from(candidateSeedCounts.values()).map(({ movie, count }) => ({
    movie,
    seedCount: count,
  }));

  entries.sort((a, b) => {
    if (a.seedCount !== b.seedCount) return b.seedCount - a.seedCount;
    return (
      popularityAdjustedScore(b.movie.vote_average, b.movie.vote_count) -
      popularityAdjustedScore(a.movie.vote_average, a.movie.vote_count)
    );
  });

  return entries.slice(0, POOL_SIZE);
}

async function getRecentlyShown(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(DESTINY_RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function markDestinyShown(movieId: number): Promise<void> {
  const recent = await getRecentlyShown();
  const updated = [movieId, ...recent.filter((id) => id !== movieId)].slice(0, RECENT_AVOID_COUNT);
  await AsyncStorage.setItem(DESTINY_RECENT_KEY, JSON.stringify(updated));
}

export async function getDestinyCandidates(forceRefresh = false): Promise<DestinyResult> {
  const [watched, jailedIds] = await Promise.all([getWatched(), getMovieJailIds()]);
  const lovedMovies = watched.filter((e) => (e.rating ?? 0) >= MIN_RATING_FOR_SEED);

  if (lovedMovies.length < MIN_SEEDS_REQUIRED) {
    return { status: 'insufficient-seeds', seedCount: lovedMovies.length, required: MIN_SEEDS_REQUIRED };
  }

  const eligibleIds = new Set(lovedMovies.map((e) => e.movie.id));
  let pool = forceRefresh ? null : await getDestinyPool();

  if (!pool || isPoolStale(pool, eligibleIds)) {
    const shuffledSeeds = [...lovedMovies].sort(() => Math.random() - 0.5).slice(0, MAX_SEEDS);
    const seedMovieIds = shuffledSeeds.map((s) => s.movie.id);
    const excludedIds = new Set([...watched.map((e) => e.movie.id), ...jailedIds]);

    const entries = await buildPool(seedMovieIds, excludedIds);
    pool = {
      entries,
      generatedAt: new Date().toISOString(),
      seedMovieIds,
      eligibleMovieIds: Array.from(eligibleIds),
      version: POOL_VERSION,
    };
    await saveDestinyPool(pool);
  }

  const currentWatchedIds = new Set(watched.map((e) => e.movie.id));
  let freshEntries = pool.entries.filter((e) => !currentWatchedIds.has(e.movie.id) && !jailedIds.has(e.movie.id));

  const recentlyShown = new Set(await getRecentlyShown());
  const notRecentlyShown = freshEntries.filter((e) => !recentlyShown.has(e.movie.id));
  if (notRecentlyShown.length > 0) freshEntries = notRecentlyShown;

  // Different subset and order every visit, still biased toward better matches.
  const shuffled = weightedShuffle(
    freshEntries,
    (e) => popularityAdjustedScore(e.movie.vote_average, e.movie.vote_count) * (1 + e.seedCount)
  );

  return { status: 'ok', topCandidates: shuffled.slice(0, FINAL_PICK_POOL_SIZE).map((e) => e.movie) };
}