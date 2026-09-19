// Tests del dashboard AGROVISION INTELLIGENCE (/intel/). Ejecuta: npm test
import { test, expect } from '@playwright/test';

const EXTERNAL = /^(https?:)\/\/(?!localhost)/;
test.beforeEach(async ({ page }) => { await page.route(EXTERNAL, (r) => r.abort()); });
function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::/.test(m.text())) errors.push(m.text()); });
  return errors;
}

test('intel: carga base, tendencias y resultados sin errores', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('intel/');
  await expect(page).toHaveTitle('AGROVISION INTELLIGENCE');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('#trends .trend').first()).toBeVisible();
  expect(await page.locator('#list .card').count()).toBeGreaterThan(20);
  await expect(page.locator('#export-menu')).toBeHidden();
  expect(errors).toEqual([]);
});

test('intel: cada resultado muestra fuente enlazada, fecha y evidencia', async ({ page }) => {
  await page.goto('intel/');
  const cards = page.locator('#list .card');
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    const c = cards.nth(i);
    await expect(c.locator('.card__src a')).toHaveAttribute('href', /^https:\/\//);
    await expect(c.locator('.ev')).toHaveText(/EVIDENCIA (ALTO|MEDIO|BAJO)/);
  }
});

test('intel: búsqueda, pestañas y filtros reducen resultados', async ({ page }) => {
  await page.goto('intel/');
  const total = await page.locator('#list .card').count();
  await page.fill('#q', 'aguacate');
  await expect.poll(() => page.locator('#list .card').count()).toBeLessThan(total);
  await expect(page.locator('#list .card').first()).toContainText(/aguacate/i);
  await page.fill('#q', '');
  await page.click('[data-cat=TECH]');
  await expect(page.locator('#list .card .chip--TECH').first()).toBeVisible();
  await page.click('[data-cat=""]');
  await page.selectOption('#filters [name=evidence]', 'BAJO');
  const bajos = page.locator('#list .card');
  await expect(bajos.first()).toContainText('NO VERIFICADO');
  await page.click('#filters [type=reset]');
});

test('intel: tendencia filtra, guardar persiste y analizar abre panel', async ({ page }) => {
  await page.goto('intel/');
  await page.locator('#trends .trend').first().click();
  await expect(page.locator('#active-filters')).toHaveText(/1 activo/);
  const first = page.locator('#list .card').first();
  await first.locator('[data-act=save]').click();
  await expect(page.locator('#saved-count')).toHaveText('1');
  await page.reload();
  await expect(page.locator('#saved-count')).toHaveText('1');
  await page.click('[data-cat=__saved]');
  await expect(page.locator('#list .card')).toHaveCount(1);
  await page.locator('#list .card [data-act=analyze]').click();
  await expect(page.locator('#panel')).toBeVisible();
  await expect(page.locator('#panel-body')).toContainText('¿Hay evidencia?');
  await expect(page.locator('#panel-body')).toContainText('schema.org');
});

test('intel: genera Instagram (9 slides) y newsletter con fuentes', async ({ page }) => {
  await page.goto('intel/');
  const card = page.locator('#list .card').first();
  await card.locator('[data-type=instagram]').click();
  const md = page.locator('#panel-body pre');
  for (let i = 1; i <= 9; i++) await expect(md).toContainText(`SLIDE ${i}`);
  await expect(md).toContainText('Fuentes');
  await page.click('[data-close]');
  await card.locator('[data-type=newsletter]').click();
  await expect(md).toContainText('Lee el análisis completo en AGROVISION_MX');
  const dl = page.waitForEvent('download');
  await page.click('[data-act=download]');
  expect((await dl).suggestedFilename()).toMatch(/newsletter\.md$/);
});

test('intel: exporta CSV y muestra la tabla de datos', async ({ page }) => {
  await page.goto('intel/');
  await page.click('#btn-export');
  const dl = page.waitForEvent('download');
  await page.click('[data-export=csv]');
  expect((await dl).suggestedFilename()).toMatch(/\.csv$/);
  await page.click('[data-cat=__data]');
  expect(await page.locator('#data tbody tr').count()).toBeGreaterThan(50);
});

test('intel: responsive sin scroll horizontal', async ({ page }) => {
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('intel/');
    await page.locator('#list .card').first().waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `ancho ${width}`).toBeLessThanOrEqual(1);
  }
});
