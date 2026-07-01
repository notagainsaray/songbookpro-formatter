export interface ConvertOptions {
  /** Snap each chord to the nearest word start. Default true. */
  snap?: boolean;
  /** Bracket chord-only lines individually. Default true. */
  prog?: boolean;
}

const CHORD_RE =
  /^[A-G](#|b)?(m|maj|min|dim|aug|sus|add|M|\+)?\d*(sus\d)?(add\d)?\+?(\/[A-G](#|b)?)?$/i;

const SECTION_BRACKET_RE = /^\s*\[([^\]]+)\]\s*$/;

function cols(line: string): Array<[number, string]> {
  const out: Array<[number, string]> = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) out.push([m.index, m[0]]);
  return out;
}

/** A chord token, unwrapped from surrounding parentheses: "(D)" -> "D". */
function chordName(token: string): string {
  const m = token.match(/^\((.+)\)$/);
  return m ? m[1] : token;
}

/**
 * Strip a single pair of parentheses that wraps an entire line, as used for
 * instrumental progressions: "( C7+ D Em )" -> "C7+ D Em". A line with inner
 * parentheses such as "(play twice)" still reaches the caller, which rejects it
 * because its tokens are not chords.
 */
function unwrapLine(line: string): string {
  const trimmed = line.trim();
  const m = trimmed.match(/^\(\s*([^()]*?)\s*\)$/);
  return m ? m[1] : trimmed;
}

function isChord(token: string): boolean {
  return CHORD_RE.test(chordName(token));
}

function isChordOnly(line: string): boolean {
  const tokens = unwrapLine(line.replace(/,/g, ' ')).split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  return tokens.every((t) => isChord(t));
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
    groups[target].push(`[${chordName(chord)}]`);
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
  const trimmed = line.replace(/,/g, ' ').trim();
  const inner = unwrapLine(trimmed);
  const tokens = inner.split(/\s+/).filter(Boolean);
  const body = tokens.map((c) => `[${chordName(c)}]`).join(' ');
  // Preserve the parentheses of a wrapped progression: "( [C7+] [D] [Em] )".
  return inner === trimmed ? body : `( ${body} )`;
}

const SECTION_LABELS = new Set([
  'intro', 'outro', 'verse', 'chorus', 'prechorus', 'pre-chorus', 'bridge',
  'solo', 'instrumental', 'interlude', 'tag', 'vamp', 'coda', 'ending',
  'refrain', 'hook', 'break', 'turnaround', 'riff', 'breakdown', 'final',
  'prelude', 'reprise', 'link', 'chant',
]);

function isSectionLabel(token: string): boolean {
  return SECTION_LABELS.has(token.toLowerCase().replace(/:+$/, ''));
}

/**
 * A line that is a section label followed by chords, e.g. "Intro C7+ Bm Em" or
 * "Verse 1 C G". Returns the label text and the chord tokens, or null if the
 * line is not that shape. Requiring a known section word as the first token,
 * and every following token to be a chord, keeps ordinary lyric lines
 * (e.g. "Hold the C line") from being treated as chords.
 */
function splitLabeledChords(
  line: string,
): { label: string; chords: string[] } | null {
  const tokens = line.replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || !isSectionLabel(tokens[0])) return null;
  const labelParts = [tokens[0]];
  let i = 1;
  if (/^\d+$/.test(tokens[i])) {
    labelParts.push(tokens[i]);
    i += 1;
  }
  const chords = tokens.slice(i);
  if (!chords.length || !chords.every((t) => isChord(t))) return null;
  return { label: labelParts.join(' ').replace(/:+$/, ''), chords };
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

    const labeled = splitLabeledChords(line);
    if (labeled) {
      const chords = labeled.chords.map((c) => `[${chordName(c)}]`).join(' ');
      res.push(prog ? `${labeled.label} ${chords}` : line);
      continue;
    }

    res.push(line);
  }

  return res.join('\n');
}
