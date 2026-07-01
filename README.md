# Songbook Pro Formatter

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![Tests](https://img.shields.io/badge/tests-vitest%20%2B%20playwright-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

A small web tool that takes a chord chart in the common "chords sitting above the
lyrics" layout — whether you typed it yourself or copied it from a site like
Ultimate Guitar — and rewrites it into clean ChordPro. Chords become inline
`[Chord]` tags placed against the syllable they land on, and section headers are
normalised to `{c: Name}`. Charts already in ChordPro form pass straight through
untouched, so running the tool twice is safe.

## Example

Input:

```
{c: Verse 1:}
        C              G
Morning breaks across the hall
```

Output:

```
{c: Verse 1}
Morning [C]breaks across [G]the hall
```

### Rules it applies

- Chords go inline in square brackets, positioned by column against the lyric.
- Section headers become `{c: Name}` with no trailing colon (`{c: Verse 1:}` is tidied automatically).
- Ultimate Guitar section labels such as `[Chorus]` are rewritten to `{c: Chorus}`. A lone bracketed token that is a real chord, like `[Am]`, is left as a chord.
- Chord-only lines such as `Am F C G` are bracketed individually to `[Am] [F] [C] [G]`.
- Lines already containing `[...]` brackets or `{...}` directives are left as they are.

The conversion logic lives in `lib/converter.ts` with no React or DOM
dependencies, so the same function powers the page, the unit tests, and any
future API route or CLI without change.

## Tech stack

- Next.js 16 (App Router) with TypeScript and React 19
- Vitest for unit tests
- Playwright for end-to-end tests

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000, paste a chart, and click **Convert**.

## Testing

```bash
npm run test        # Vitest unit tests (single run)
npm run test:watch  # Vitest in watch mode
npm run test:e2e    # Playwright end-to-end tests
```

The Playwright config builds and serves the production app on port 3000 before
running. If you already have something on that port, either stop it or point the
config at a free port, as `reuseExistingServer` will otherwise attach to
whatever is already there.

The first e2e run needs the browser binary:

```bash
npx playwright install chromium
```

## Project structure

```
songbookpro-formatter/
  app/
    globals.css        # styles
    layout.tsx         # root layout and page metadata
    page.tsx           # the formatter interface
  lib/
    converter.ts       # the conversion logic (framework free)
    converter.test.ts  # unit tests across multiple source formats
  e2e/
    convert.spec.ts    # end-to-end tests
  playwright.config.ts
  vitest.config.ts
```

## Deploying to Vercel

Next.js needs no configuration on Vercel. Import the repo at vercel.com; it
detects Next.js and fills in the build settings. There are no environment
variables to set. Every push to `main` deploys to production, and every pull
request gets a preview URL.

## License

MIT — see [LICENSE](LICENSE).
