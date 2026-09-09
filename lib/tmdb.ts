import { SourceType } from '../store/session';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const RUNTIME_TOLERANCE_MINUTES = 15;

// --- Genrer ---

export type Genre = { id: number; name: string };

export async function fetchGenres(): Promise<Genre[]> {
  const res = await fetch(
    `${TMDB_BASE_URL}/genre/movie/list?api_key=${process.env.EXPO_PUBLIC_TMDB_API_KEY}&language=en-US`
  );
  if (!res.ok) throw new Error(`TMDb fejl: ${res.status}`);
  const data = await res.json();
  return data.genres as Genre[];
}

// --- Streaming-udbydere ---

export type WatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority?: number;
};

const GLOBAL_EXCLUDED_PROVIDER_NAMES = [
  'Apple TV Store',
  'Google Play Movies',
  'Netflix Kids',
  'Blockbuster',
];

const DK_EXCLUDED_PROVIDER_NAMES = [
  'JustWatch TV',
  'Curiosity Stream',
  'DOCSVILLE',
  'WOW Presents Plus',
  'Magellan TV',
  'BroadwayHD',
  'Filmzie',
  'Dekkoo',
  'True Story',
  'DocAlliance Films',
  'Hoichoi',
  'Eventive',
  'FilmBox+',
  'Takflix',
  'Sun Nxt',
  'Crunchyroll',
  'Allente',
  'FOUND TV',
  'Jolt Film',
  'Kocowa',
  'MUBI',
  'CaixaForum+',
  'Artiflix',
  'Artify',
  'Pijama Films',
  'TV2 Skyshowtime',
  'TV 2 ØSTJYLLAND',
  'TV SYD',
  'TV MIDTVEST',
  'TV 2 Bornholm',
  'TV 2 Kosmopol',
  'TV 2 Nord',
  'Lionsgate+ Amazon Channels',
  'Bloodstream',
  'KableOne',
  'BritBox',
  'Crunchyroll Amazon Channel',
  'Cultpix',
  'Plex Channel',
  'Plex',
];

const DK_PRIORITY_ORDER = [
  'Netflix',
  'HBO',
  'Disney',
  'DR',
  'TV 2',
  'Viaplay',
  'Apple TV',
  'Amazon Prime Video',
  'Filmstriben',
  'SF Anytime',
  'YouTube Premium',
  'Nordisk Film+',
  'SkyShowtime',
];

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

function isExcluded(providerName: string, region: string): boolean {
  const excludedNames = region === 'DK' ? [...GLOBAL_EXCLUDED_PROVIDER_NAMES, ...DK_EXCLUDED_PROVIDER_NAMES] : GLOBAL_EXCLUDED_PROVIDER_NAMES;
  return excludedNames.some((excluded) => normalize(providerName) === normalize(excluded)); // præcist match, ikke "indeholder"
}

function priorityIndex(providerName: string): number {
  const index = DK_PRIORITY_ORDER.findIndex((name) => normalize(providerName).includes(normalize(name)));
  return index === -1 ? DK_PRIORITY_ORDER.length + 1000 : index;
}

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
  const allProviders = data.results as WatchProvider[];

  console.log(`[providers] ${allProviders.length} rå tjenester fra TMDb (${region}): ${allProviders.map((p) => p.provider_name).join(', ')}`);

  const excludedNames = region === 'DK' ? [...GLOBAL_EXCLUDED_PROVIDER_NAMES, ...DK_EXCLUDED_PROVIDER_NAMES] : GLOBAL_EXCLUDED_PROVIDER_NAMES;
  const unmatchedExclusions = excludedNames.filter(
    (name) => !allProviders.some((p) => normalize(p.provider_name) === normalize(name))
  );
  if (unmatchedExclusions.length > 0) {
    console.log(`[providers] disse udelukkelses-navne matchede INTET — tjek stavning: ${unmatchedExclusions.join(', ')}`);
  }

  const filtered = allProviders.filter((p) => !isExcluded(p.provider_name, region));

  return filtered.sort((a, b) => {
    const prioA = priorityIndex(a.provider_name);
    const prioB = priorityIndex(b.provider_name);
    if (prioA !== prioB) return prioA - prioB;
    return (a.display_priority ?? 999) - (b.display_priority ?? 999);
  });
}

export async function fetchMovieProviders(movieId: number, sourceType: SourceType | null): Promise<WatchProvider[]> {
  const res = await fetch(`${TMDB_BASE_URL}/movie/${movieId}/watch/providers?api_key=${process.env.EXPO_PUBLIC_TMDB_API_KEY}`);
  if (!res.ok) return [];
  const data = await res.json();
  const dk = data.results?.DK;
  if (!dk) return [];

  const lists = sourceType === 'streamingOnly' ? [dk.flatrate ?? []] : [dk.flatrate ?? [], dk.rent ?? [], dk.buy ?? []];
  const merged = lists.flat() as WatchProvider[];
  const seen = new Set<number>();
  return merged.filter((p) => {
    if (seen.has(p.provider_id)) return false;
    seen.add(p.provider_id);
    return true;
  });
}

// --- Film ---

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

export type DiscoverPage = { movies: Movie[]; totalPages: number };

export async function fetchDiscoverPage(
  filters: DiscoverFilters,
  page: number,
  extraParams: Record<string, string> = {}
): Promise<DiscoverPage> {
  const params = new URLSearchParams({
    api_key: process.env.EXPO_PUBLIC_TMDB_API_KEY!,
    language: 'en-US',
    page: String(page),
    ...extraParams,
  });

  if (filters.genreIds.length > 0) params.set('with_genres', filters.genreIds.join('|'));
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
  console.log(`[discover] side ${page}: ${data.results?.length ?? 0} film, total_pages=${data.total_pages}, total_results=${data.total_results}`);
  return { movies: data.results as Movie[], totalPages: Math.min(data.total_pages ?? 1, 500) };
}

export type LiveVibe = 'classics' | 'hiddenGem' | 'trending' | 'mustWatch' | 'generic';
export const MUST_WATCH_VOTE_THRESHOLDS = [1000, 500, 200, 50];

export function liveVibeParams(vibe: LiveVibe, mustWatchThreshold?: number): Record<string, string> {
  const thisYear = new Date().getFullYear();
  switch (vibe) {
    case 'classics':
      return { 'primary_release_date.lte': `${thisYear - 25}-12-31`, 'vote_count.gte': '200', sort_by: 'vote_average.desc' };
    case 'hiddenGem':
      return { 'vote_average.gte': '7.0', 'vote_count.gte': '50', 'vote_count.lte': '500', sort_by: 'vote_average.desc' };
    case 'trending':
      return { sort_by: 'popularity.desc' };
    case 'mustWatch':
      return { 'vote_average.gte': '6.0', 'vote_count.gte': String(mustWatchThreshold ?? 50), sort_by: 'vote_average.desc' };
    case 'generic':
      return { sort_by: 'popularity.desc', 'vote_average.gte': '5.5' };
  }
}

// --- Verifikation af enkeltfilm ---

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

// --- "Flere som denne" ---

export type MovieListPage = { movies: Movie[]; totalPages: number };

export async function fetchRecommendationsPage(movieId: number, page: number): Promise<MovieListPage> {
  const res = await fetch(
    `${TMDB_BASE_URL}/movie/${movieId}/recommendations?api_key=${process.env.EXPO_PUBLIC_TMDB_API_KEY}&language=en-US&page=${page}`
  );
  if (!res.ok) return { movies: [], totalPages: 0 };
  const data = await res.json();
  return { movies: data.results as Movie[], totalPages: Math.min(data.total_pages ?? 0, 500) };
}

export async function fetchSimilarPage(movieId: number, page: number): Promise<MovieListPage> {
  const res = await fetch(
    `${TMDB_BASE_URL}/movie/${movieId}/similar?api_key=${process.env.EXPO_PUBLIC_TMDB_API_KEY}&language=en-US&page=${page}`
  );
  if (!res.ok) return { movies: [], totalPages: 0 };
  const data = await res.json();
  return { movies: data.results as Movie[], totalPages: Math.min(data.total_pages ?? 0, 500) };
}