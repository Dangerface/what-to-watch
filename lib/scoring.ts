/** Belønner høj rating, men vægter stemmeantal logaritmisk ind —
 *  forhindrer at en obskur film med få, høje stemmer slår en bredt elsket film med lavere gennemsnit. */
export function popularityAdjustedScore(vote_average: number, vote_count: number): number {
  return vote_average * Math.log10(vote_count + 1);
}