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
  genre_ids: number[];
  poster_path: string | null;
};

export async function discoverMovies(genreIds: number[]): Promise<Movie[]> {
  const genreParam = genreIds.join('|'); // "|" = mindst én af genrerne
  const res = await fetch(
    `${TMDB_BASE_URL}/discover/movie?api_key=${process.env.EXPO_PUBLIC_TMDB_API_KEY}` +
      `&with_genres=${genreParam}&sort_by=vote_average.desc&vote_count.gte=50&language=en-US`
  );
  if (!res.ok) throw new Error(`TMDb fejl: ${res.status}`);
  const data = await res.json();
  return data.results as Movie[];
}