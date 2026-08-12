/* Batch-fetch restaurant coordinates and addresses from OpenStreetMap.
 *
 *   node scripts/fetch-locations.js
 *
 * Used instead of the Google Places API, which required a MYR 120 prepayment
 * that was not justifiable for a prototype. OpenStreetMap's Nominatim service
 * is free and needs no key or account, and supplies what the project actually
 * needs from a places service: coordinates, so distances can be measured rather
 * than estimated and a map view becomes possible. Ratings are not available
 * from OpenStreetMap and are recorded manually.
 *
 * Nominatim's usage policy requires an identifying User-Agent and allows at
 * most one request per second; both are respected below.
 *
 * Writes scripts/locations-output.json for review before anything is merged.
 */

const fs = require('fs');
const path = require('path');

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const UA = 'MakanMana-FYP/1.0 (UCSI Diploma student project; contact via GitHub KJT1203)';
const PAUSE_MS = 1100; // stay inside the 1 request/second policy

// The places to look up. Add a line to bring a new restaurant into the project;
// the id must match the id used in App.tsx.
const TARGETS = [
  { id: '1', query: "McDonald's Taman Connaught, Cheras, Kuala Lumpur" },
  { id: '2', query: 'Restoran Gading Nasi Kandar, Taman Connaught, Cheras' },
  { id: '3', query: 'Tai Jie, Taman Connaught, Cheras' },
  { id: '4', query: 'Craft Cafe, Taman Connaught, Cheras' },
  { id: '5', query: 'Shawarma Restaurant, Taman Connaught, Cheras' },
  // Added from a closer Google Maps view of Jalan Menara Gading 1.
  { id: '6', query: 'Tealive, Shell Taman Connaught, Cheras' },
  { id: '7', query: 'Kashif Pakistani Food Restaurant, Taman Connaught, Cheras' },
  { id: '8', query: 'Chapathi Recipes, Taman Connaught, Cheras' },
  { id: '9', query: 'Mix And Fuse Restaurant, Taman Connaught, Cheras' },
  { id: '10', query: 'Astarry Cafe, Taman Connaught, Cheras' },
  { id: '11', query: 'Nasi Kandar Nj Bistro, Taman Connaught, Cheras' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function nominatim(query) {
  const url = `${ENDPOINT}?q=${encodeURIComponent(query)}&format=jsonv2&limit=3&addressdetails=1`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// Great-circle distance in km, so distances are measured rather than estimated.
function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

(async () => {
  // Resolve the campus first and measure everything from it, so no coordinate
  // in this project is guessed.
  console.log('Locating UCSI University…');
  // Kept deliberately loose: over-specifying the street made Nominatim return
  // nothing at all.
  const campusHits = await nominatim('UCSI University, Cheras, Kuala Lumpur');
  if (campusHits.length === 0) {
    console.error('Could not locate UCSI University — aborting.');
    process.exit(1);
  }
  const campus = { lat: Number(campusHits[0].lat), lon: Number(campusHits[0].lon) };
  console.log(`  ${campusHits[0].display_name}`);
  console.log(`  ${campus.lat.toFixed(5)}, ${campus.lon.toFixed(5)}\n`);
  await sleep(PAUSE_MS);

  const results = [];
  for (const target of TARGETS) {
    process.stdout.write(`${target.query.split(',')[0]} … `);
    try {
      const hits = await nominatim(target.query);
      if (hits.length === 0) {
        console.log('NO MATCH');
        results.push({ ...target, found: false, note: 'not present in OpenStreetMap' });
        await sleep(PAUSE_MS);
        continue;
      }
      const hit = hits[0];
      const loc = { lat: Number(hit.lat), lon: Number(hit.lon) };
      const distanceKm = Number(haversineKm(campus, loc).toFixed(2));

      // A match far from campus is probably the wrong branch of a chain, so it
      // is flagged for review rather than accepted silently.
      const suspicious = distanceKm > 3;

      results.push({
        id: target.id,
        query: target.query,
        found: true,
        osmName: hit.display_name,
        osmType: hit.type,
        latitude: loc.lat,
        longitude: loc.lon,
        distanceKm,
        suspicious,
        alternatives: hits.slice(1).map((h) => h.display_name),
      });
      console.log(`${distanceKm} km${suspicious ? '  ⚠ CHECK — far from campus' : ''}`);
    } catch (e) {
      console.log(`FAILED — ${e.message}`);
      results.push({ ...target, found: false, note: e.message });
    }
    await sleep(PAUSE_MS);
  }

  const out = path.join(__dirname, 'locations-output.json');
  fs.writeFileSync(
    out,
    JSON.stringify({ source: 'OpenStreetMap Nominatim', fetchedAt: new Date().toISOString(), campus, results }, null, 2)
  );

  const found = results.filter((r) => r.found).length;
  console.log(`\n${found}/${TARGETS.length} located. Wrote ${out}`);
  if (found < TARGETS.length) {
    console.log('For anything missing: right-click the place in Google Maps and read the');
    console.log('coordinates from the menu, then add them by hand.');
  }
})();
