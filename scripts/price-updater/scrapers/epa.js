/**
 * SEITE — Scraper: EPA Costa Rica (epa.co.cr)
 *
 * EPA usa una SPA (React), requiere Playwright para renderizar JS.
 * El módulo devuelve [] si falla, sin romper el flujo principal.
 */

'use strict';

const { chromium } = require('playwright');

const BASE_URL = 'https://www.epa.co.cr';

/**
 * @typedef {{ precio: number; moneda: string; url: string; titulo: string; fuente: string }} PriceResult
 */

/**
 * Busca un término en EPA CR usando Playwright.
 * @param {string} searchTerm
 * @returns {Promise<PriceResult[]>}
 */
async function searchEPA(searchTerm) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-CR,es;q=0.9',
    });

    // Navegar a la búsqueda de EPA
    const searchUrl = `${BASE_URL}/catalogsearch/result/?q=${encodeURIComponent(searchTerm)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 20000 });

    // Esperar que carguen productos
    await page.waitForSelector(
      '.product-item, [class*="product"], [class*="item-product"]',
      { timeout: 8000 }
    ).catch(() => null);

    const results = await page.evaluate(() => {
      const items = [];

      // Selectores probables de EPA (Magento-based)
      const productEls = document.querySelectorAll(
        '.product-item, .item, [class*="product-card"]'
      );

      for (const el of Array.from(productEls).slice(0, 5)) {
        const linkEl = el.querySelector('a[href]');
        const priceEl = el.querySelector(
          '[class*="price"], .precio, span[data-price-amount]'
        );

        if (!linkEl || !priceEl) continue;

        const href = linkEl.href || linkEl.getAttribute('href');
        const priceText = priceEl.textContent || '';
        const priceAttr = priceEl.getAttribute('data-price-amount');

        // Precio desde atributo data (más confiable) o desde texto
        let precio = priceAttr ? parseFloat(priceAttr) : null;
        if (!precio) {
          const numStr = priceText.replace(/[^\d.,]/g, '').replace(',', '.');
          precio = parseFloat(numStr) || null;
        }

        if (!href || !precio) continue;

        items.push({
          precio,
          moneda: 'CRC',
          url: href.startsWith('http') ? href : `https://www.epa.co.cr${href}`,
          titulo: (el.querySelector('[class*="name"], [class*="title"]') || linkEl).textContent?.trim() || '',
          fuente: 'epa',
        });
      }

      return items;
    });

    return results;
  } catch (err) {
    // EPA falla silenciosamente — no bloqueamos el flujo principal
    console.warn(`  [EPA] Error buscando "${searchTerm}": ${err.message}`);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { searchEPA };
