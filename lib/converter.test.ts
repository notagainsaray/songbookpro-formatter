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

describe('extended chord recognition', () => {
  it('inlines "+" (augmented / maj7) chords above lyrics', () => {
    const out = convert(['C7+     Bm', 'Things fall apart'].join('\n'));
    expect(out).toContain('[C7+]');
    expect(out).toContain('[Bm]');
  });

  it('brackets a parenthesised chord-only progression, keeping the parens', () => {
    expect(convert('( C7+  D  B7  Em  D )')).toBe('( [C7+] [D] [B7] [Em] [D] )');
  });

  it('treats a parenthesised chord as a chord when inlining', () => {
    const out = convert(['       (D)   C7+', 'And you both let go'].join('\n'));
    expect(out).toContain('[D]');
    expect(out).toContain('[C7+]');
    expect(out).not.toMatch(/\(D\)/);
  });

  it('leaves a parenthesised performance note alone', () => {
    expect(convert('(play twice)')).toBe('(play twice)');
  });
});

describe('labeled chord lines (section label + chords)', () => {
  it('brackets the chords after a section label when prog is on', () => {
    expect(convert('Intro C7+  Bm  Em')).toBe('Intro [C7+] [Bm] [Em]');
  });

  it('leaves the labeled line untouched when prog is off', () => {
    expect(convert('Intro C7+  Bm  Em', { prog: false })).toBe(
      'Intro C7+  Bm  Em',
    );
  });

  it('handles a numbered label such as "Verse 1"', () => {
    expect(convert('Verse 1  C  G  Am')).toBe('Verse 1 [C] [G] [Am]');
  });

  it('leaves a lyric that starts with a non-label word alone', () => {
    expect(convert('Hold the C line')).toBe('Hold the C line');
  });

  it('leaves a section word not followed by chords alone', () => {
    expect(convert('Bridge over the water')).toBe('Bridge over the water');
  });
});

describe('capo lines', () => {
  it('converts a plain capo instruction to a {capo} directive', () => {
    expect(convert('Capo on the  fret 2')).toBe('{capo: 2}');
  });

  it('reads common capo phrasings', () => {
    expect(convert('Capo 2')).toBe('{capo: 2}');
    expect(convert('Capo: 3')).toBe('{capo: 3}');
    expect(convert('Capo 2nd fret')).toBe('{capo: 2}');
    expect(convert('Capo on fret 5')).toBe('{capo: 5}');
    expect(convert('Capo II')).toBe('{capo: 2}');
  });

  it('is idempotent — an existing {capo} passes through', () => {
    expect(convert('{capo: 2}')).toBe('{capo: 2}');
  });

  it('leaves a lyric that merely starts with "Capo" alone', () => {
    expect(convert('Capo 2 was the best decision')).toBe(
      'Capo 2 was the best decision',
    );
  });

  it('leaves a bare "Capo" with no fret alone', () => {
    expect(convert('Capo')).toBe('Capo');
  });
});

describe('punctuation and bare section labels', () => {
  it('brackets a comma-separated chord line with a trailing period', () => {
    expect(convert('DbMaj7, Cm7, Bbm7, AbMaj7, C7.')).toBe(
      '[DbMaj7] [Cm7] [Bbm7] [AbMaj7] [C7]',
    );
  });

  it('formats bare section labels on their own line', () => {
    expect(convert('Verse')).toBe('{c: Verse}');
    expect(convert('Pre-Chorus')).toBe('{c: Pre-Chorus}');
    expect(convert('Chorus:')).toBe('{c: Chorus}');
    expect(convert('Verse 2')).toBe('{c: Verse 2}');
  });

  it('leaves a non-label single word alone', () => {
    expect(convert('Hello')).toBe('Hello');
  });

  it('handles a full lead sheet of sections and chord rows', () => {
    const input = [
      'Verse',
      'DbMaj7, Cm7, Bbm7, AbMaj7, C7.',
      '',
      'Pre-Chorus',
      'Bbm7, Cm7, DbMaj7, Dbm6 C7.',
    ].join('\n');
    const expected = [
      '{c: Verse}',
      '[DbMaj7] [Cm7] [Bbm7] [AbMaj7] [C7]',
      '',
      '{c: Pre-Chorus}',
      '[Bbm7] [Cm7] [DbMaj7] [Dbm6] [C7]',
    ].join('\n');
    expect(convert(input)).toBe(expected);
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
