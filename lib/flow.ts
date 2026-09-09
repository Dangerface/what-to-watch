export function getTotalSteps(showProviders: boolean): number {
  return showProviders ? 5 : 4;
}

type Screen = 'sourceType' | 'providers' | 'runtime' | 'genre' | 'vibe';

export function getStepNumber(screen: Screen, showProviders: boolean): number {
  switch (screen) {
    case 'sourceType':
      return 1;
    case 'providers':
      return 2;
    case 'runtime':
      return showProviders ? 3 : 2;
    case 'genre':
      return showProviders ? 4 : 3;
    case 'vibe':
      return showProviders ? 5 : 4;
  }
}