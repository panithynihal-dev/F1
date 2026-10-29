# TrackiMetrix — web

The TrackiMetrix Android app, rebuilt as a website: F1 standings, results, the season calendar,
driver and team pages, and race replays drawn from real car telemetry. Built with React Native
(Expo, react-native-web) and NativeWind.

Replays load four laps at a time (a full race is 300k+ position samples). Links can point at a
moment: `/replay/<session>?laps=5-8&t=90` opens laps 5–8, ninety seconds in. Keyboard: space to
play or pause, ← / → to skip ten seconds, + / − to change speed.

All data comes from two free public APIs, called straight from the browser:
[OpenF1](https://openf1.org) (sessions, laps, positions, car locations) and
[Jolpica](https://github.com/jolpica/jolpica-f1) (standings, schedule, results). Responses are cached
in the browser's IndexedDB with per-kind lifetimes, so repeat visits are fast and a dropped
connection falls back to the last good copy.

## Run it

```sh
npm install
npm start          # dev server at http://localhost:8081
npm run typecheck
npm run lint
npm run build      # production export to dist/, served under /F1
```

The dev server serves from the root; the `/F1` base path (for GitHub Pages) only applies to the
exported build.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which type-checks, exports and publishes to
GitHub Pages. One-time setup: in the repository's **Settings → Pages**, set **Source** to
**GitHub Actions**.

## Layout

```
src/app/          pages (Expo Router: each file is a route)
src/components/   UI kit (ports of the app's ui/common) and page sections
src/api/          typed clients for OpenF1 and Jolpica
src/data/         cached repository (port of F1Repository.kt), baked champions history
src/domain/       pure logic ported from the app: dates and flags, team colours, stats
scripts/          build-champions.mjs — re-run after each season to refresh baked titles
```
