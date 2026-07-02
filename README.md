# Songbook Pro Formatter

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![Tests](https://img.shields.io/badge/tests-vitest%20%2B%20playwright-brightgreen) ![License](https://img.shields.io/badge/license-Apache%202.0-blue)

A small web tool that takes a chord chart in the common "chords sitting above the
lyrics" layout — whether you typed it yourself or copied it from a site like
Ultimate Guitar — and rewrites it into clean ChordPro. Chords become inline
`[Chord]` tags placed against the syllable they land on, section headers are
normalised to `{c: Name}`, and charts already in ChordPro form pass straight
through untouched, so running the tool twice is safe.

## Example

Input:

```
Capo on the fret 2
{c: Verse 1:}
        C              G
Morning breaks across the hall
```

Output:

```
{capo: 2}
{c: Verse 1}
Morning [C]breaks across [G]the hall
```

## What it converts

- **Chords above lyrics** → inlined as `[Chord]` at the column they sit over (snap-to-word optional).
- **Section headers** → normalised to `{c: Name}`, trailing colons tidied. Ultimate Guitar labels like `[Chorus]` become `{c: Chorus}`; a lone bracket that is a real chord, like `[Am]`, stays a chord.
- **Standalone chord / progression lines** → each chord bracketed: `Am F C G` → `[Am] [F] [C] [G]` (see the *Bracket chord-only lines* toggle).
- **Extended chord notation** → augmented / `+` chords such as `C7+`, plus parentheses: `(D)` → `[D]`, and a wrapped progression `( C7+ D Em )` → `( [C7+] [D] [Em] )`.
- **Section label + chords on one line** → label kept, chords bracketed: `Intro C7+ Bm Em` → `Intro [C7+] [Bm] [Em]` (Intro, Verse, Chorus, Bridge, Solo, Outro, …).
- **Capo lines** → `{capo: N}`: `Capo on the fret 2` → `{capo: 2}` (Arabic or Roman fret numbers). Note: SongbookPro treats `{capo}` as import-only metadata; full ChordPro renderers display and use it.
- **Already-ChordPro lines** (containing `[...]` or `{...}`) pass through unchanged — the conversion is idempotent.

### Options

Two toggles in the UI:

- **Snap to nearest word** — snap each chord to the closest word start (on) or place it at its exact column (off).
- **Bracket chord-only lines** — bracket standalone chord / progression / label lines (on) or leave them exactly as typed (off).

The conversion logic lives in `lib/converter.ts` with no React or DOM
dependencies, so the same function powers the page, the unit tests, and any
future API route or CLI without change.

## Full example

A real chart pasted in, converted with the default toggles on (snap + bracket
chord-only lines):

<details>
<summary>Input</summary>

```
Capo on the  fret 2
Intro C7+  Bm  Em


C7+               Bm
    Things fall apart
                      Em
And time breaks your heart

I wasn't there but I know
C7+               Bm
    She was your girl
                    Em
You showed her the world

You fell out of love
           (D)   C7+
And you both let go



                           Bm
She was cryin' in my shoulder
                         Em
All I could do was hold her
                       D
Only made us closer until July
C7+                           Bm
    Now I know that you love me
                          Em
You don't need to remind me

I should put it all behind me, shouldn't I?


    C7+               D
But I see her in the back of my mind
B7       Em  D
All the time
     C7+               D
Like a fever, like I'm   burning alive
     B7  Em
Like a  sign
    D            C7+
Did I cross the line?
 Bm  Em  G
Hmm



C7+                          Bm
    Well, good things don't last
                   Em
And life moves so fast
                          D
I'd never ask who was better
C7+                     Bm
   'Cause she couldn't be
                     Em
More different from me
                       D  C7+
Happy and free in leather



                          Bm
And I know that you love me
                          Em
You don't need to remind me

Wanna put it all behind me, but baby


    C7+               D
But I see her in the back of my mind
B7       Em  D
All the time
     C7+               D
Like a fever, like I'm   burning alive
     B7  Em
Like a  sign
    D       C7+
Did I cross     the line?
                       D
(You say no one knows you so well)
     B7
(But every time you touch me)
         Em             D
(I just wonder how she felt)
  C7+                    D
(Valentine's Day, cryin' in the hotel)
             B7
(I know you didn't mean to hurt me)
       Em
(So I kept it to myself)


And I wonder
    C7+                D
Do you see her in the back of your mind
    B7     Em
In my eyes

( C7+  D  B7  Em  D )

Final

C7+                  D
    You say no one knows you so well
    B7
But every time you touch me
        Em             D
I just wonder how she felt
 C7+                    D
Valentine's Day, cryin' in the hotel
            B7
I know you didn't mean to hurt me
      N.C
So I kept it to myself
```

</details>

<details>
<summary>Output (ChordPro)</summary>

```
{capo: 2}
Intro [C7+] [Bm] [Em]


    [C7+]Things fall [Bm]apart
And time breaks your [Em]heart

I wasn't there but I know
    [C7+]She was your [Bm]girl
You showed her the [Em]world

You fell out of love
And you both [D]let [C7+]go



She was cryin' in my [Bm]shoulder
All I could do was hold [Em]her
Only made us closer until [D]July
    [C7+]Now I know that you love [Bm]me
You don't need to remind [Em]me

I should put it all behind me, shouldn't I?


But [C7+]I see her in the [D]back of my mind
[B7]All the [Em][D]time
Like [C7+]a fever, like I'm   [D]burning alive
Like [B7]a  [Em]sign
Did [D]I cross the [C7+]line?
[Bm][Em][G]Hmm



    [C7+]Well, good things don't [Bm]last
And life moves so [Em]fast
I'd never ask who was [D]better
   [C7+]'Cause she couldn't [Bm]be
More different from [Em]me
Happy and free in [D][C7+]leather



And I know that you love [Bm]me
You don't need to remind [Em]me

Wanna put it all behind me, but baby


But [C7+]I see her in the [D]back of my mind
[B7]All the [Em][D]time
Like [C7+]a fever, like I'm   [D]burning alive
Like [B7]a  [Em]sign
Did [D]I cross     [C7+]the line?
(You say no one knows [D]you so well)
(But [B7]every time you touch me)
(I just [Em]wonder how she [D]felt)
[C7+](Valentine's Day, cryin' [D]in the hotel)
(I know you [B7]didn't mean to hurt me)
(So I [Em]kept it to myself)


And I wonder
Do [C7+]you see her in the [D]back of your mind
In [B7]my [Em]eyes

( [C7+] [D] [B7] [Em] [D] )

Final

    [C7+]You say no one [D]knows you so well
But [B7]every time you touch me
I just [Em]wonder how she [D]felt
[C7+]Valentine's Day, cryin' [D]in the hotel
I know you [B7]didn't mean to hurt me
      N.C
So I kept it to myself
```

</details>

What to notice: the capo line becomes `{capo: 2}`; `Intro C7+ Bm Em` keeps its label and brackets the chords; `C7+` and `(D)` are recognised and inlined; the `( C7+ D B7 Em D )` interlude is bracketed as a group; parenthesised backing-vocal lines keep their brackets with chords inlined; and lines with no chords (`Final`, `N.C`) pass through untouched.

## Interface

- **Dark / light theme** toggle — follows your system preference on first load and remembers your choice.
- Paste on the left; live syntax-highlighted ChordPro on the right; one-click copy.

## Tech stack

- Next.js 16 (App Router) with TypeScript and React 19
- Vitest for unit tests
- Playwright for end-to-end tests

## Getting started

```bash
npm install
npm run dev
```

Open the URL it prints (`http://localhost:3000` by default), paste a chart, and
click **Convert**.

## Testing

```bash
npm run test        # Vitest unit tests (single run)
npm run test:watch  # Vitest in watch mode
npm run test:e2e    # Playwright end-to-end tests
```

The Playwright config builds and serves the production app on port 3000 before
running. If you already have something on that port, either stop it or point the
config at a free port, as `reuseExistingServer` will otherwise attach to
whatever is already there. The first e2e run needs the browser binary:

```bash
npx playwright install chromium
```

## Development notes

- **Port:** the dev server uses 3000 by default; if that's busy, Next picks the next free port (e.g. 3001). Use whatever URL it prints.
- **LAN access:** to open the running dev app from another device (phone/tablet) via your machine's IP — e.g. `http://192.168.1.81:3001` — that host must be listed in `allowedDevOrigins` in `next.config.ts`. Next 16 blocks cross-origin dev resources by default, which leaves the page rendered but **not interactive**. Update the IP there if yours differs, or just use `localhost`.

## Project structure

```
songbookpro-formatter/
  app/
    globals.css        # styles, incl. the light/dark theme variables
    layout.tsx         # root layout, metadata, no-flash theme script
    page.tsx           # the formatter interface
  lib/
    converter.ts       # the conversion logic (framework free)
    converter.test.ts  # unit tests across multiple source formats
  e2e/
    convert.spec.ts    # end-to-end tests
  next.config.ts       # incl. allowedDevOrigins for LAN dev access
  playwright.config.ts
  vitest.config.ts
```

## Deploying to GitHub Pages

The app is published as a static export on the `gh-pages` branch and served at
the custom domain <https://songbook-formatter.pro/>.

To (re)build and publish:

```bash
GITHUB_PAGES=true npm run build     # static export to ./out
touch out/.nojekyll                 # serve _next/ as-is (skip Jekyll)
npx gh-pages -d out -t -b gh-pages  # publish ./out to the gh-pages branch
```

`GITHUB_PAGES=true` switches on `output: 'export'` in `next.config.ts`; without
it, `npm run dev` and `npm run build` behave normally. `public/CNAME` carries the
custom domain, and the repository's **Settings → Pages** source is the
`gh-pages` branch.

DNS (apex domain at the registrar): four `A` records pointing at GitHub's Pages
IPs — `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.

## License

Copyright © 2026 Saray Gomez.

Licensed under the **Apache License, Version 2.0** — see [LICENSE](LICENSE) and
[NOTICE](NOTICE). You may obtain a copy of the license at
<http://www.apache.org/licenses/LICENSE-2.0>.
