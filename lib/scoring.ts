import { Movie } from './tmdb';

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

export type RankedMovie = { movie: Movie; rating: number };

export function rankMovies(movies: Movie[]): RankedMovie[] {
  const globalAverage = computeGlobalAverage(movies);
  return movies
    .map((movie) => ({ movie, rating: bayesianRating(movie.vote_average, movie.vote_count, globalAverage) }))
    .sort((a, b) => b.rating - a.rating);
}