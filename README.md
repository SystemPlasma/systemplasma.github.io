# WK:W — Grimoire Binding

A web app for building WK:W decks (“Grimoire Binding”). Built with React + TypeScript + Vite and deployed to GitHub Pages under `/wkw/`.

## Quick Start

- Install: `npm ci`
- Dev server: `npm run dev`
  - Serves at `http://localhost:5173/wkw/` (base path set to `/wkw/`)
- Build: `npm run build`
  - Outputs to `dist/` with fingerprinted assets
- Deploy: `npm run deploy`
  - Publishes `dist/` to `systemplasma.github.io` under `wkw/`

## Project Structure

- `src/App.tsx`: Main UI and logic
- `src/assets/data/*.csv`: Card data (`cards.csv`), aspects (`aspects.csv`), unlock codes (`unlock_codes.csv`)
- `src/assets/cards/`: Individual card images (`<id>.png`)
- `src/imageMap.ts`: Auto‑generated image map (do not edit)
- `scripts/gen-image-map.cjs`: Generates `src/imageMap.ts` from CSV + existing images
- `public/`: Static files copied as‑is (e.g., `favicon.ico`, `rules.pdf`, `notes.html`)

## Images and IDs

- Card images live at `src/assets/cards/<id>.png`.
- `scripts/gen-image-map.cjs` parses `src/assets/data/cards.csv` and emits `src/imageMap.ts` mapping each card ID to a URL via `new URL('./assets/cards/<file>.png', import.meta.url)`.
- Normalization: IDs ending with `_<digit>` will map to filenames without the underscore before the digit (e.g., `thetrickster_ensnare_1` → `thetrickster_ensnare1.png`).
- Build: Vite fingerprints images and rewrites references automatically in `dist/`.

## Multiple Pages

- Base path: `/wkw/` (see `vite.config.ts`).
- App: `/wkw/` (Grimoire Binding).
- Static pages:
  - `/wkw/notes.html` (community notes; source at `public/notes.html`)
  - `/wkw/rules.pdf` (place your PDF in `public/rules.pdf`)

## Favicon

- Source: `public/favicon.ico`. Replace this file to update the icon.
- The favicon is not hashed; it’s copied to `/wkw/favicon.ico` on build.

## Naming

- The UI title and header use “WKW Grimoire Binding”. Update in `index.html` and `src/App.tsx` if needed.

## Scripts

- `npm run dev`: generate image map, start Vite
- `npm run build`: generate image map, type‑check, build
- `npm run deploy`: push `dist/` to `systemplasma.github.io` → `wkw/`

## Notes

- CSVs are fetched at runtime using `new URL('./assets/data/*.csv', import.meta.url)`, which Vite rewrites to hashed assets in `dist/`.
- To add a new card: add a row to `src/assets/data/cards.csv`, add the image to `src/assets/cards/`, then run dev/build.

## Access Control

- This is a static site; assets loaded by browsers are technically downloadable by visitors. We mitigate by:
  - Enforcing a host check (redirects to `https://systemplasma.github.io/wkw/` if opened elsewhere)
  - Disabling source maps (built code is minified and not accompanied by maps)
- To keep source private, keep this repo private and deploy only the built site to `systemplasma.github.io` via `npm run deploy`.
