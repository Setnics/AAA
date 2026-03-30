/**
 * SEITE — Scraper: Mercado Libre Costa Rica
 *
 * Usa Playwright para evadir bloqueos 403 de la API pública
 * y de fetch directos.
 */

'use strict';

const { chromium } = require('playwright');

const BASE_URL = 'https://listado.mercadolibre.co.cr';

/**
 * @typedef {{ precio: number; moneda: string; url: string; titulo: string; fuente: string }} PriceResult
 */

/**
 * Busca un término en Mercado Libre usando Playwright.
 * @param {string} searchTerm
 * @returns {Promise<PriceResult[]>}
 */
async function searchMercadoLibre(searchTerm) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    // Usamos un context con User Agent aleatorio para Evitar antibot
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    const url = `${BASE_URL}/${encodeURIComponent(searchTerm.replace(/ /g, '-'))}#D[A:${encodeURIComponent(searchTerm)}]`;
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Esperar a que cargue la grilla de resultados
    await page.waitForSelector('.ui-search-result__wrapper', { timeout: 10000 }).catch(() => null);

    const results = await page.evaluate(() => {
      const items = [];
      const productEls = document.querySelectorAll('.ui-search-result__wrapper');

      for (const el of Array.from(productEls).slice(0, 5)) {
        const linkEl = el.querySelector('a.ui-search-item__group__element');
        const priceEl = el.querySelector('.andes-money-amount__fraction');
        const currencyEl = el.querySelector('.andes-money-amount__currency-symbol');
        const titleEl = el.querySelector('h2.ui-search-item__title');

        if (!linkEl || !priceEl) continue;

        const href = linkEl.href || linkEl.getAttribute('href');
        const priceText = priceEl.textContent || '';
        const currency = currencyEl?.textContent?.includes('U$S') ? 'USD' : 'CRC';
        const title = titleEl?.textContent?.trim() || '';

        const numStr = priceText.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
        const precio = parseFloat(numStr);

        if (href && precio) {
          // Limpiar URLs de rastreo de MercadoLibre
          const cleanUrl = href.split('?')[0];
          
          items.push({
            precio,
            moneda: currency,
            url: cleanUrl,
            titulo: title,
            fuente: 'mercadolibre',
          });
        }
      }

      return items;
    });

    return results;

  } catch (err) {
    console.warn(`  [Mercado Libre] Error buscando "${searchTerm}": ${err.message}`);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { searchMercadoLibre };
