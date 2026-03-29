/**
 * SEITE — Scraper: Construplaza Costa Rica (construplaza.com)
 *
 * Construplaza usa Magento. Los precios son visibles sin login en el
 * catálogo público. Usa Playwright para manejar JS de Magento.
 */

'use strict';

const { chromium } = require('playwright');

const BASE_URL = 'https://www.construplaza.com';

/**
 * @typedef {{ precio: number; moneda: string; url: string; titulo: string; fuente: string }} PriceResult
 */

/**
 * Busca un término en Construplaza usando Playwright.
 * @param {string} searchTerm
 * @returns {Promise<PriceResult[]>}
 */
async function searchConstruplaza(searchTerm) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-CR,es;q=0.9',
    });

    const searchUrl = `${BASE_URL}/catalogsearch/result/?q=${encodeURIComponent(searchTerm)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 20000 });

    // Esperar productos
    await page
      .waitForSelector('.product-item, .products-grid .item', { timeout: 8000 })
      .catch(() => null);

    const results = await page.evaluate(() => {
      const items = [];
      const productEls = document.querySelectorAll(
        '.product-item, .products-grid .item, [class*="product-card"]'
      );

      for (const el of Array.from(productEls).slice(0, 5)) {
        const linkEl = el.querySelector('a.product-item-link, a[href]');
        const priceEl = el.querySelector(
          '[data-price-amount], .price, [class*="price"]'
        );

        if (!linkEl || !priceEl) continue;

        const href = linkEl.href || linkEl.getAttribute('href');
        const priceAttr = priceEl.getAttribute('data-price-amount');
        const priceText = priceEl.textContent || '';

        let precio = priceAttr ? parseFloat(priceAttr) : null;
        if (!precio) {
          const numStr = priceText.replace(/[^\d.,]/g, '').replace(',', '.');
          precio = parseFloat(numStr) || null;
        }

        if (!href || !precio) continue;

        items.push({
          precio,
          moneda: 'CRC',
          url: href.startsWith('http') ? href : `https://www.construplaza.com${href}`,
          titulo: (el.querySelector('[class*="name"]') || linkEl).textContent?.trim() || '',
          fuente: 'construplaza',
        });
      }

      return items;
    });

    return results;
  } catch (err) {
    console.warn(`  [Construplaza] Error buscando "${searchTerm}": ${err.message}`);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { searchConstruplaza };
