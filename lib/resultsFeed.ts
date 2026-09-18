import { Vibe } from '../store/session';
import { processBatched } from './batch';
import { getCuratedMovies } from './curatedLists';
import { popularityAdjustedScore, weightedShuffle } from './scoring';
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
const RANDOM_PAGE_CAP = 25;

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

  // --- Sidehentning: skiftevis sekventiel og tilfældig, indenfor RANDOM_PAGE_CAP ---
  private fetchedPages = new Set<number>();
  private sequentialCursor = 0;
  private useRandomNext = false;
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

    this.curatedQueue = weightedShuffle(raw, (m) => popularityAdjustedScore(m.vote_average, m.vote_count));
    this.curatedTotalCount = this.curatedQueue.length;
    console.log(`[${this.label()}] kurateret pulje: ${this.curatedTotalCount} film efter genre/runtime-filter`);
  }

  private get liveVibe(): LiveVibe {
    if (this.vibe === null) return 'generic';
    return LIVE_VIBE_MAP[this.vibe] ?? 'generic';
  }

  private nextSequentialPage(): number | null {
    let candidate = this.sequentialCursor + 1;
    while (this.fetchedPages.has(candidate)) candidate += 1;
    if (candidate > this.liveTotalPages) return null;
    this.sequentialCursor = candidate;
    return candidate;
  }

  private nextRandomPage(): number | null {
    const cap = Math.min(RANDOM_PAGE_CAP, this.liveTotalPages);
    const available: number[] = [];
    for (let p = 1; p <= cap; p++) {
      if (!this.fetchedPages.has(p)) available.push(p);
    }
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  private resetPagination() {
    this.fetchedPages = new Set();
    this.sequentialCursor = 0;
    this.useRandomNext = false;
    this.liveTotalPages = Infinity;
  }

    private async fetchNextLivePage(): Promise<void> {
    if (this.liveDone) return;

    let pageToFetch: number;
    let pickedRandomly = false;

    if (this.liveTotalPages === Infinity) {
      // Allerførste hentning for denne tærskel — skal være side 1, total_pages kendes ikke endnu
      pageToFetch = 1;
    } else {
      let resolved: number | null;
      if (this.useRandomNext) {
        resolved = this.nextRandomPage();
        pickedRandomly = resolved !== null;
        if (resolved === null) resolved = this.nextSequentialPage();
      } else {
        resolved = this.nextSequentialPage();
        if (resolved === null) {
          resolved = this.nextRandomPage();
          pickedRandomly = resolved !== null;
        }
      }

      if (resolved === null) {
        const isMustWatch = this.liveVibe === 'mustWatch';
        if (isMustWatch && this.mustWatchThresholdIndex < MUST_WATCH_VOTE_THRESHOLDS.length - 1) {
          const nextThreshold = MUST_WATCH_VOTE_THRESHOLDS[this.mustWatchThresholdIndex + 1];
          console.log(`[${this.label()}] tærskel udtømt (sekventielt + tilfældigt op til side ${RANDOM_PAGE_CAP}) — falder til vote_count.gte=${nextThreshold}`);
          this.mustWatchThresholdIndex += 1;
          this.resetPagination();
          return this.fetchNextLivePage();
        } else {
          this.liveDone = true;
          console.log(`[${this.label()}] TMDb live UDTØMT — ingen flere sider (stopper efter ${this.liveFetchedCount} film totalt fra TMDb)`);
          return;
        }
      }

      pageToFetch = resolved;
      this.useRandomNext = !this.useRandomNext;
    }

    this.fetchedPages.add(pageToFetch);

    const isMustWatch = this.liveVibe === 'mustWatch';
    const threshold = MUST_WATCH_VOTE_THRESHOLDS[this.mustWatchThresholdIndex];
    const extra = isMustWatch ? liveVibeParams('mustWatch', threshold) : liveVibeParams(this.liveVibe);
    const thresholdLabel = isMustWatch ? ` (vote_count.gte=${threshold})` : '';

    const { movies, totalPages } = await fetchDiscoverPage(this.filters, pageToFetch, extra);
    this.liveTotalPages = totalPages;
    if (pageToFetch === 1 && this.sequentialCursor === 0) this.sequentialCursor = 1;

    const fresh = movies.filter((m) => !this.shownIds.has(m.id) && !this.jailedIds.has(m.id));

    let verified = fresh;
    if (this.filters.familyFriendly) {
      const checked = await processBatched(fresh, VERIFY_BATCH_SIZE, async (m) => {
        const ok = await fetchMovieCertificationDK(m.id);
        return ok ? m : null;
      });
      verified = checked.filter((m): m is Movie => m !== null);
    }

    const sorted = weightedShuffle(verified, (m) => popularityAdjustedScore(m.vote_average, m.vote_count));
    this.buffer.push(...sorted);
    this.liveFetchedCount += verified.length;

    console.log(
      `[${this.label()}] TMDb live side ${pageToFetch}/${totalPages}${thresholdLabel} (${pickedRandomly ? 'tilfældig' : 'sekventiel'}): ${fresh.length} nye film (${this.liveFetchedCount} totalt fra TMDb indtil nu)`
    );
  }

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