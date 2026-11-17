import { expect, test, type Page } from '@playwright/test';

/** Answer whatever is on screen (right or wrong) until the lesson end screen appears. */
async function playUntilEnd(page: Page) {
  for (let i = 0; i < 80; i++) {
    if (await page.getByText(/geschafft!|geübt!/).first().isVisible().catch(() => false)) return;

    const go = page.getByRole('button', { name: /^Los geht's$/ });
    if (await go.isVisible().catch(() => false)) { await go.click(); continue; }

    const next = page.getByRole('button', { name: /^Weiter$/ });
    if (await next.isVisible().catch(() => false)) { await next.click(); continue; }

    if (await page.locator('.pairs').isVisible().catch(() => false)) {
      const left = page.locator('.pairs .col').nth(0).locator('button');
      const right = page.locator('.pairs .col').nth(1).locator('button');
      const n = await left.count();
      for (let a = 0; a < n; a++) {
        for (let b = 0; b < n; b++) {
          if (await left.nth(a).isDisabled()) break;
          if (await right.nth(b).isDisabled()) continue;
          await left.nth(a).click();
          await right.nth(b).click();
          await page.waitForTimeout(80); // let the match render before checking again
        }
      }
      await page.waitForTimeout(500);
      continue;
    }

    const said = page.getByRole('button', { name: /Ich hab's gesagt/ });
    if (await said.isVisible().catch(() => false)) { await said.click(); continue; }

    const ta = page.locator('textarea');
    if (await ta.isVisible().catch(() => false)) await ta.fill('test');
    else if (await page.locator('.tiles-bank').isVisible().catch(() => false)) await page.locator('.tiles-bank .tile').first().click();
    else await page.locator('.options .option').first().click();

    await page.getByRole('button', { name: 'Prüfen' }).click();
  }
  throw new Error('Lesson did not finish');
}

async function firstStart(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Trotzdem im Browser weiter' }).click();
  await page.getByRole('button', { name: "Los geht's" }).click();
  await page.getByRole('button', { name: /2 Runden/ }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: /Weiblich/ }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page.getByText('Hörst du die kroatische Stimme?')).toBeVisible();
  await page.getByRole('button', { name: 'Ja, ich höre sie' }).click();
  await expect(page.getByText('Tagesziel')).toBeVisible();
}

test('first start, one full lesson, progress survives a reload', async ({ page }) => {
  await firstStart(page);
  await expect(page.getByText('0 von 2 Runden')).toBeVisible();

  await page.getByRole('button', { name: 'Vertraute Laute' }).click();
  await page.getByRole('button', { name: 'Starten' }).click();
  await playUntilEnd(page);
  await expect(page.getByText('Lektion geschafft!')).toBeVisible();
  await expect(page.getByText('+10').or(page.getByText('+15'))).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();

  await page.reload();
  await expect(page.getByText('1 von 2 Runden')).toBeVisible();
  await expect(page.getByText(/1[05] XP/)).toBeVisible();
  // Next lesson is unlocked
  await expect(page.getByRole('button', { name: 'c, z, s, h', exact: true })).toBeEnabled();
  // Words were learned
  await page.getByRole('link', { name: /Wörter/ }).click();
  await expect(page.getByText('7 Wörter gelernt')).toBeVisible();
  await page.getByPlaceholder(/Suchen/).fill('Wasser');
  await expect(page.getByText('voda')).toBeVisible();
});

test('a running lesson survives a reload', async ({ page }) => {
  await firstStart(page);
  await page.getByRole('button', { name: 'Vertraute Laute' }).click();
  await page.getByRole('button', { name: 'Starten' }).click();
  await page.getByRole('button', { name: "Los geht's" }).click();
  const first = await page.locator('.intro-card .word').textContent();
  await page.getByRole('button', { name: 'Weiter' }).click();
  const second = await page.locator('.intro-card .word').textContent();
  expect(second).not.toBe(first);
  await page.reload();
  await expect(page.locator('.intro-card .word')).toHaveText(second!);
});

test('export and import progress', async ({ page }) => {
  await firstStart(page);
  await page.getByRole('link', { name: /Einstellungen/ }).click();
  const backup = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('pomalo-state')!);
    state.xp = 123;
    return JSON.stringify({ app: 'pomalo-backup', exportedAt: new Date().toISOString(), state });
  });
  await page.getByRole('button', { name: /Sicherung laden/ }).click();
  await page.locator('.sheet textarea').fill(backup);
  await expect(page.getByText(/123/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Ja, Sicherung laden' }).click();
  await page.getByRole('link', { name: /Lernen/ }).click();
  await expect(page.getByText('123 XP')).toBeVisible();
});

test('the built app works offline', async ({ page, context, browserName }) => {
  await page.goto('./');
  const hasSW = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    return true;
  });
  test.skip(!hasSW, `Service workers are not available in ${browserName} here`);
  // Wait until the service worker controls the page and has cached everything.
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Hol dir Pomalo aufs iPhone')).toBeVisible();
  await page.getByRole('button', { name: 'Trotzdem im Browser weiter' }).click();
  await expect(page.getByText('Willkommen bei Pomalo')).toBeVisible();
  await context.setOffline(false);
});
