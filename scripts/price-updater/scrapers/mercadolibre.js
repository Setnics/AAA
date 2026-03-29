/**
 * SEITE — Scraper: Mercado Libre Costa Rica
 *
 * Usa la API oficial de ML (pública, sin autenticación).
 * Site ID de Costa Rica: MCR
 * Documentación: https://api.mercadolibre.com/sites/MCR
 */

'use strict';

const fetch = require('node-fetch');

const ML_API_BASE = 'https://api.mercadolibre.com';

/**
 * @typedef {{ precio: number; moneda: string; url: string; titulo: string; fuente: string }} PriceResult
 */

/**
 * Busca un término en Mercado Libre Costa Rica y devuelve resultados de artículos nuevos.
 * @param {string} searchTerm
 * @returns {Promise<PriceResult[]>}
 */
async function searchMercadoLibre(searchTerm) {
  const url =
    `${ML_API_BASE}/sites/MCR/search?q=${encodeURIComponent(searchTerm)}&condition=new&limit=5`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'SEITE-PriceBot/1.0' },
    timeout: 10000,
  });

  if (!res.ok) {
    throw new Error(`ML API error: ${res.status}`);
  }

  const json = await res.json();
  const results = json.results || [];

  return results
    .filter((item) => item.price > 0 && item.permalink)
    .map((item) => ({
      precio: item.price,
      moneda: item.currency_id === 'CRC' ? 'CRC' : 'USD',
      url: item.permalink,
      titulo: item.title,
      fuente: 'mercadolibre',
    }));
}

module.exports = { searchMercadoLibre };
