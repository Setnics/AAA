/**
 * SEITE — Utilidades de Validación y Filtrado de Precios
 */

'use strict';

const fetch = require('node-fetch');

/**
 * Verifica que una URL devuelva HTTP 200.
 * Usa HEAD request primero (más rápido), cae en GET si el servidor no soporta HEAD.
 * @param {string} url
 * @returns {Promise<boolean>}
 */
async function validateUrl(url) {
  if (!url || !url.startsWith('http')) return false;

  try {
    const headRes = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      timeout: 8000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; SEITE-PriceBot/1.0; +https://github.com/Setnics/AAA)',
      },
    });

    if (headRes.status === 200) return true;

    // Algunos servidores rechazan HEAD pero aceptan GET
    if (headRes.status === 405 || headRes.status === 501) {
      const getRes = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; SEITE-PriceBot/1.0; +https://github.com/Setnics/AAA)',
        },
      });
      return getRes.status === 200;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Filtra resultados que están claramente fuera del rango de precio esperado.
 * @param {{ precio: number }[]} results
 * @param {{ min: number; max: number } | undefined} range
 * @param {number} exchangeRate - Para convertir USD a CRC si es necesario
 * @returns {{ precio: number }[]}
 */
function filterByPriceRange(results, range, exchangeRate = 500) {
  if (!range) return results;

  return results.filter((r) => {
    const priceCrc = r.moneda === 'USD' ? r.precio * exchangeRate : r.precio;
    return priceCrc >= range.min && priceCrc <= range.max;
  });
}

module.exports = { validateUrl, filterByPriceRange };
