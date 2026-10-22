// Bakes every decided season's champions into src/data/champions.json.
//
// Jolpica no longer answers the unscoped "all champions" query, so the list has to be walked a
// season at a time — about 150 requests, minutes of waiting, for facts that never change. The app
// paid that on first launch; the site ships it instead and only asks the API about seasons newer
// than this file. Re-run after a season finishes: `node scripts/build-champions.mjs`.
import { writeFileSync } from 'node:fs';

const BASE = 'https://api.jolpi.ca/ergast/f1/';
const FIRST_DRIVERS = 1950;
const FIRST_CONSTRUCTORS = 1958;
const CONCURRENCY = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(path) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(BASE + path);
    if (res.status === 429) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  }
  throw new Error(`${path}: rate limited`);
}

async function lastDecidedSeason() {
  const schedule = await getJson('current.json?limit=100');
  const races = schedule.MRData.RaceTable.Races;
  const season = Number(schedule.MRData.RaceTable.season);
  const last = races.map((r) => Date.parse(`${r.date}T${(r.time ?? '00:00:00Z').replace(/Z$/, '')}Z`)).sort((a, b) => b - a)[0];
  return last < Date.now() ? season : season - 1;
}

async function walk(first, last, fetchOne) {
  const out = [];
  const seasons = [];
  for (let s = first; s <= last; s++) seasons.push(s);
  for (let i = 0; i < seasons.length; i += CONCURRENCY) {
    const chunk = seasons.slice(i, i + CONCURRENCY);
    const results = await Promise.all(chunk.map(fetchOne));
    chunk.forEach((season, j) => results[j] && out.push({ season, ...results[j] }));
    process.stdout.write(`.`);
  }
  return out;
}

const last = await lastDecidedSeason();

const drivers = await walk(FIRST_DRIVERS, last, async (season) => {
  const s = (await getJson(`${season}/driverStandings/1.json`)).MRData.StandingsTable.StandingsLists.flatMap((l) => l.DriverStandings)[0];
  return s && { driverId: s.Driver.driverId, name: `${s.Driver.givenName} ${s.Driver.familyName}`, constructors: s.Constructors.map((c) => ({ id: c.constructorId, name: c.name })) };
});

const constructors = await walk(FIRST_CONSTRUCTORS, last, async (season) => {
  const s = (await getJson(`${season}/constructorStandings/1.json`)).MRData.StandingsTable.StandingsLists.flatMap((l) => l.ConstructorStandings)[0];
  return s && { constructorId: s.Constructor.constructorId, name: s.Constructor.name };
});

writeFileSync(
  new URL('../src/data/champions.json', import.meta.url),
  JSON.stringify({ throughSeason: last, drivers, constructors }, null, 1) + '\n',
);
console.log(`\nBaked ${drivers.length} drivers' and ${constructors.length} constructors' titles through ${last}.`);
