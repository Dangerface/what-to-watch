/** Belønner høj rating, men vægter stemmeantal logaritmisk ind —
 *  forhindrer at en obskur film med få, høje stemmer slår en bredt elsket film med lavere gennemsnit. */
export function popularityAdjustedScore(vote_average: number, vote_count: number): number {
  return vote_average * Math.log10(vote_count + 1);
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