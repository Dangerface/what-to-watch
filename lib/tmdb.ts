import { SourceType } from '../store/session';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const RUNTIME_TOLERANCE_MINUTES = 15;

export type Genre = { id: number; name: string };

export async function fetchGenres(): Promise<Genre[]> {
  const res = await fetch(
    `${TMDB_BASE_URL}/genre/movie/list?api_key=${process.env.EXPO_PUBLIC_TMDB_API_KEY}&language=en-US`
  );
  if (!res.ok) throw new Error(`TMDb fejl: ${res.status}`);
  const data = await res.json();
  return data.genres as Genre[];
}

export type WatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
};

export async function fetchWatchProviders(region: string = 'DK'): Promise<WatchProvider[]> {
  const res = await fetch(
    `${TMDB_BASE_URL}/watch/providers/movie?api_key=${process.env.EXPO_PUBLIC_TMDB_API_KEY}&watch_region=${region}`
  );
  if (!res.ok) {
    const text = await res.text();
    console.error('TMDb watch-providers fejl:', res.status, text);
    throw new Error(`TMDb fejl: ${res.status}`);
  }
  const data = await res.json();
  return data.results as WatchProvider[];
}

export type Movie = {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  poster_path: string | null;
  runtime?: number;
};

export type DiscoverFilters = {
  genreIds: number[];
  maxRuntimeMinutes: number | null;
  familyFriendly: boolean;
  providerIds: number[];
  sourceType: SourceType | null;
  page?: number;
};

const GENRE_ANIMATION = 16;
const GENRE_FAMILY = 10751;

function computeExcludedGenres(filters: DiscoverFilters): number[] {
  const excluded: number[] = [];
  if (!filters.genreIds.includes(GENRE_ANIMATION)) excluded.push(GENRE_ANIMATION);
  if (!filters.familyFriendly && !filters.genreIds.includes(GENRE_FAMILY)) excluded.push(GENRE_FAMILY);
  return excluded;
}

export function filterExcludedGenres(movies: Movie[], filters: DiscoverFilters): Movie[] {
  const excluded = computeExcludedGenres(filters);
  if (excluded.length === 0) return movies;
  return movies.filter((m) => !m.genre_ids.some((g) => excluded.includes(g)));
}

export async function discoverMovies(filters: DiscoverFilters, extraParams: Record<string, string> = {}): Promise<Movie[]> {
  const params = new URLSearchParams({
    api_key: process.env.EXPO_PUBLIC_TMDB_API_KEY!,
    language: 'en-US',
    page: String(filters.page ?? 1),
    ...extraParams,
  });

  // Genre er bevidst IKKE et hårdt filter her — det er en scoring-bonus i lib/scoring.ts,
  // så anbefalinger aldrig løber tør pga. et snævert genre-valg.

  if (filters.maxRuntimeMinutes != null) {
    params.set('with_runtime.lte', String(filters.maxRuntimeMinutes + RUNTIME_TOLERANCE_MINUTES));
  }
  if (filters.familyFriendly) {
    params.set('certification_country', 'DK');
    params.set('certification.lte', '11');
  }
  if (filters.providerIds.length > 0) {
    params.set('with_watch_providers', filters.providerIds.join('|'));
    params.set('watch_region', 'DK');
    if (filters.sourceType === 'streamingOnly') {
      params.set('with_watch_monetization_types', 'flatrate');
    }
  }

  const excludedGenres = computeExcludedGenres(filters);
  if (excludedGenres.length > 0) params.set('without_genres', excludedGenres.join(','));

  const res = await fetch(`${TMDB_BASE_URL}/discover/movie?${params.toString()}`);
  if (!res.ok) throw new Error(`TMDb fejl: ${res.status}`);
  const data = await res.json();
  return data.results as Movie[];
}

export type DiscoverVibe = 'classics' | 'hiddenGem';

function vibeParams(vibe: DiscoverVibe): Record<string, string> {
  const thisYear = new Date().getFullYear();
  switch (vibe) {
    case 'classics':
      return { 'primary_release_date.lte': `${thisYear - 25}-12-31`, 'vote_count.gte': '200', sort_by: 'vote_average.desc' };
    case 'hiddenGem':
      return { 'vote_average.gte': '7.0', 'vote_count.gte': '50', 'vote_count.lte': '500', sort_by: 'vote_average.desc' };
  }
}

export async function discoverMoviesForVibe(vibe: DiscoverVibe, filters: DiscoverFilters): Promise<Movie[]> {
  return discoverMovies(filters, vibeParams(vibe));
}

export async function discoverTrending(filters: DiscoverFilters): Promise<Movie[]> {
  return discoverMovies(filters, { sort_by: 'popularity.desc' });
}

const MUST_WATCH_VOTE_THRESHOLDS = [1000, 500, 200, 50];
const MUST_WATCH_MIN_RESULTS = 10;

export async function discoverMustWatch(filters: DiscoverFilters): Promise<Movie[]> {
  let best: Movie[] = [];
  for (const threshold of MUST_WATCH_VOTE_THRESHOLDS) {
    const results = await discoverMovies(filters, {
      'vote_average.gte': '7.5',
      'vote_count.gte': String(threshold),
      sort_by: 'vote_average.desc',
    });
    best = results;
    if (results.length >= MUST_WATCH_MIN_RESULTS) break;
  }
  return best;
}

export async function fetchMovieCertificationDK(movieId: number): Promise<boolean> {
  const res = await fetch(`${TMDB_BASE_URL}/movie/${movieId}/release_dates?api_key=${process.env.EXPO_PUBLIC_TMDB_API_KEY}`);
  if (!res.ok) return true;
  const data = await res.json();
  const dk = data.results?.find((r: any) => r.iso_3166_1 === 'DK');
  const certification = dk?.release_dates?.[0]?.certification;
  if (!certification) return true;
  return ['A', '7', '11'].includes(certification);
}

export async function fetchMovieAvailableOnProviders(
  movieId: number,
  providerIds: number[],
  sourceType: SourceType | null
): Promise<boolean> {
  const res = await fetch(`${TMDB_BASE_URL}/movie/${movieId}/watch/providers?api_key=${process.env.EXPO_PUBLIC_TMDB_API_KEY}`);
  if (!res.ok) return false;
  const data = await res.json();
  const dk = data.results?.DK;
  if (!dk) return false;

  const lists = sourceType === 'streamingOnly' ? [dk.flatrate ?? []] : [dk.flatrate ?? [], dk.rent ?? [], dk.buy ?? []];
  const availableIds = lists.flat().map((p: any) => p.provider_id);
  return providerIds.some((id) => availableIds.includes(id));
}