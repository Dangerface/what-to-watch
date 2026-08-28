import { SourceType } from '../store/session';

export function getTotalSteps(sourceType: SourceType | null): number {
  return sourceType === 'includeRental' ? 4 : 5;
}

type Screen = 'sourceType' | 'providers' | 'runtime' | 'genre' | 'vibe';

export function getStepNumber(screen: Screen, sourceType: SourceType | null): number {
  const isStreamingOnly = sourceType === 'streamingOnly';
  switch (screen) {
    case 'sourceType': return 1;
    case 'providers': return 2;
    case 'runtime': return isStreamingOnly ? 3 : 2;
    case 'genre': return isStreamingOnly ? 4 : 3;
    case 'vibe': return isStreamingOnly ? 5 : 4;
  }
}