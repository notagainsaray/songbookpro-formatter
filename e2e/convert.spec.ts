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
