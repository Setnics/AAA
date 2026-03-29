/**
 * SEITE — Mapa de Términos de Búsqueda por Material
 *
 * Para cada código de material, define los términos de búsqueda
 * optimizados para encontrar el producto correcto en proveedores CR.
 *
 * Reglas de naming:
 * - Usar términos comunes, no jerga técnica excesiva
 * - Incluir la unidad relevante (metro, unidad, etc.)
 * - Términos más específicos primero (mejor match)
 */

'use strict';

/** @type {Record<string, string[]>} */
const SEARCH_TERMS = {
  // ── Tomacorrientes ─────────────────────────────────────────────────────
  'TC-UNIT': [
    'tomacorriente duplex 15A 120V empotrar',
    'tomacorriente doble blanco 110V empotrar 15A',
    'toma corriente simple 120V',
  ],
  'TC-GFCI': [
    'tomacorriente GFCI 15A zona humeda',
    'tomacorriente interruptor falla tierra 15A',
    'toma GFCI 120V 15A',
  ],
  'TC-TR': [
    'tomacorriente tamper resistant 15A blanco',
    'tomacorriente TR 120V a prueba manipulacion',
    'toma tamper resistant empotrar',
  ],
  'TC-WR': [
    'tomacorriente intemperie weather resistant 15A',
    'placa intemperie tomacorriente exterior',
    'tomacorriente WR exterior 120V',
  ],

  // ── Cajas ──────────────────────────────────────────────────────────────
  'CAJA-EMT-STD': [
    'caja rectangular EMT 1/2 empotrar',
    'caja conduit rectangular metalica empotrar',
    'caja rectangular conduit 1/2 pulgada',
  ],

  // ── Conductores ────────────────────────────────────────────────────────
  'CAB-12-THHN-F': [
    'cable THHN 12 AWG negro por metro',
    'conductor THHN 12 negro metro lineal',
    'alambre THHN calibre 12 negro',
  ],
  'CAB-12-THHN-N': [
    'cable THHN 12 AWG blanco por metro',
    'conductor THHN 12 blanco neutro metro',
    'alambre THHN calibre 12 blanco',
  ],
  'CAB-12-THHN-T': [
    'cable THHN 12 AWG verde tierra por metro',
    'conductor THHN 12 verde tierra metro lineal',
    'alambre THHN calibre 12 verde',
  ],

  // ── Tubería Conduit ────────────────────────────────────────────────────
  'CONDUIT-12-EMT': [
    'tubo conduit EMT 1/2 pulgada metro',
    'conduit EMT 1/2 metalico por metro',
    'tubo EMT 12mm por metro',
  ],
  'CONECTOR-12-EMT': [
    'conector EMT 1/2 pulgada presion',
    'conector EMT tornillo 12mm',
    'fitting EMT 1/2 conector',
  ],

  // ── Puesta a Tierra ────────────────────────────────────────────────────
  'VARILLA-TIERRA': [
    'varilla copperweld 5/8 tierra fisica 8 pies',
    'varilla cooperweld 5/8 pulgada tierra',
    'electrodo tierra copperweld 8 pies',
  ],

  // ── Protección ─────────────────────────────────────────────────────────
  'SUPRESOR-SPD': [
    'supresor transientes SPD tipo 2 120V',
    'protector contra picos voltaje 120V tipo 2',
    'supresor sobretension SPD residencial',
  ],
  'BREAKER-AFCI-20A': [
    'breaker AFCI 20A interruptor arco',
    'interruptor AFCI 20A proteccion arco',
    'breaker arco falla 20A AFCI',
  ],
};

/**
 * Rango de precios aproximado por material (en CRC).
 * Filtra resultados claramente fuera de rango (10x por encima o debajo).
 * @type {Record<string, { min: number; max: number }>}
 */
const PRICE_RANGES_CRC = {
  'TC-UNIT':         { min: 300,    max: 8000 },
  'TC-GFCI':         { min: 3000,   max: 30000 },
  'TC-TR':           { min: 500,    max: 8000 },
  'TC-WR':           { min: 1000,   max: 15000 },
  'CAJA-EMT-STD':    { min: 100,    max: 3000 },
  'CAB-12-THHN-F':   { min: 100,    max: 1500 },
  'CAB-12-THHN-N':   { min: 100,    max: 1500 },
  'CAB-12-THHN-T':   { min: 100,    max: 1500 },
  'CONDUIT-12-EMT':  { min: 200,    max: 3000 },
  'CONECTOR-12-EMT': { min: 80,     max: 1500 },
  'VARILLA-TIERRA':  { min: 3000,   max: 40000 },
  'SUPRESOR-SPD':    { min: 30000,  max: 500000 },
  'BREAKER-AFCI-20A':{ min: 5000,   max: 80000 },
};

module.exports = { SEARCH_TERMS, PRICE_RANGES_CRC };
