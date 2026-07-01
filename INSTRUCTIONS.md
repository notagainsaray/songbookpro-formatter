# Songbook Pro Formatter

![Next.js](https://img.shields.io/badge/Next.js-15-black) ![Tests](https://img.shields.io/badge/tests-vitest%20%2B%20playwright-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

A small web tool that takes a chord chart in the common "chords sitting above the lyrics" layout, whether you typed it yourself or copied it from a site like Ultimate Guitar, and rewrites it into clean ChordPro. Chords become inline `[Chord]` tags placed against the syllable they land on, and section headers are normalised to `{c: Name}`. Charts that are already in ChordPro form pass straight through untouched.

This repo is the production version of a browser prototype. The conversion logic is the same, ported to TypeScript and extended to recognise the `[Section]` labels used by Ultimate Guitar.

## What it does

Given input like this:

```
{c: Verse 1:}
        C              G
Morning breaks across the hall
```

it produces:

```
{c: Verse 1}
Morning [C]breaks across [G]the hall
```

The rules it applies:

- Chords go inline in square brackets, positioned by column against the lyric.
- Section headers are written `{c: Name}` with no trailing colon. A messy `{c: Verse 1:}` is tidied automatically.
- Ultimate Guitar section labels such as `[Chorus]` are rewritten to `{c: Chorus}`. A lone bracketed token that is a real chord, like `[Am]` on its own line, is left as a chord.
- Chord-only lines such as `Am F C G` are bracketed individually to `[Am] [F] [C] [G]`.
- Lines already containing brackets or `{...}` directives are left as they are, so running the tool twice on the same chart is safe.

## Tech stack

- Next.js 15 (App Router) with TypeScript
- React for the interface
- Vitest for unit tests
- Playwright for end to end tests
- Vercel for hosting

## Prerequisites

- Node.js 20 LTS or newer
- npm (pnpm or yarn work too, adjust the commands accordingly)
- Git

## Project structure

```
songbookpro-formatter/
  app/
    globals.css        # styles, ported from the prototype
    layout.tsx         # root layout and page metadata
    page.tsx           # the formatter interface
  lib/
    converter.ts       # the conversion logic (framework free)
    converter.test.ts  # unit tests across multiple source formats
  e2e/
    convert.spec.ts    # end to end tests
  playwright.config.ts
  vitest.config.ts
  package.json
  README.md
```

Keeping the converter in `lib/` with no React or DOM dependencies is deliberate. It means the same function powers the page, the unit tests, and any future API route or command line tool without change.

## Getting started

### 1. Scaffold the Next.js app

```bash
npx create-next-app@latest songbookpro-formatter \
  --typescript --eslint --app --no-tailwind --no-src-dir --import-alias "@/*"
```

If you prefer the interactive prompts, run `npx create-next-app@latest songbookpro-formatter` and choose: TypeScript yes, ESLint yes, Tailwind no, `src/` directory no, App Router yes, and the default import alias `@/*`.

### 2. Install the test tooling

```bash
cd songbookpro-formatter
npm install -D vitest @playwright/test
npx playwright install --with-deps chromium
```

### 3. Add the source files

Create the files listed in the sections below. Then move your styling across: open your existing `chord-inliner.html`, copy everything inside the `<style>` block (without the `<style>` and `</style>` tags), and paste it into `app/globals.css`, replacing whatever `create-next-app` put there. The class names in `page.tsx` match the prototype exactly, so the look carries over as is.

### 4. Run it

```bash
npm run dev
```

Open http://localhost:3000, paste a chart, and click Convert.

## Source files

### `lib/converter.ts`

```ts
export interface ConvertOptions {
  /** Snap each chord to the nearest word start. Default true. */
  snap?: boolean;
  /** Bracket chord-only lines individually. Default true. */
  prog?: boolean;
}

const CHORD_RE =
  /^[A-G](#|b)?(m|maj|min|dim|aug|sus|add|M)?\d*(sus\d)?(add\d)?(\/[A-G](#|b)?)?$/i;

const SECTION_BRACKET_RE = /^\s*\[([^\]]+)\]\s*$/;

function cols(line: string): Array<[number, string]> {
  const out: Array<[number, string]> = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) out.push([m.index, m[0]]);
  return out;
}

function isChordOnly(line: string): boolean {
  const tokens = line.replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  return tokens.every((t) => CHORD_RE.test(t));
}

function isDirective(line: string): boolean {
  return /^\s*\{.*\}\s*$/.test(line);
}

function hasInline(line: string): boolean {
  return /\[[^\]]+\]/.test(line);
}

/**
 * Normalise a section header to the canonical form {c: Name}: a single space
 * after the colon and no redundant trailing colon. Other directives, such as
 * {title:} or {key:}, are left untouched.
 */
export function normalizeDirective(line: string): string {
  const m = line.match(/^\s*\{\s*(c|comment)\s*:\s*(.*?)\s*\}\s*$/i);
  if (!m) return line;
  const name = m[2].replace(/[:\s]+$/, '');
  return `{${m[1].toLowerCase()}: ${name}}`;
}

/**
 * A line that is a single bracketed label and not a real chord is treated as a
 * section header. This is how Ultimate Guitar marks sections, for example
 * [Verse 1] or [Chorus].
 */
function asSectionHeader(line: string): string | null {
  const m = line.match(SECTION_BRACKET_RE);
  if (!m) return null;
  const inner = m[1].trim();
  if (CHORD_RE.test(inner)) return null;
  return `{c: ${inner}}`;
}

function mergePair(chordLine: string, lyricLine: string, snap: boolean): string {
  const chords = cols(chordLine);
  const starts = cols(lyricLine).map((x) => x[0]);
  const groups: Record<number, string[]> = {};
  const order: number[] = [];

  for (const [col, chord] of chords) {
    let target: number;
    if (snap && starts.length) {
      target = starts.reduce((best, s) => {
        const d = Math.abs(s - col);
        const bd = Math.abs(best - col);
        if (d < bd) return s;
        if (d === bd) return s >= col ? s : best;
        return best;
      }, starts[0]);
    } else {
      target = col;
    }
    if (!(target in groups)) {
      groups[target] = [];
      order.push(target);
    }
    groups[target].push(`[${chord}]`);
  }

  let out = lyricLine;
  order.sort((a, b) => b - a);
  for (const idx of order) {
    const tag = groups[idx].join('');
    if (idx > out.length) out = out + ' '.repeat(idx - out.length);
    out = out.slice(0, idx) + tag + out.slice(idx);
  }
  return out;
}

function bracketProg(line: string): string {
  const tokens = line.replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
  return tokens.map((c) => `[${c}]`).join(' ');
}

export function convert(text: string, opts: ConvertOptions = {}): string {
  const snap = opts.snap ?? true;
  const prog = opts.prog ?? true;
  const lines = text.replace(/\r/g, '').split('\n');
  const res: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isDirective(line)) {
      res.push(normalizeDirective(line));
      continue;
    }

    const section = asSectionHeader(line);
    if (section) {
      res.push(section);
      continue;
    }

    if (hasInline(line)) {
      res.push(line);
      continue;
    }

    if (isChordOnly(line)) {
      const next = i + 1 < lines.length ? lines[i + 1] : '';
      const nextIsLyric =
        next.trim() !== '' &&
        !isDirective(next) &&
        asSectionHeader(next) === null &&
        !isChordOnly(next) &&
        !hasInline(next);

      if (nextIsLyric) {
        res.push(mergePair(line, next, snap));
        i++;
      } else {
        res.push(prog ? bracketProg(line) : line);
      }
      continue;
    }

    res.push(line);
  }

  return res.join('\n');
}
```

### `app/page.tsx`

```tsx
'use client';

import { useState, type ReactNode } from 'react';
import { convert } from '@/lib/converter';

const PLACEHOLDER = `Paste your chart here, e.g.

        C            G
Here is a little sample
        Am           F
showing how the chords land`;

function highlight(text: string): ReactNode[] {
  return text.split(/(\[[^\]]+\])/g).map((part, i) =>
    /^\[[^\]]+\]$/.test(part) ? (
      <span key={i} className="c">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function lineWord(n: number): string {
  return n === 1 ? '1 line' : `${n} lines`;
}

export default function Home() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [snap, setSnap] = useState(true);
  const [prog, setProg] = useState(true);
  const [toast, setToast] = useState('');

  const inLines = input.trim() === '' ? 0 : input.split('\n').length;
  const outLines = output.trim() === '' ? 0 : output.split('\n').length;

  function runConvert() {
    setOutput(convert(input, { snap, prog }));
  }

  function toggleSnap() {
    const next = !snap;
    setSnap(next);
    if (output || input.trim()) setOutput(convert(input, { snap: next, prog }));
  }

  function toggleProg() {
    const next = !prog;
    setProg(next);
    if (output || input.trim()) setOutput(convert(input, { snap, prog: next }));
  }

  function ping(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 1400);
  }

  async function copyOutput() {
    if (!output.trim()) {
      ping('Nothing to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(output);
      ping('Copied');
    } catch {
      ping('Copy failed');
    }
  }

  return (
    <div className="wrap">
      <p className="eyebrow">Mince Pie Studios &middot; Chart Tools</p>
      <h1>
        Songbook <span className="b">Pro</span> &middot; Formatter
      </h1>
      <p className="sub">
        Paste a chart with chords sitting above the lyrics, or one copied from a
        site like Ultimate Guitar. It rewrites every chord inline as{' '}
        <span style={{ color: 'var(--chord)' }}>[Chord]</span> and normalises
        section headers to{' '}
        <span style={{ color: 'var(--chord)' }}>{'{c: Name}'}</span>. Lines
        already in ChordPro form pass straight through.
      </p>

      <div className="controls">
        <button className="btn btn-primary" data-testid="convert" onClick={runConvert}>
          Convert
        </button>
        <button className="btn btn-ghost" data-testid="copy" onClick={copyOutput}>
          Copy output
        </button>
        <div className="spacer" />
        <button
          className="chip"
          data-testid="snap"
          aria-pressed={snap}
          onClick={toggleSnap}
        >
          <span className="dot" />
          Snap to nearest word
        </button>
        <button
          className="chip"
          data-testid="prog"
          aria-pressed={prog}
          onClick={toggleProg}
        >
          <span className="dot" />
          Bracket chord-only lines
        </button>
      </div>

      <div className="grid">
        <div className="pane">
          <div className="pane-head">
            <span className="lbl">Input</span>
            <span className="count">{lineWord(inLines)}</span>
          </div>
          <textarea
            data-testid="input"
            spellCheck={false}
            placeholder={PLACEHOLDER}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <div className="pane">
          <div className="pane-head">
            <span className="lbl">Output</span>
            <span className="count">{lineWord(outLines)}</span>
          </div>
          <pre data-testid="output">
            {output.trim() === '' ? (
              <span className="empty">Converted chart appears here.</span>
            ) : (
              highlight(output)
            )}
          </pre>
        </div>
      </div>

      <div className="note">
        <b>Two things to eyeball.</b> Charts align by eye, so a chord occasionally
        lands a syllable off; turn off snap for exact column placement. A
        performance note in a chord row, such as &quot;play twice&quot;, needs
        bracketing by hand as an inline comment, either on its own as{' '}
        <span style={{ color: 'var(--chord)' }}>[play twice]</span> or folded into
        a chord as{' '}
        <span style={{ color: 'var(--chord)' }}>[Dm7 (play twice)]</span>.
      </div>

      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}
```

### `app/layout.tsx`

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Songbook Pro Formatter',
  description:
    'Convert chord charts from plain text or Ultimate Guitar into clean ChordPro.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

## Testing

The conversion logic lives in one framework free module, which keeps the tests fast and simple. Unit tests cover the logic directly across several source formats, and the end to end tests drive the real page in a browser.

### Unit tests: `lib/converter.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { convert, normalizeDirective } from './converter';

describe('convert across sources', () => {
  it('plain chords-above-lyrics: inlines chords and tidies section headers', () => {
    const input = [
      '{c: Verse 1:}',
      '        C              G',
      'Morning breaks across the hall',
      '        Am             F',
      'shadows gather by the wall',
    ].join('\n');
    const expected = [
      '{c: Verse 1}',
      'Morning [C]breaks across [G]the hall',
      'shadows [Am]gather by the [F]wall',
    ].join('\n');
    expect(convert(input)).toBe(expected);
  });

  it('Ultimate Guitar style: converts [Section] labels and inlines chords', () => {
    const input = [
      '[Verse 1]',
      '       Dm           Bb',
      'Waiting for the tide to turn',
      '       F            C',
      'letters that we never burn',
      '',
      '[Chorus]',
      '    Gm       Eb        Bb',
      "Hold the line and don't let go",
    ].join('\n');
    const expected = [
      '{c: Verse 1}',
      'Waiting [Dm]for the tide [Bb]to turn',
      'letters [F]that we never [C]burn',
      '',
      '{c: Chorus}',
      "Hold [Gm]the line [Eb]and don't [Bb]let go",
    ].join('\n');
    expect(convert(input)).toBe(expected);
  });

  it('already in ChordPro form: passes through unchanged and is idempotent', () => {
    const input = [
      '{c: Chorus}',
      "[Gm]Hold the [Eb]line, don't let it [Bb]fall",
      '[F]Steady through the [C]evening [Dm]call',
    ].join('\n');
    expect(convert(input)).toBe(input);
    expect(convert(convert(input))).toBe(convert(input));
  });

  it('chord-only progression line: brackets each chord individually', () => {
    const input = ['{c: Instrumental}', 'Am  F  C  G'].join('\n');
    const expected = ['{c: Instrumental}', '[Am] [F] [C] [G]'].join('\n');
    expect(convert(input)).toBe(expected);
  });

  it('exact column placement when snap is off', () => {
    const input = ['     C', 'abcdefghij'].join('\n');
    // C sits at column 5, so without snapping it lands mid-word.
    expect(convert(input, { snap: false })).toBe('abcde[C]fghij');
  });
});

describe('normalizeDirective', () => {
  it('strips a redundant trailing colon and tidies spacing', () => {
    expect(normalizeDirective('{c: Verse 1:}')).toBe('{c: Verse 1}');
    expect(normalizeDirective('{comment:  Bridge : }')).toBe('{comment: Bridge}');
  });

  it('leaves metadata directives untouched', () => {
    expect(normalizeDirective('{title: Example Song}')).toBe('{title: Example Song}');
    expect(normalizeDirective('{key: E}')).toBe('{key: E}');
  });
});
```

### `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
```

Run them:

```bash
npm run test        # single run
npm run test:watch  # re-run on change
```

### End to end tests: `e2e/convert.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test('converts a pasted chart and highlights chords', async ({ page }) => {
  await page.goto('/');

  const input = [
    '{c: Verse 1:}',
    '        C              G',
    'Morning breaks across the hall',
  ].join('\n');

  await page.getByTestId('input').fill(input);
  await page.getByTestId('convert').click();

  const output = page.getByTestId('output');
  await expect(output).toContainText('{c: Verse 1}');
  await expect(output).toContainText('[C]');
  await expect(output).toContainText('[G]');
  await expect(output.locator('span.c').first()).toHaveText('[C]');
});

test('recognises Ultimate Guitar section labels', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('input').fill('[Chorus]\n    Am   G\nla la la la');
  await page.getByTestId('convert').click();
  await expect(page.getByTestId('output')).toContainText('{c: Chorus}');
});

test('snap toggle changes chord placement', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('input').fill('     C\nabcdefghij');

  // Snap is on by default, so the chord moves to the word start.
  await page.getByTestId('convert').click();
  await expect(page.getByTestId('output')).toContainText('[C]abcdefghij');

  // Turning snap off gives exact column placement.
  await page.getByTestId('snap').click();
  await expect(page.getByTestId('output')).toContainText('abcde[C]fghij');
});
```

### `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Builds and serves the production app before the tests run.
    // Swap to 'npm run dev' for faster local iteration.
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

Run them:

```bash
npm run test:e2e
```

## Scripts

Add the test scripts to the `scripts` block in `package.json` (the first four come from `create-next-app`):

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

## Continuous integration (optional)

To run both test suites automatically on every push and pull request, add `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run test
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

## Deploying to Vercel

Next.js needs no configuration on Vercel, so deployment is mostly clicking through the import flow.

1. Push this repo to GitHub as `songbookpro-formatter`.
2. Go to vercel.com, choose New Project, and import the repo.
3. Vercel detects Next.js and fills in the build settings for you. There are no environment variables to set.
4. Click Deploy.

After that, every push to `main` deploys to production automatically, and every pull request gets its own preview URL. Vercel runs the build, not your tests, so if you want the tests to gate a deploy, rely on the CI workflow above or configure an Ignored Build Step in the project settings.

To publish your first commit:

```bash
git init
git add .
git commit -m "Songbook Pro Formatter: initial Next.js version"
git branch -M main
git remote add origin https://github.com/<your-username>/songbookpro-formatter.git
git push -u origin main
```

## Using charts

This tool converts charts that you paste in. It does not fetch, scrape, or host anyone else's catalogue. That keeps it clear of both the source sites' terms and the underlying song rights, and it is also the simpler thing to run. If you later add a library feature, keep it to charts the user brings in rather than a shared collection you serve.

## License

MIT. Add a `LICENSE` file with your name as the copyright holder, for example:

```
Copyright (c) 2026 <your name>
```
