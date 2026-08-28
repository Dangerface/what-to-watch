// Kør: node scripts/curate-from-titles.js <input-tekstfil> <output-navn>
// Eksempel: node scripts/curate-from-titles.js data/award-winners-titles.txt award-winners

const fs = require('fs');
const TMDB_API_KEY = 'DIN_NØGLE_HER';
const TMDB_BASE = 'https://api.themoviedb.org/3';

function parseLine(line) {
  const match = line.match(/^(.+?)\s*\((\d{4})\)\s*$/);
  if (match) return { title: match[1].trim(), year: match[2] };
  return { title: line.trim(), year: null };
}

async function searchMovie(title, year) {
  const params = new URLSearchParams({ api_key: TMDB_API_KEY, query: title, language: 'en-US' });
  if (year) params.set('year', year);
  const res = await fetch(`${TMDB_BASE}/search/movie?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.results?.[0] ?? null;
}

async function fetchTmdbMovie(tmdbId) {
  const res = await fetch(`${TMDB_BASE}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`);
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  const [, , inputFile, outputName] = process.argv;
  if (!inputFile || !outputName) {
    console.error('Brug: node scripts/curate-from-titles.js <input-tekstfil> <output-navn>');
    process.exit(1);
  }

  const lines = fs.readFileSync(inputFile, 'utf-8').split('\n').map((l) => l.trim()).filter(Boolean);
  console.log(`${lines.length} titler at slå op.`);

  const enriched = [];
  const notFound = [];

  for (const line of lines) {
    const { title, year } = parseLine(line);
    const match = await searchMovie(title, year);
    if (!match) {
      notFound.push(line);
      continue;
    }
    const details = await fetchTmdbMovie(match.id);
    if (details) {
      enriched.push({
        id: details.id,
        title: details.title,
        overview: details.overview,
        release_date: details.release_date,
        vote_average: details.vote_average,
        vote_count: details.vote_count,
        genre_ids: details.genres?.map((g) => g.id) ?? [],
        poster_path: details.poster_path,
        runtime: details.runtime,
      });
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  fs.writeFileSync(`assets/curated-lists/${outputName}.json`, JSON.stringify(enriched, null, 2));
  console.log(`Gemt ${enriched.length} film til assets/curated-lists/${outputName}.json`);

  if (notFound.length > 0) {
    console.log(`\nKunne ikke finde ${notFound.length} titler — tjek stavning/årstal:`);
    notFound.forEach((l) => console.log(` - ${l}`));
  }
}

main();