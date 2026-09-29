import { processBatched } from './batch';
import { getAllCuratedMovies } from './curatedLists';
import { passesQualityBar } from './destiny';
import { TasteProfile } from './tasteProfile';
import { fetchMovieCredits, fetchRecommendationsPage, fetchSimilarPage, Movie } from './tmdb';

const VERIFY_BATCH_SIZE = 8;
const RAW_POOL_CAP = 100;
const SCORING_SHORTLIST_SIZE = 30;
const MIN_CURATED_GENRE_MATCHES = 2;
const VOTE_COUNT_CAP = 10000;
const ERA_DECAY_YEARS = 30;

export type PoolCandidate = {
  movie: Movie;
  matchedPickIds: number[];
  bestRankIndex: number; // Infinity if it never appeared in a TMDb neighbor list (curated-only)
  isCurated: boolean;
};

export type ScoredCandidate = { movie: Movie; score: number; matchedPickIds: number[] };

function hasGenreOverlap(a: number[], b: number[]): boolean {
  return a.some((g) => b.includes(g));
}

function averageReleaseYear(movies: Movie[]): number {
  const years = movies.map((m) => parseInt(m.release_date?.slice(0, 4) ?? '', 10)).filter((y) => !isNaN(y));
  if (years.length === 0) return new Date().getFullYear();
  return years.reduce((s, y) => s + y, 0) / years.length;
}

export async function buildRevealPool(chosenMovies: Movie[], excludedIds: Set<number>): Promise<PoolCandidate[]> {
  const chosenIds = new Set(chosenMovies.map((m) => m.id));
  const candidateMap = new Map<number, PoolCandidate>();

  for (const seed of chosenMovies) {
    for (const page of [1, 2]) {
      const [rec, sim] = await Promise.all([fetchRecommendationsPage(seed.id, page), fetchSimilarPage(seed.id, page)]);

      for (const [listMovies] of [[rec.movies], [sim.movies]] as [Movie[]][]) {
        listMovies.forEach((movie, positionInPage) => {
          if (excludedIds.has(movie.id) || chosenIds.has(movie.id)) return;
          if (!passesQualityBar(movie)) return;

          const globalIndex = (page - 1) * 20 + positionInPage;
          const existing = candidateMap.get(movie.id);

          if (existing) {
            if (!existing.matchedPickIds.includes(seed.id)) existing.matchedPickIds.push(seed.id);
            existing.bestRankIndex = Math.min(existing.bestRankIndex, globalIndex);
          } else {
            candidateMap.set(movie.id, { movie, matchedPickIds: [seed.id], bestRankIndex: globalIndex, isCurated: false });
          }
        });
      }
    }
  }

  // Curated lists, gated: only admitted if they share a genre with at least 2 of the 3 picks.
  const curated = getAllCuratedMovies();
  for (const movie of curated) {
    if (excludedIds.has(movie.id) || chosenIds.has(movie.id) || candidateMap.has(movie.id)) continue;
    if (!passesQualityBar(movie)) continue;
    const matchCount = chosenMovies.filter((pick) => hasGenreOverlap(movie.genre_ids, pick.genre_ids)).length;
    if (matchCount >= MIN_CURATED_GENRE_MATCHES) {
      candidateMap.set(movie.id, { movie, matchedPickIds: [], bestRankIndex: Infinity, isCurated: true });
    }
  }

  return Array.from(candidateMap.values()).slice(0, RAW_POOL_CAP);
}

export async function scoreRevealPool(
  candidates: PoolCandidate[],
  taste: TasteProfile,
  chosenMovies: Movie[]
): Promise<ScoredCandidate[]> {
  if (candidates.length === 0) return [];

  const pickGenreCounts: Record<number, number> = {};
  for (const pick of chosenMovies) {
    for (const g of pick.genre_ids) pickGenreCounts[g] = (pickGenreCounts[g] ?? 0) + 1;
  }
  const maxPickGenreWeight = Math.max(...Object.values(pickGenreCounts), 1);
  const avgPickYear = averageReleaseYear(chosenMovies);

  const cappedLogMax = Math.log10(VOTE_COUNT_CAP + 1);

  const cheapScored = candidates.map((c) => {
    const distinctPickCountNorm = chosenMovies.length > 0 ? c.matchedPickIds.length / chosenMovies.length : 0;
    const bestRankPoint = c.bestRankIndex === Infinity ? 0 : Math.max(0, 1 - c.bestRankIndex / 40);
    const genreWeight = c.movie.genre_ids.reduce((s, g) => s + (pickGenreCounts[g] ?? 0), 0);
    const genreOverlapNorm = genreWeight / maxPickGenreWeight;
    const candidateYear = parseInt(c.movie.release_date?.slice(0, 4) ?? '', 10);
    const eraCloseness = isNaN(candidateYear) ? 0 : Math.max(0, 1 - Math.abs(candidateYear - avgPickYear) / ERA_DECAY_YEARS);
    const ratingPoint = c.movie.vote_average / 10;
    const cappedVotes = Math.min(c.movie.vote_count, VOTE_COUNT_CAP);
    const votesPoint = Math.log10(cappedVotes + 1) / cappedLogMax;

    const cheapScore = distinctPickCountNorm + bestRankPoint + genreOverlapNorm + eraCloseness + ratingPoint + votesPoint;

    return { candidate: c, distinctPickCountNorm, bestRankPoint, genreOverlapNorm, eraCloseness, ratingPoint, votesPoint, cheapScore };
  });

  cheapScored.sort((a, b) => b.cheapScore - a.cheapScore);
  const shortlist = cheapScored.slice(0, SCORING_SHORTLIST_SIZE);

  const [pickCreditsList, shortlistWithCredits] = await Promise.all([
    Promise.all(chosenMovies.map((m) => fetchMovieCredits(m.id))),
    processBatched(shortlist, VERIFY_BATCH_SIZE, async (entry) => ({
      ...entry,
      credits: await fetchMovieCredits(entry.candidate.movie.id),
    })),
  ]);

  const pickDirectorIds = new Set(pickCreditsList.map((c) => c.director?.id).filter((id): id is number => id != null));
  const pickActorIds = new Set(pickCreditsList.flatMap((c) => c.cast.slice(0, 3).map((a) => a.id)));

  const finalScored: ScoredCandidate[] = shortlistWithCredits.map((entry) => {
    const { candidate, distinctPickCountNorm, bestRankPoint, genreOverlapNorm, eraCloseness, ratingPoint, votesPoint, credits } = entry;

    const directorMatchesPicks = credits.director && pickDirectorIds.has(credits.director.id) ? 1 : 0;
    const candidateActorIds = credits.cast.slice(0, 3).map((a) => a.id);
    const actorMatchesPicks = candidateActorIds.filter((id) => pickActorIds.has(id)).length / 3;

    const directorInTaste = credits.director && taste.directorIds.includes(credits.director.id) ? 1 : 0;
    const matchingTasteActors = candidateActorIds.filter((id) => taste.actorIds.includes(id)).length;
    const actorInTaste = matchingTasteActors / 3;

    const score =
      distinctPickCountNorm * 0.1 +
      bestRankPoint * 0.1 +
      genreOverlapNorm * 0.1 +
      directorMatchesPicks * 0.1 +
      actorMatchesPicks * 0.1 +
      eraCloseness * 0.1 +
      directorInTaste * 0.15 +
      actorInTaste * 0.15 +
      ratingPoint * 0.05 +
      votesPoint * 0.05;

    return { movie: candidate.movie, score, matchedPickIds: candidate.matchedPickIds };
  });

  finalScored.sort((a, b) => b.score - a.score);
  return finalScored;
}