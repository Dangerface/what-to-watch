// lib/scoring.ts
import { Person } from '../store/session';
import { Movie } from './tmdb';

// --- Genre & decade tælling -------------------------------------------------

export function tallyGenreVotes(persons: Person[]): Record<number, number> {
  const votes: Record<number, number> = {};
  for (const p of persons) {
    for (const id of p.genreIds) votes[id] = (votes[id] ?? 0) + 1;
  }
  return votes;
}

export function tallyDecadeVotes(persons: Person[]): Record<string, number> {
  const votes: Record<string, number> = {};
  for (const p of persons) {
    for (const d of p.decades) votes[d] = (votes[d] ?? 0) + 1;
  }
  return votes;
}

export function decadeOf(releaseDate: string): string {
  const year = parseInt(releaseDate.slice(0, 4), 10);
  return `${Math.floor(year / 10) * 10}s`;
}

// --- Bayesian-vægtet rating ---------------------------------------------

/** Gennemsnitlig vote_average for hele den aktuelle kandidat-pulje. Bruges som "C" i formlen. */
export function computeGlobalAverage(movies: { vote_average: number }[]): number {
  if (movies.length === 0) return 6.0; // fornuftigt fallback hvis puljen skulle være tom
  return movies.reduce((sum, m) => sum + m.vote_average, 0) / movies.length;
}

/**
 * IMDb-stil bayesian rating: trækker ratings med få stemmer mod gennemsnittet,
 * så en 9.0 med 51 stemmer ikke automatisk slår en 8.5 med 2000 stemmer.
 * minVotes (m) bør matche jeres vote_count.gte-filter i discoverMovies.
 */
export function bayesianRating(
  vote_average: number,
  vote_count: number,
  globalAverage: number,
  minVotes = 50
): number {
  return (
    (vote_count / (vote_count + minVotes)) * vote_average +
    (minVotes / (vote_count + minVotes)) * globalAverage
  );
}

// --- Genre/decade-score --------------------------------------------------

export function scoreMovie(
  movie: { genre_ids: number[]; release_date: string },
  genreVotes: Record<number, number>,
  decadeVotes: Record<string, number>
): number {
  const genreScore = movie.genre_ids.reduce((sum, id) => sum + (genreVotes[id] ?? 0), 0);
  const decadeScore = decadeVotes[decadeOf(movie.release_date)] ?? 0;
  return genreScore * 1000 + decadeScore;
}

// --- Samlet rangering ------------------------------------------------------

export type RankedMovie = { movie: Movie; score: number; rating: number };

/**
 * Regner global-gennemsnit, scorer og sorterer en hel pulje i ét kald.
 * Primær sortering: genre/decade-score. Tiebreak: bayesian rating (ikke rå vote_average).
 */
export function rankMovies(
  movies: Movie[],
  genreVotes: Record<number, number>,
  decadeVotes: Record<string, number>
): RankedMovie[] {
  const globalAverage = computeGlobalAverage(movies);

  return movies
    .map((movie) => ({
      movie,
      score: scoreMovie(movie, genreVotes, decadeVotes),
      rating: bayesianRating(movie.vote_average, movie.vote_count, globalAverage),
    }))
    .sort((a, b) => b.score - a.score || b.rating - a.rating);
}