import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Songbook Pro Formatter',
  description:
    'Convert chord charts from plain text or Ultimate Guitar into clean ChordPro.',
};

// Runs before paint to apply the saved or system theme, so there is no flash of
// the wrong colours on load. The toggle in app/page.tsx keeps this in sync.
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem('theme');
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark';
    }
    document.documentElement.dataset.theme = t;
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
