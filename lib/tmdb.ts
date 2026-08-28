// lib/tmdb.ts
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export type Genre = { id: number; name: string };

export async function fetchGenres(): Promise<Genre[]> {
  const res = await fetch(
    `${TMDB_BASE_URL}/genre/movie/list?api_key=${process.env.EXPO_PUBLIC_TMDB_API_KEY}&language=en-US`
  );
  if (!res.ok) throw new Error(`TMDb fejl: ${res.status}`);
  const data = await res.json();
  return data.genres as Genre[];
}

export type Movie = {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;   // NY
  genre_ids: number[];
  poster_path: string | null;
};

export async function discoverMovies(genreIds: number[], page: number = 1): Promise<Movie[]> {
  const genreParam = genreIds.join('|');
  const res = await fetch(
    `${TMDB_BASE_URL}/discover/movie?api_key=${process.env.EXPO_PUBLIC_TMDB_API_KEY}` +
      `&with_genres=${genreParam}&sort_by=vote_average.desc&vote_count.gte=50&language=en-US&page=${page}`
  );
  if (!res.ok) throw new Error(`TMDb fejl: ${res.status}`);
  const data = await res.json();
  return data.results as Movie[];
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
  if (!res.ok) throw new Error(`TMDb fejl: ${res.status}`);
  const data = await res.json();
  return data.results as WatchProvider[];
}

