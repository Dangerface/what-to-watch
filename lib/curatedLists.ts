import awardWinners from '../assets/curated-lists/award-winners.json';
import cult from '../assets/curated-lists/cult.json';
import mustWatch from '../assets/curated-lists/mustWatch.json';
import { Vibe } from '../store/session';
import { Movie } from './tmdb';

const curatedByVibe: Partial<Record<Vibe, Movie[]>> = {
  cult,
  mustWatch,
  awardWinners,
};

export function getCuratedMovies(vibe: Vibe): Movie[] {
  return curatedByVibe[vibe] ?? [];
}