/* Batch-fetch real restaurant data from the Google Places API (New).
 *
 * Run occasionally, not at app runtime: the restaurant set is small and fixed,
 * and Google ratings change over weeks. Keeping the calls out of the app means
 * the API key never ships to a device where it could be extracted and billed.
 *
 *   node scripts/fetch-places.js
 *
 * Reads GOOGLE_PLACES_KEY from .env.local (gitignored). Writes the results to
 * scripts/places-output.json for review before anything is merged into App.tsx.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELDS = [
  'places.displayName',
  'places.rating',
  'places.userRatingCount',
  'places.formattedAddress',
  'places.location',
  'places.regularOpeningHours',
  'places.primaryTypeDisplayName',
  'places.priceLevel',
].join(','); // no spaces allowed in a field mask

// The places to look up. Add a line here to bring a new restaurant into the
// project; the id must match the id used in App.tsx (or be new).
const TARGETS = [
  { id: '1', query: "McDonald's Taman Connaught" },
  { id: '2', query: 'Restoran Gading Nasi Kandar Taman Connaught' },
  { id: '3', query: 'Tai Jie Taman Connaught' },
  { id: '4', query: 'Craft Cafe Taman Connaught' },
  { id: '5', query: 'Shawarma Restaurant Taman Connaught Cheras' },
];

function readKey() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('Missing .env.local — create it with GOOGLE_PLACES_KEY=your_key');
    process.exit(1);
  }
  const line = fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith('GOOGLE_PLACES_KEY='));
  if (!line) {
    console.error('.env.local has no GOOGLE_PLACES_KEY= line');
    process.exit(1);
  }
  return line.split('=').slice(1).join('=').trim();
}

async function search(key, textQuery, bias) {
  const body = { textQuery };
  if (bias) {
    // Bias, not restrict: a nearby match is preferred but a slightly further
    // one is still returned rather than yielding nothing.
    body.locationBias = { circle: { center: bias, radius: 1500 } };
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': FIELDS,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json.places ?? [];
}

// Great-circle distance in km, so distances are measured rather than estimated.
function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

(async () => {
  const key = readKey();

  // Resolve the campus first and use its real coordinates as the search bias,
  // so no coordinate anywhere in this script is guessed.
  console.log('Locating UCSI University…');
  const campusHits = await search(key, 'UCSI University Kuala Lumpur Cheras');
  if (campusHits.length === 0) {
    console.error('Could not locate UCSI University — aborting.');
    process.exit(1);
  }
  const campus = campusHits[0].location;
  console.log(
    `  ${campusHits[0].displayName?.text} @ ${campus.latitude.toFixed(5)}, ${campus.longitude.toFixed(5)}\n`
  );

  const results = [];
  for (const target of TARGETS) {
    process.stdout.write(`${target.query} … `);
    try {
      const hits = await search(key, target.query, campus);
      if (hits.length === 0) {
        console.log('NO MATCH');
        results.push({ ...target, error: 'no match' });
        continue;
      }
      const pl = hits[0];
      const record = {
        id: target.id,
        query: target.query,
        name: pl.displayName?.text ?? null,
        rating: pl.rating ?? null,
        ratingCount: pl.userRatingCount ?? null,
        address: pl.formattedAddress ?? null,
        location: pl.location ?? null,
        distanceKm: pl.location ? Number(haversineKm(campus, pl.location).toFixed(2)) : null,
        priceLevel: pl.priceLevel ?? null,
        primaryType: pl.primaryTypeDisplayName?.text ?? null,
        openingHours: pl.regularOpeningHours?.weekdayDescriptions ?? null,
        alternatives: hits.slice(1, 3).map((h) => h.displayName?.text),
      };
      results.push(record);
      console.log(`${record.name} · ★${record.rating ?? '—'} (${record.ratingCount ?? 0}) · ${record.distanceKm} km`);
    } catch (e) {
      console.log(`FAILED — ${e.message}`);
      results.push({ ...target, error: e.message });
    }
  }

  const out = path.join(__dirname, 'places-output.json');
  fs.writeFileSync(out, JSON.stringify({ campus, fetchedAt: new Date().toISOString(), results }, null, 2));
  console.log(`\nWrote ${out}`);
  console.log('Review it before merging anything into App.tsx.');
})();
