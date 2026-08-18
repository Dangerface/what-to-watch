import { Person } from '../store/session';

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

export function scoreMovie(
  movie: { genre_ids: number[]; release_date: string; vote_average: number },
  genreVotes: Record<number, number>,
  decadeVotes: Record<string, number>
): number {
  const genreScore = movie.genre_ids.reduce((sum, id) => sum + (genreVotes[id] ?? 0), 0);
  const decadeScore = decadeVotes[decadeOf(movie.release_date)] ?? 0;
  return genreScore * 1000 + decadeScore;
}