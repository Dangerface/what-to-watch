import { Movie } from './tmdb';

const GENRE_MATCH_BONUS = 1.5;

export function computeGlobalAverage(movies: { vote_average: number }[]): number {
  if (movies.length === 0) return 6.0;
  return movies.reduce((sum, m) => sum + m.vote_average, 0) / movies.length;
}

export function bayesianRating(vote_average: number, vote_count: number, globalAverage: number, minVotes = 50): number {
  return (
    (vote_count / (vote_count + minVotes)) * vote_average +
    (minVotes / (vote_count + minVotes)) * globalAverage
  );
}

export type RankedMovie = { movie: Movie; rating: number; matchesGenre: boolean };

export function rankMovies(movies: Movie[], genreIds: number[] = []): RankedMovie[] {
  const globalAverage = computeGlobalAverage(movies);

  return movies
    .map((movie) => {
      const rating = bayesianRating(movie.vote_average, movie.vote_count, globalAverage);
      const matchesGenre = genreIds.length > 0 && movie.genre_ids.some((g) => genreIds.includes(g));
      return { movie, rating, matchesGenre };
    })
    .sort((a, b) => {
      const scoreA = a.rating + (a.matchesGenre ? GENRE_MATCH_BONUS : 0);
      const scoreB = b.rating + (b.matchesGenre ? GENRE_MATCH_BONUS : 0);
      return scoreB - scoreA;
    });
}