/** Belønner høj rating, men vægter stemmeantal logaritmisk ind —
 *  forhindrer at en obskur film med få, høje stemmer slår en bredt elsket film med lavere gennemsnit. */
const VOTE_COUNT_CAP = 10000;

export function popularityAdjustedScore(vote_average: number, vote_count: number): number {
  const cappedVoteCount = Math.min(vote_count, VOTE_COUNT_CAP);
  return vote_average * Math.log10(cappedVoteCount + 1);
}
export function weightedShuffle<T>(items: T[], weightOf: (item: T) => number): T[] {
  return items
    .map((item) => {
      const weight = Math.max(weightOf(item), 0.0001);
      const key = Math.pow(Math.random(), 1 / weight);
      return { item, key };
    })
    .sort((a, b) => b.key - a.key)
    .map((x) => x.item);
}