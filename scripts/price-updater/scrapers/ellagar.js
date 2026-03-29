/**
 * SEITE — Scraper: El Lagar (ellagar.com)
 *
 * El Lagar usa HTML server-side renderizado, accesible con fetch + cheerio.
 * No requiere Playwright.
 *
 * Estructura de URLs conocida:
 *   Búsqueda:  https://www.ellagar.com/ECOMMERCE/Buscar?busqueda={term}
 *   Producto:  https://www.ellagar.com/ECOMMERCE/DetalleArticulo/{id}/{slug}
 */

'use strict';

const fetch = require('node-fetch');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.ellagar.com';

/**
 * @typedef {{ precio: number; moneda: string; url: string; titulo: string; fuente: string }} PriceResult
 */

/**
 * Busca un término en El Lagar y devuelve los primeros resultados con precio.
 * @param {string} searchTerm
 * @returns {Promise<PriceResult[]>}
 */
async function searchElLagar(searchTerm) {
  const searchUrl = `${BASE_URL}/ECOMMERCE/Buscar?busqueda=${encodeURIComponent(searchTerm)}`;

  const res = await fetch(searchUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-CR,es;q=0.9',
    },
    timeout: 12000,
    redirect: 'follow',
  });

  if (!res.ok) throw new Error(`El Lagar fetch error: ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);
  const results = [];

  // Selectores basados en estructura típica de ecommerces costarricenses
  // El Lagar usa un grid de productos con clase .producto-item o similar
  const productSelectors = [
    '.producto-item',
    '.product-item',
    '.item-producto',
    '.articulo',
    '[class*="producto"]',
    '[class*="product"]',
  ];

  let $products = $();
  for (const sel of productSelectors) {
    $products = $(sel);
    if ($products.length > 0) break;
  }

  // Fallback: buscar links que parezcan productos individuales
  if ($products.length === 0) {
    $(`a[href*="DetalleArticulo"]`).each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      const url = href?.startsWith('http') ? href : `${BASE_URL}${href}`;

      // Buscar precio cerca del link
      const $container = $el.closest('div, li, article');
      const priceText = extractPriceText($container.text());
      if (priceText && url) {
        results.push({
          precio: priceText,
          moneda: 'CRC',
          url,
          titulo: $el.text().trim() || $el.attr('title') || '',
          fuente: 'ellagar',
        });
      }
    });
    return results.slice(0, 5);
  }

  $products.slice(0, 5).each((_, el) => {
    const $el = $(el);

    // URL del producto
    const linkEl = $el.find('a[href*="DetalleArticulo"]').first();
    const href = linkEl.attr('href');
    if (!href) return;
    const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;

    // Precio (busca texto con ₡, CRC, o formato numérico con comas)
    const precio = extractPriceText($el.text());
    if (!precio) return;

    const titulo =
      $el.find('[class*="nombre"], [class*="title"], [class*="name"]').first().text().trim() ||
      linkEl.text().trim() ||
      '';

    results.push({ precio, moneda: 'CRC', url, titulo, fuente: 'ellagar' });
  });

  return results;
}

/**
 * Extrae el primer precio numérico encontrado en un bloque de texto.
 * Soporta formatos: ₡1.234,56  |  1234.56  |  1,234.56
 * @param {string} text
 * @returns {number | null}
 */
function extractPriceText(text) {
  // Quitar símbolo de colón y espacios
  const clean = text.replace(/₡/g, '').replace(/\s+/g, ' ');

  // Formato: 1.234,56 (europeo con punto de miles y coma decimal)
  const euroMatch = clean.match(/(\d{1,3}(?:\.\d{3})+),(\d{2})/);
  if (euroMatch) {
    return parseFloat(euroMatch[0].replace(/\./g, '').replace(',', '.'));
  }

  // Formato: 1,234.56 (americano)
  const usMatch = clean.match(/(\d{1,3}(?:,\d{3})+)\.(\d{2})/);
  if (usMatch) {
    return parseFloat(usMatch[0].replace(/,/g, ''));
  }

  // Formato simple: 1234 o 1234.56
  const simpleMatch = clean.match(/\b(\d{3,7})(?:[.,]\d{2})?\b/);
  if (simpleMatch) {
    return parseFloat(simpleMatch[1]);
  }

  return null;
}

module.exports = { searchElLagar };
