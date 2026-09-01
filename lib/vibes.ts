import { Vibe } from '../store/session';
import { getCuratedMovies } from './curatedLists';
import {
  DiscoverFilters,
  DiscoverVibe,
  Movie,
  RUNTIME_TOLERANCE_MINUTES,
  discoverMovies,
  discoverMoviesForVibe,
  discoverMustWatch,
  discoverTrending,
  fetchMovieAvailableOnProviders,
  fetchMovieCertificationDK,
  filterExcludedGenres,
} from './tmdb';

const HAS_CURATED: Vibe[] = ['cult', 'awardWinners', 'mustWatch'];
const LIVE_VIBE_MAP: Partial<Record<Vibe, DiscoverVibe>> = { classics: 'classics', hiddenGem: 'hiddenGem' };

function filterByRuntime(movies: Movie[], maxMinutes: number | null): Movie[] {
  if (maxMinutes == null) return movies;
  const tolerance = maxMinutes + RUNTIME_TOLERANCE_MINUTES;
  return movies.filter((m) => m.runtime == null || m.runtime <= tolerance);
}

function dedupe(movies: Movie[]): Movie[] {
  const seen = new Set<number>();
  return movies.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
}

async function verifyCuratedCandidates(movies: Movie[], filters: DiscoverFilters, limit = 40): Promise<Movie[]> {
  if (!filters.familyFriendly && filters.providerIds.length === 0) return movies;

  const sorted = [...movies].sort((a, b) => b.vote_average - a.vote_average).slice(0, limit);

  const checked = await Promise.all(
    sorted.map(async (movie) => {
      if (filters.familyFriendly && !(await fetchMovieCertificationDK(movie.id))) return null;
      if (filters.providerIds.length > 0 && !(await fetchMovieAvailableOnProviders(movie.id, filters.providerIds, filters.sourceType))) return null;
      return movie;
    })
  );

  return checked.filter((m): m is Movie => m !== null);
}

export async function getMoviesForVibe(vibe: Vibe, filters: DiscoverFilters): Promise<Movie[]> {
  const curatedRaw = HAS_CURATED.includes(vibe) ? getCuratedMovies(vibe) : [];
  const curatedFiltered = filterExcludedGenres(filterByRuntime(curatedRaw, filters.maxRuntimeMinutes), filters);
  const curatedVerified = await verifyCuratedCandidates(curatedFiltered, filters);

  let live: Movie[] = [];
  if (vibe === 'trending') live = await discoverTrending(filters);
  else if (vibe === 'mustWatch') live = await discoverMustWatch(filters);
  else if (LIVE_VIBE_MAP[vibe]) live = await discoverMoviesForVibe(LIVE_VIBE_MAP[vibe]!, filters);

  return dedupe([...curatedVerified, ...live]);
}

export async function getMoviesForNoVibe(filters: DiscoverFilters): Promise<Movie[]> {
  return discoverMovies(filters, { sort_by: 'vote_average.desc', 'vote_count.gte': '100' });
}