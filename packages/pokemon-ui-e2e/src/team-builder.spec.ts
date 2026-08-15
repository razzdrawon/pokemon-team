import { test, expect } from '@playwright/test';

// Runs against the real backend (tilt up) — no mocks. Profile name includes a timestamp
// so repeated runs against the persistent dev DB never collide on PROFILE_NAME_TAKEN.
test('create a profile, select 6 Pokémon, submit, and persist across reload', async ({ page }) => {
  const profileName = `E2E ${Date.now()}`;
  const team = ['bulbasaur', 'ivysaur', 'venusaur', 'charmander', 'charmeleon', 'charizard'];

  await page.goto('/');

  await page.getByPlaceholder('New profile name').fill(profileName);
  await page.getByRole('button', { name: 'Create' }).click();

  const profileButton = page.getByRole('button', { name: `${profileName} (0/6)` });
  await expect(profileButton).toBeVisible();

  for (const name of team) {
    await page.getByRole('button', { name }).click();
  }

  await page.getByRole('button', { name: 'Submit team' }).click();
  await expect(page.getByRole('button', { name: `${profileName} (6/6)` })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: `${profileName} (6/6)` })).toBeVisible();
  await page.getByRole('button', { name: `${profileName} (6/6)` }).click();
  await expect(page.getByRole('button', { name: 'remove' })).toHaveCount(team.length);
});
