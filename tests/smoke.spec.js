// Smoke tests: navegación, menú móvil, filtros, buscador, tema, newsletter,
// artículos, overflow horizontal y consola sin errores.
import { test, expect } from '@playwright/test';

const EXTERNAL = /^(https?:)\/\/(?!localhost)/;

// Las fuentes/imágenes externas se bloquean para que los tests no dependan de internet.
test.beforeEach(async ({ page }) => {
  await page.route(EXTERNAL, (route) => route.abort());
});

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource|ERR_FAILED|net::/.test(t)) return; // recursos externos bloqueados a propósito
    errors.push('console: ' + t);
  });
  return errors;
}

test('home carga sin errores de consola y con contenido clave', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('./');
  await expect(page).toHaveTitle('AGROVISION_MX — Del campo al dato');
  await expect(page.locator('h1')).toHaveText('El campo que imagina el futuro.');
  await expect(page.locator('#dataGrid .dcard')).toHaveCount(6);
  await expect(page.locator('#articleGrid .acard')).toHaveCount(6);
  await expect(page.locator('#mxMap .st')).toHaveCount(32);
  await page.mouse.wheel(0, 20000);
  await page.waitForTimeout(600);
  expect(errors).toEqual([]);
});

test('cada dato y artículo muestra fuente enlazada', async ({ page }) => {
  await page.goto('./');
  const cards = page.locator('#dataGrid .dcard');
  for (let i = 0; i < await cards.count(); i++) await expect(cards.nth(i).locator('a.src')).toHaveAttribute('href', /^https:\/\//);
  await expect(page.locator('#factSrc')).toHaveAttribute('href', /^https:\/\//);
});

test('navegación con smooth scroll y sección activa', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  await page.locator('.nav__links a[href="#datos"]').click();
  await expect(page).toHaveURL(/#datos$/);
  await expect(page.locator('#datos')).toBeInViewport();
  await expect(page.locator('#nav')).toHaveClass(/is-solid/);
});

test('menú móvil abre, cierra y navega', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  const burger = page.locator('#burger');
  await expect(burger).toBeVisible();
  await burger.click();
  await expect(burger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#menu')).toHaveClass(/open/);
  await page.locator('#menu a[href="#mexico"]').click();
  await expect(burger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#mexico')).toBeInViewport();
  await burger.click();
  await page.keyboard.press('Escape');
  await expect(burger).toHaveAttribute('aria-expanded', 'false');
});

test('filtros de artículos', async ({ page }) => {
  await page.goto('./');
  const visible = page.locator('#articleGrid .acard:not(.is-hidden)');
  await page.locator('#filters [data-filter="TECH"]').click();
  await expect(visible).toHaveCount(3);
  await page.locator('#filters [data-filter="NEGOCIO"]').click();
  await expect(visible).toHaveCount(1);
  await expect(page.locator('#filters [data-filter="NEGOCIO"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#filters [data-filter="all"]').click();
  await expect(visible).toHaveCount(6);
});

test('buscador encuentra contenido local y se cierra con Escape', async ({ page }) => {
  await page.goto('./');
  await page.locator('[data-open-search]').first().click();
  const input = page.locator('#searchInput');
  await expect(input).toBeFocused();
  await input.fill('drones');
  await expect(page.locator('#searchResults a').first()).toContainText(/Dron/i);
  await page.locator('.search__cats [data-cat="México"]').click();
  await input.fill('jalisco');
  await expect(page.locator('#searchResults a').first()).toContainText('Jalisco');
  await page.keyboard.press('Escape');
  await expect(page.locator('#search')).toBeHidden();
});

test('tema oscuro persiste en localStorage', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('#themeToggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#themeToggle')).toHaveAttribute('aria-pressed', 'true');
});

test('newsletter valida y no simula un registro real', async ({ page }) => {
  await page.goto('./');
  const input = page.locator('#nlEmail'), msg = page.locator('#nlMsg');
  await page.locator('#nlForm button[type=submit]').click();
  await expect(msg).toHaveClass(/err/);
  await input.fill('correo-malo');
  await page.locator('#nlForm button[type=submit]').click();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await input.fill('productor@campo.mx');
  await page.locator('#nlForm button[type=submit]').click();
  await expect(msg).toHaveClass(/ok/);
  await expect(msg).toContainText('Todavía no enviamos correos');
});

test('mapa de México muestra dato con fuente o Próximamente', async ({ page }) => {
  await page.goto('./');
  await page.locator('#mxMap [data-code="CHIH"]').click();
  await expect(page.locator('#mxPanel h3')).toHaveText('Chihuahua');
  await expect(page.locator('#mxPanel a.src').first()).toHaveAttribute('href', /^https:\/\//);
  await page.locator('#mxMap [data-code="QRO"]').focus();
  await expect(page.locator('#mxPanel')).toContainText('Próximamente');
});

test('¿Sabías que? cambia de dato', async ({ page }) => {
  await page.goto('./');
  const t = page.locator('#factText');
  const first = await t.textContent();
  await page.locator('#factNext').click();
  await expect(t).not.toHaveText(first);
});

test('back-to-top aparece y regresa arriba', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => window.scrollTo(0, 3000));
  await expect(page.locator('#toTop')).toHaveClass(/show/);
  await page.locator('#toTop').click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(50);
});

test('artículos: listado y detalle funcionan bajo la subruta de GitHub Pages', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('./articles/');
  await expect(page.locator('#articleGrid .acard')).toHaveCount(6);
  await page.locator('#articleGrid .acard h3 a').first().click();
  await expect(page).toHaveURL(/articles\/[a-z0-9-]+\.html$/);
  await expect(page.locator('.prose p').first()).toBeVisible();
  await expect(page.locator('.sources a').first()).toHaveAttribute('href', /^https:\/\//);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

for (const w of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
  test(`sin overflow horizontal a ${w}px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('./');
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw).toBeLessThanOrEqual(w);
    await page.goto('./articles/drones-agricolas.html');
    const sw2 = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw2).toBeLessThanOrEqual(w);
  });
}

test('navegación con teclado: skip link y foco visible', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#contenido$/);
});
