const DEFAULT_TIMEOUT_MS = 5000;

async function pingUrl(url: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export type StartupCheckResult = 'ok' | 'no-internet' | 'no-tmdb';

// Midlertidig test-kontakt — sæt til 'no-internet' eller 'no-tmdb' for at forhåndsvise
// den skærm uden at skulle ændre din faktiske forbindelse. Husk at sætte tilbage til null.
const FORCE_STATE: StartupCheckResult | null = null;

export async function checkStartupConnectivity(): Promise<StartupCheckResult> {
  if (FORCE_STATE) return FORCE_STATE;
  // Ét kald løser reelt begge spørgsmål på én gang, hvis det lykkes —
  // lykkes TMDb, er internettet jo pr. definition også i orden.
  const tmdbOk = await pingUrl(
    `https://api.themoviedb.org/3/configuration?api_key=${process.env.EXPO_PUBLIC_TMDB_API_KEY}`
  );
  if (tmdbOk) return 'ok';

  // TMDb fejlede — nu skal vi vide HVORFOR. Et kald til en helt uafhængig,
  // meget pålidelig adresse afgør om det er internettet generelt, eller kun TMDb.
  const internetOk = await pingUrl('https://clients3.google.com/generate_204', 4000);
  return internetOk ? 'no-tmdb' : 'no-internet';
}