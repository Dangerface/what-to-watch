import { Vibe } from '../store/session';
import { getCuratedMovies } from './curatedLists';
import { popularityAdjustedScore } from './scoring';
import {
  DiscoverFilters,
  LiveVibe,
  MUST_WATCH_VOTE_THRESHOLDS,
  Movie,
  fetchDiscoverPage,
  fetchMovieAvailableOnProviders,
  fetchMovieCertificationDK,
  filterExcludedGenres,
  liveVibeParams,
} from './tmdb';

const MAX_STREAK = 5;
const VERIFY_BATCH_SIZE = 8;

const LIVE_VIBE_MAP: Partial<Record<Vibe, LiveVibe>> = {
  classics: 'classics',
  hiddenGem: 'hiddenGem',
  trending: 'trending',
  mustWatch: 'mustWatch',
};

function matchesRuntime(movie: Movie, filters: DiscoverFilters): boolean {
  if (filters.maxRuntimeMinutes == null || movie.runtime == null) return true;
  return movie.runtime <= filters.maxRuntimeMinutes + 15;
}

function filterByGenre(movies: Movie[], genreIds: number[]): Movie[] {
  if (genreIds.length === 0) return movies;
  return movies.filter((m) => m.genre_ids.some((g) => genreIds.includes(g)));
}

function byPopularityAdjustedScore(a: Movie, b: Movie): number {
  return popularityAdjustedScore(b.vote_average, b.vote_count) - popularityAdjustedScore(a.vote_average, a.vote_count);
}

class VibeSupplier {
  vibe: Vibe | null;
  private filters: DiscoverFilters;
  private jailedIds: Set<number>;
  private buffer: Movie[] = [];
  private shownIds = new Set<number>();

  private curatedQueue: Movie[] | null = null;
  private curatedTotalCount = 0;
  private curatedTakenCount = 0;
  private curatedRejectedFamilyCount = 0;
  private curatedRejectedProviderCount = 0;

  private livePage = 0;
  private liveTotalPages = Infinity;
  private mustWatchThresholdIndex = 0;
  private liveDone = false;
  private liveFetchedCount = 0;

  private loggedExhausted = false;

  constructor(vibe: Vibe | null, filters: DiscoverFilters, jailedIds: Set<number>) {
    this.vibe = vibe;
    this.filters = filters;
    this.jailedIds = jailedIds;
  }

  private label(): string {
    return this.vibe ?? 'generisk';
  }

  private async initCurated() {
    if (this.curatedQueue !== null) return;
    if (this.vibe === null) {
      this.curatedQueue = [];
      return;
    }
    const raw = filterByGenre(filterExcludedGenres(getCuratedMovies(this.vibe), this.filters), this.filters.genreIds)
      .filter((m) => matchesRuntime(m, this.filters))
      .filter((m) => !this.jailedIds.has(m.id));

    this.curatedQueue = [...raw].sort(byPopularityAdjustedScore);
    this.curatedTotalCount = this.curatedQueue.length;
    console.log(`[${this.label()}] kurateret pulje: ${this.curatedTotalCount} film efter genre/runtime-filter`);
  }

  private get liveVibe(): LiveVibe {
    if (this.vibe === null) return 'generic';
    return LIVE_VIBE_MAP[this.vibe] ?? 'generic';
  }

  private async fetchNextLivePage() {
    if (this.liveDone) return;
    this.livePage += 1;

    const isMustWatch = this.liveVibe === 'mustWatch';
    const threshold = MUST_WATCH_VOTE_THRESHOLDS[this.mustWatchThresholdIndex];
    const extra = isMustWatch ? liveVibeParams('mustWatch', threshold) : liveVibeParams(this.liveVibe);
    const thresholdLabel = isMustWatch ? ` (vote_count.gte=${threshold})` : '';

    const { movies, totalPages } = await fetchDiscoverPage(this.filters, this.livePage, extra);
    this.liveTotalPages = totalPages;

    const fresh = movies.filter((m) => !this.shownIds.has(m.id) && !this.jailedIds.has(m.id));
    const sorted = [...fresh].sort(byPopularityAdjustedScore);
    this.buffer.push(...sorted);
    this.liveFetchedCount += fresh.length;

    console.log(
      `[${this.label()}] TMDb live side ${this.livePage}/${totalPages}${thresholdLabel}: ${fresh.length} nye film, omsorteret efter score×log(stemmer) (${this.liveFetchedCount} totalt fra TMDb indtil nu)`
    );

    if (this.livePage >= this.liveTotalPages) {
      if (isMustWatch && this.mustWatchThresholdIndex < MUST_WATCH_VOTE_THRESHOLDS.length - 1) {
        const nextThreshold = MUST_WATCH_VOTE_THRESHOLDS[this.mustWatchThresholdIndex + 1];
        console.log(`[${this.label()}] tærskel ${threshold} udtømt (alle ${totalPages} sider brugt) — falder til vote_count.gte=${nextThreshold}`);
        this.mustWatchThresholdIndex += 1;
        this.livePage = 0;
      } else {
        this.liveDone = true;
        console.log(`[${this.label()}] TMDb live UDTØMT — ingen flere sider (stopper efter ${this.liveFetchedCount} film totalt fra TMDb)`);
      }
    }
  }

  /** Tager kun ÉN batch fra køen ad gangen — verificerer ikke hele den kuraterede liste på forhånd. */
  private async verifyNextCuratedBatch(): Promise<void> {
    const batch = this.curatedQueue!.splice(0, VERIFY_BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (candidate) => {
        const okFamily = !this.filters.familyFriendly || (await fetchMovieCertificationDK(candidate.id));
        const okProvider =
          this.filters.providerIds.length === 0 ||
          (await fetchMovieAvailableOnProviders(candidate.id, this.filters.providerIds, this.filters.sourceType));
        return { candidate, okFamily, okProvider };
      })
    );

    for (const { candidate, okFamily, okProvider } of results) {
      if (okFamily && okProvider) {
        this.buffer.push(candidate);
        this.curatedTakenCount += 1;
      } else {
        if (!okFamily) this.curatedRejectedFamilyCount += 1;
        if (!okProvider) this.curatedRejectedProviderCount += 1;
      }
    }

    if (this.curatedQueue!.length === 0) {
      console.log(
        `[${this.label()}] kurateret pulje brugt op — ${this.curatedTakenCount} godkendt, ${this.curatedRejectedFamilyCount} afvist pga. aldersgrænse, ${this.curatedRejectedProviderCount} afvist pga. streaming-udbyder, skifter til TMDb live`
      );
    }
  }

  async ensureBuffer(): Promise<void> {
    await this.initCurated();

    while (this.buffer.length === 0) {
      if (this.curatedQueue!.length > 0) {
        await this.verifyNextCuratedBatch();
        continue;
      }

      if (this.liveDone) return;
      await this.fetchNextLivePage();
      if (this.buffer.length === 0 && this.liveDone) return;
    }
  }

  isExhausted(): boolean {
    const done = this.buffer.length === 0 && (this.curatedQueue?.length ?? 0) === 0 && this.liveDone;
    if (done && !this.loggedExhausted) {
      this.loggedExhausted = true;
      console.log(
        `[${this.label()}] FULDT UDTØMT — kurateret brugt: ${this.curatedTakenCount}, live hentet: ${this.liveFetchedCount}, samlet vist: ${this.curatedTakenCount + this.liveFetchedCount}`
      );
    }
    return done;
  }

  take(): Movie | null {
    const movie = this.buffer.shift();
    if (movie) this.shownIds.add(movie.id);
    return movie ?? null;
  }
}

export class ResultsFeed {
  private suppliers: VibeSupplier[];
  private recentVibes: (Vibe | null)[] = [];

  constructor(vibes: Vibe[], filters: DiscoverFilters, jailedIds: Set<number>) {
    const vibeList: (Vibe | null)[] = vibes.length > 0 ? vibes : [null];
    this.suppliers = vibeList.map((v) => new VibeSupplier(v, filters, jailedIds));
  }

  private pickSupplier(available: VibeSupplier[]): VibeSupplier {
    const recentWindow = this.recentVibes.slice(-MAX_STREAK);
    const streakLimited = available.filter((s) => recentWindow.filter((v) => v === s.vibe).length < MAX_STREAK);
    const pool = streakLimited.length > 0 ? streakLimited : available;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  async getNextBatch(count: number): Promise<Movie[]> {
    const batch: Movie[] = [];

    while (batch.length < count) {
      await Promise.all(this.suppliers.map((s) => s.ensureBuffer()));
      const available = this.suppliers.filter((s) => !s.isExhausted());
      if (available.length === 0) break;

      const chosen = this.pickSupplier(available);
      const movie = chosen.take();
      if (movie) {
        batch.push(movie);
        this.recentVibes.push(chosen.vibe);
      } else if (!chosen.isExhausted()) {
        continue;
      } else if (this.suppliers.every((s) => s.isExhausted())) {
        break;
      }
    }

    console.log(`[batch] leverede ${batch.length} film denne runde`);
    return batch;
  }

  isFullyExhausted(): boolean {
    return this.suppliers.every((s) => s.isExhausted());
  }
}