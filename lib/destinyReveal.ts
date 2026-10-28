import { processBatched } from './batch';
import { getAllCuratedMovies } from './curatedLists';
import { passesQualityBar } from './destiny';
import { TasteProfile } from './tasteProfile';
import {
  computeSharedKeywordIds,
  discoverMoviesByKeywords,
  fetchMovieCreditsAndKeywords,
  fetchRecommendationsPage,
  fetchSimilarPage,
  Movie,
} from './tmdb';

const VERIFY_BATCH_SIZE = 8;
const RAW_POOL_CAP = 150;
const SCORING_SHORTLIST_SIZE = 40;
const MIN_CURATED_GENRE_COVERAGE = 2;
const VOTE_COUNT_CAP = 10000;
const BASE_PAGES_PER_SEED = 3;
const KEYWORD_SUPPLEMENT_PAGES = 2;

export type PoolCandidate = {
  movie: Movie;
  matchedPickIds: number[];
  bestRankIndex: number;
  isCurated: boolean;
};

export type ScoredCandidate = { movie: Movie; score: number; matchedPickIds: number[] };

function computeGenrePickCoverage(picks: Movie[]): Record<number, number> {
  const coverage: Record<number, number> = {};
  for (const pick of picks) {
    const uniqueGenres = new Set(pick.genre_ids);
    for (const g of uniqueGenres) coverage[g] = (coverage[g] ?? 0) + 1;
  }
  return coverage;
}

function genreCoverageScore(movie: Movie, coverage: Record<number, number>, pickCount: number): number {
  if (pickCount === 0) return 0;
  const best = Math.max(0, ...movie.genre_ids.map((g) => coverage[g] ?? 0));
  return best / pickCount;
}

export async function buildRevealPool(chosenMovies: Movie[], excludedIds: Set<number>): Promise<PoolCandidate[]> {
  const chosenIds = new Set(chosenMovies.map((m) => m.id));
  const candidateMap = new Map<number, PoolCandidate>();

  for (const seed of chosenMovies) {
    for (let page = 1; page <= BASE_PAGES_PER_SEED; page++) {
      const [rec, sim] = await Promise.all([fetchRecommendationsPage(seed.id, page), fetchSimilarPage(seed.id, page)]);

      for (const listMovies of [rec.movies, sim.movies]) {
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

  const pickKeywordData = await Promise.all(chosenMovies.map((m) => fetchMovieCreditsAndKeywords(m.id)));
  const sharedKeywords = computeSharedKeywordIds(
    pickKeywordData.map((d) => d.keywordIds),
    Math.min(2, chosenMovies.length)
  );

  if (sharedKeywords.length > 0) {
    for (let page = 1; page <= KEYWORD_SUPPLEMENT_PAGES; page++) {
      const { movies } = await discoverMoviesByKeywords(sharedKeywords, page);
      for (const movie of movies) {
        if (excludedIds.has(movie.id) || chosenIds.has(movie.id) || candidateMap.has(movie.id)) continue;
        if (!passesQualityBar(movie)) continue;
        candidateMap.set(movie.id, { movie, matchedPickIds: [], bestRankIndex: Infinity, isCurated: false });
      }
    }
  }

  const coverage = computeGenrePickCoverage(chosenMovies);
  const curated = getAllCuratedMovies();
  for (const movie of curated) {
    if (excludedIds.has(movie.id) || chosenIds.has(movie.id) || candidateMap.has(movie.id)) continue;
    if (!passesQualityBar(movie)) continue;
    const rawCoverage = Math.max(0, ...movie.genre_ids.map((g) => coverage[g] ?? 0));
    if (rawCoverage >= MIN_CURATED_GENRE_COVERAGE) {
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

  const genreCoverage = computeGenrePickCoverage(chosenMovies);
  const cappedLogMax = Math.log10(VOTE_COUNT_CAP + 1);

  const cheapScored = candidates.map((c) => {
    const distinctPickCountNorm = chosenMovies.length > 0 ? c.matchedPickIds.length / chosenMovies.length : 0;
    const bestRankPoint = c.bestRankIndex === Infinity ? 0 : Math.max(0, 1 - c.bestRankIndex / 40);
    const genreScore = genreCoverageScore(c.movie, genreCoverage, chosenMovies.length);
    const ratingPoint = c.movie.vote_average / 10;
    const cappedVotes = Math.min(c.movie.vote_count, VOTE_COUNT_CAP);
    const votesPoint = Math.log10(cappedVotes + 1) / cappedLogMax;

    const cheapScore = distinctPickCountNorm * 0.35 + genreScore * 0.3 + bestRankPoint * 0.15 + ratingPoint * 0.1 + votesPoint * 0.1;

    return { candidate: c, distinctPickCountNorm, bestRankPoint, genreScore, ratingPoint, votesPoint, cheapScore };
  });

  cheapScored.sort((a, b) => b.cheapScore - a.cheapScore);
  const shortlist = cheapScored.slice(0, SCORING_SHORTLIST_SIZE);

  const [pickData, shortlistWithData] = await Promise.all([
    Promise.all(chosenMovies.map((m) => fetchMovieCreditsAndKeywords(m.id))),
    processBatched(shortlist, VERIFY_BATCH_SIZE, async (entry) => ({
      ...entry,
      data: await fetchMovieCreditsAndKeywords(entry.candidate.movie.id),
    })),
  ]);

  const pickDirectorIds = new Set(pickData.map((c) => c.director?.id).filter((id): id is number => id != null));
  const pickActorIds = new Set(pickData.flatMap((c) => c.cast.slice(0, 3).map((a) => a.id)));
  const pickKeywordSets = pickData.map((c) => c.keywordIds);

  const finalScored: ScoredCandidate[] = shortlistWithData.map((entry) => {
    const { candidate, distinctPickCountNorm, bestRankPoint, genreScore, ratingPoint, votesPoint, data } = entry;

    const candidateKeywordSet = new Set(data.keywordIds);
    let picksSharingAKeyword = 0;
    let totalSharedKeywords = 0;
    for (const pickKeywords of pickKeywordSets) {
      const shared = pickKeywords.filter((k) => candidateKeywordSet.has(k)).length;
      if (shared > 0) picksSharingAKeyword += 1;
      totalSharedKeywords += shared;
    }
    const keywordCoverageNorm = chosenMovies.length > 0 ? picksSharingAKeyword / chosenMovies.length : 0;
    const keywordDepthNorm = Math.min(totalSharedKeywords, 6) / 6;
    const keywordScore = keywordCoverageNorm * 0.7 + keywordDepthNorm * 0.3;

    const directorMatchesPicks = data.director && pickDirectorIds.has(data.director.id) ? 1 : 0;
    const candidateActorIds = data.cast.slice(0, 3).map((a) => a.id);
    const actorMatchesPicks = candidateActorIds.filter((id) => pickActorIds.has(id)).length / 3;

    const directorInTaste = data.director && taste.directorIds.includes(data.director.id) ? 1 : 0;
    const matchingTasteActors = candidateActorIds.filter((id) => taste.actorIds.includes(id)).length;
    const actorInTaste = matchingTasteActors / 3;

    const picksAxis =
      keywordScore * 0.28 +
      distinctPickCountNorm * 0.12 +
      genreScore * 0.1 +
      directorMatchesPicks * 0.05 +
      actorMatchesPicks * 0.03 +
      bestRankPoint * 0.02;

    const tasteAxis = directorInTaste * 0.15 + actorInTaste * 0.15;
    const qualityAxis = ratingPoint * 0.05 + votesPoint * 0.05;

    return { movie: candidate.movie, score: picksAxis + tasteAxis + qualityAxis, matchedPickIds: candidate.matchedPickIds };
  });

  finalScored.sort((a, b) => b.score - a.score);
  return finalScored;
}