import { processBatched } from './batch';
import { popularityAdjustedScore } from './scoring';
import {
  DiscoverFilters,
  fetchMovieAvailableOnProviders,
  fetchMovieCertificationDK,
  fetchRecommendationsPage,
  fetchSimilarPage,
  Movie,
} from './tmdb';

const VERIFY_BATCH_SIZE = 8;

type SourceState = { page: number; totalPages: number; done: boolean };

export class MoreLikeThisFeed {
  private movieId: number;
  private filters: DiscoverFilters;
  private buffer: Movie[] = [];
  private seenIds: Set<number>;

  private rec: SourceState = { page: 0, totalPages: Infinity, done: false };
  private sim: SourceState = { page: 0, totalPages: Infinity, done: false };

  constructor(movieId: number, filters: DiscoverFilters) {
    this.movieId = movieId;
    this.filters = filters;
    this.seenIds = new Set([movieId]);
  }

  private async fetchNextPage(source: 'rec' | 'sim') {
    const state = source === 'rec' ? this.rec : this.sim;
    if (state.done) return;
    state.page += 1;

    const { movies, totalPages } =
      source === 'rec'
        ? await fetchRecommendationsPage(this.movieId, state.page)
        : await fetchSimilarPage(this.movieId, state.page);

    state.totalPages = totalPages;
    const fresh = movies.filter((m) => !this.seenIds.has(m.id));
    fresh.forEach((m) => this.seenIds.add(m.id));

    const results = await processBatched(fresh, VERIFY_BATCH_SIZE, async (movie) => {
      const okFamily = !this.filters.familyFriendly || (await fetchMovieCertificationDK(movie.id));
      const okProvider =
        this.filters.providerIds.length === 0 ||
        (await fetchMovieAvailableOnProviders(movie.id, this.filters.providerIds, this.filters.sourceType));
      return okFamily && okProvider ? movie : null;
    });
    const verified = results.filter((m): m is Movie => m !== null);

    this.buffer.push(...verified);
    this.buffer.sort(
      (a, b) => popularityAdjustedScore(b.vote_average, b.vote_count) - popularityAdjustedScore(a.vote_average, a.vote_count)
    );

    console.log(
      `[more-like-this:${source}] side ${state.page}/${totalPages}: ${fresh.length} nye, ${verified.length} bestod filter (buffer: ${this.buffer.length})`
    );

    if (state.page >= state.totalPages) {
      state.done = true;
      console.log(`[more-like-this:${source}] UDTØMT efter ${state.page} sider`);
    }
  }

  private async ensureBuffer(minCount: number): Promise<void> {
    while (this.buffer.length < minCount && !(this.rec.done && this.sim.done)) {
      if (!this.rec.done) await this.fetchNextPage('rec');
      if (this.buffer.length >= minCount) break;
      if (!this.sim.done) await this.fetchNextPage('sim');
    }
  }

  async getNextBatch(count: number): Promise<Movie[]> {
    await this.ensureBuffer(count);
    return this.buffer.splice(0, count);
  }

  isExhausted(): boolean {
    return this.buffer.length === 0 && this.rec.done && this.sim.done;
  }
}