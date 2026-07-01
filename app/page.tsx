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

  function toggleTheme() {
    const root = document.documentElement;
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // ignore storage errors (e.g. private mode)
    }
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
      <p className="eyebrow">Chart Tools</p>
      <h1>
        Songbook <span className="b">Pro</span> <span className="dot-sep">&middot;</span> Formatter
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
        <button
          className="theme-toggle"
          data-testid="theme"
          aria-label="Toggle light and dark theme"
          title="Toggle light and dark theme"
          onClick={toggleTheme}
        >
          <svg
            className="icon-sun"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
          <svg
            className="icon-moon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
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
        <b>Two things to eyeball.</b>{' '}Charts align by eye, so a chord occasionally
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
