/**
 * SEITE — Scraper: El Lagar Costa Rica (ellagar.com)
 *
 * NOTA: El Lagar usa ahora una SPA (React). Se utiliza Playwright
 * para navegar la página, interactuar y permitir que carguen los productos.
 */

'use strict';

const { chromium } = require('playwright');

const BASE_URL = 'https://www.ellagar.com';

/**
 * @typedef {{ precio: number; moneda: string; url: string; titulo: string; fuente: string }} PriceResult
 */

/**
 * Busca un término en El Lagar usando Playwright.
 * @param {string} searchTerm
 * @returns {Promise<PriceResult[]>}
 */
async function searchElLagar(searchTerm) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-CR,es;q=0.9',
    });

    const searchUrl = `${BASE_URL}/ECOMMERCE/Buscar?busqueda=${encodeURIComponent(searchTerm)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Esperar los productos renderizados por React
    // El dom original de React tiene clases como 'producto-item', 'product-item', etc.
    // Vamos a ser más generales porque cambian (SPA)
    await page
      .waitForSelector('a[href*="DetalleArticulo"]', { timeout: 15000 })
      .catch(() => null);

    const results = await page.evaluate(() => {
      const items = [];
      const productEls = document.querySelectorAll('a[href*="DetalleArticulo"]');

      // Algunos DetalleArticulo son banners, iteramos para extraer precio y título cercano
      for (const linkEl of Array.from(productEls).slice(0, 10)) {
        const href = linkEl.href || linkEl.getAttribute('href');
        
        // El Lagar envuelve el link en un div padre que tiene todo el contenido y precio
        const container = linkEl.closest('div[class*="product"], div[class*="item"], div[class*="card"]');
        if (!container) continue;

        const textContent = container.textContent || '';
        
        // Regex para extraer formato ₡1.234,56 o parecido
        const cleanStr = textContent.replace(/₡/g, '').replace(/\s+/g, ' ');

        let precio = null;
        
        // Formato: 1.234,56
        const euroMatch = cleanStr.match(/(\d{1,3}(?:\.\d{3})+),(\d{2})/);
        if (euroMatch) precio = parseFloat(euroMatch[0].replace(/\./g, '').replace(',', '.'));
        
        if (!precio) {
          // Formato: 1234
          const match = cleanStr.match(/\b(\d{3,7})(?:[.,]\d{2})?\b/);
          if (match) precio = parseFloat(match[1]);
        }

        if (precio && href) {
          items.push({
            precio,
            moneda: 'CRC',
            url: href.startsWith('http') ? href : `https://www.ellagar.com${href.startsWith('/') ? href : '/' + href}`,
            titulo: container.querySelector('h1, h2, h3, h4, h5, [class*="title"], [class*="name"]')?.textContent?.trim() || linkEl.textContent?.trim() || '',
            fuente: 'ellagar',
          });
        }
      }

      // Evitar duplicados por misma URL
      const unique = [];
      const urls = new Set();
      for (const item of items) {
        if (!urls.has(item.url)) {
          unique.push(item);
          urls.add(item.url);
        }
      }

      return unique.slice(0, 5);
    });

    return results;
  } catch (err) {
    console.warn(`  [El Lagar] Error buscando "${searchTerm}": ${err.message}`);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { searchElLagar };
