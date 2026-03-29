/**
 * SEITE — Orquestador Principal del Sondeo de Precios
 *
 * Ejecuta semanalmente cada lunes a las 6:30 AM CR (12:30 UTC).
 * Uso:  node index.js           (modo producción)
 *       node index.js --dry-run (simula sin escribir a Supabase)
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');
const { SEARCH_TERMS, PRICE_RANGES_CRC } = require('./search-terms');
const { searchElLagar } = require('./scrapers/ellagar');
const { searchMercadoLibre } = require('./scrapers/mercadolibre');
const { searchEPA } = require('./scrapers/epa');
const { searchConstruplaza } = require('./scrapers/construplaza');
const { validateUrl, filterByPriceRange } = require('./utils/validate-url');

const DRY_RUN = process.argv.includes('--dry-run');
const DELAY_BETWEEN_MS = 2500; // Pausa entre materiales para no sobrecargar servidores

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY   // Service Role Key — bypasa RLS para escritura
);

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(msg) {
  const ts = new Date().toLocaleTimeString('es-CR', { hour12: false });
  console.log(`[${ts}] ${msg}`);
}

/** Convierte precio a CRC usando tipo de cambio aproximado del día. */
async function getExchangeRate() {
  try {
    const res = await require('node-fetch')(
      'https://api.exchangerate.host/latest?base=USD&symbols=CRC'
    );
    const data = await res.json();
    return data?.rates?.CRC || 510; // Fallback conservador
  } catch {
    return 510;
  }
}

// ── Lógica Principal ──────────────────────────────────────────────────────────

async function main() {
  log(`=== SEITE Price Updater ${DRY_RUN ? '(DRY RUN)' : ''} ===`);

  // 1. Leer materiales de Supabase
  const { data: materials, error: fetchError } = await supabase
    .from('materiales')
    .select('id, codigo, descripcion, precio_unitario, moneda_catalogo, enlace_referencia')
    .eq('activo', true);

  if (fetchError) {
    console.error('Error leyendo materiales de Supabase:', fetchError);
    process.exit(1);
  }

  log(`Materiales a sondear: ${materials.length}`);

  const exchangeRate = await getExchangeRate();
  log(`Tipo de cambio USD/CRC: ₡${exchangeRate.toFixed(0)}`);

  const summary = { actualizados: 0, sinCambio: 0, noEncontrados: 0, errores: 0 };

  // 2. Procesar cada material
  for (const material of materials) {
    const terms = SEARCH_TERMS[material.codigo];

    if (!terms) {
      log(`⚠️  [${material.codigo}] Sin términos de búsqueda definidos — omitido`);
      summary.errores++;
      continue;
    }

    log(`\n🔍 [${material.codigo}] ${material.descripcion}`);
    const allResults = [];

    for (const term of terms) {
      log(`   Buscando: "${term}"`);

      // Búsqueda en paralelo (ML es API oficial, las otras pueden fallar)
      const [elLagarR, mlR, epaR, cplR] = await Promise.allSettled([
        searchElLagar(term),
        searchMercadoLibre(term),
        searchEPA(term),
        searchConstruplaza(term),
      ]);

      const merge = (settled) => {
        if (settled.status === 'fulfilled') allResults.push(...settled.value);
        else console.warn(`   Error fuente: ${settled.reason?.message}`);
      };

      merge(elLagarR);
      merge(mlR);
      merge(epaR);
      merge(cplR);

      // Pausar entre términos de búsqueda para el mismo material
      await sleep(1000);
    }

    if (allResults.length === 0) {
      log(`   ❌ Sin resultados en ninguna fuente`);
      await markNoEncontrado(material, summary);
      await sleep(DELAY_BETWEEN_MS);
      continue;
    }

    log(`   Resultados brutos: ${allResults.length}`);

    // 3. Filtrar por rango de precio (sanity check)
    const rangeFiltered = filterByPriceRange(
      allResults,
      PRICE_RANGES_CRC[material.codigo],
      exchangeRate
    );

    if (rangeFiltered.length === 0) {
      log(`   ❌ Todos los resultados estaban fuera del rango de precio esperado`);
      await markNoEncontrado(material, summary);
      await sleep(DELAY_BETWEEN_MS);
      continue;
    }

    // 4. Validar URLs (solo links que devuelvan HTTP 200)
    const validResults = [];
    for (const result of rangeFiltered) {
      const ok = await validateUrl(result.url);
      if (ok) {
        validResults.push(result);
        log(`   ✅ ${result.fuente}: ₡${result.precio.toLocaleString('es-CR')} — ${result.url}`);
      } else {
        log(`   🚫 ${result.fuente}: Link inválido — ${result.url}`);
      }
    }

    if (validResults.length === 0) {
      log(`   ❌ Sin links válidos tras validación`);
      await markNoEncontrado(material, summary);
      await sleep(DELAY_BETWEEN_MS);
      continue;
    }

    // 5. Ordenar por precio (menor primero) y tomar el mejor
    validResults.sort((a, b) => {
      const aCrc = a.moneda === 'USD' ? a.precio * exchangeRate : a.precio;
      const bCrc = b.moneda === 'USD' ? b.precio * exchangeRate : b.precio;
      return aCrc - bCrc;
    });

    const best = validResults[0];
    const bestPriceCrc = best.moneda === 'USD' ? best.precio * exchangeRate : best.precio;
    const prevPriceCrc =
      material.moneda_catalogo === 'USD'
        ? material.precio_unitario * exchangeRate
        : material.precio_unitario;

    const cambioPct = prevPriceCrc
      ? (((bestPriceCrc - prevPriceCrc) / prevPriceCrc) * 100).toFixed(1)
      : 'N/A';

    log(
      `   🏆 Mejor precio: ₡${bestPriceCrc.toLocaleString('es-CR')} (${best.fuente})` +
      ` | Cambio: ${cambioPct}%`
    );
    log(`   🔗 ${best.url}`);

    // 6. Actualizar Supabase
    if (!DRY_RUN) {
      const { error: updateError } = await supabase
        .from('materiales')
        .update({
          precio_unitario: best.precio,
          moneda_catalogo: best.moneda,
          enlace_referencia: best.url,
          estado_precio: 'actualizado',
          actualizado_en: new Date().toISOString(),
        })
        .eq('id', material.id);

      if (updateError) {
        console.error(`   Error actualizando material: ${updateError.message}`);
        summary.errores++;
      } else {
        // Registrar en historial
        await supabase.from('historial_precios_materiales').insert({
          material_id: material.id,
          codigo: material.codigo,
          precio_anterior: material.precio_unitario,
          precio_nuevo: best.precio,
          moneda: best.moneda,
          fuente: best.fuente,
          enlace: best.url,
          estado: 'actualizado',
        });

        summary.actualizados++;
      }
    } else {
      log(`   [DRY RUN] No se escribió a Supabase`);
      summary.actualizados++;
    }

    await sleep(DELAY_BETWEEN_MS);
  }

  // ── Reporte Final ──────────────────────────────────────────────────────────
  log('\n════════════════════════════════════════');
  log('📊 RESUMEN DEL SONDEO:');
  log(`   ✅ Actualizados:    ${summary.actualizados}`);
  log(`   ⚠️  Sin cambio:     ${summary.sinCambio}`);
  log(`   🔴 No encontrados:  ${summary.noEncontrados}`);
  log(`   ❌ Errores:        ${summary.errores}`);
  log('════════════════════════════════════════');

  if (summary.noEncontrados > 0) {
    log(`\n🔔 ${summary.noEncontrados} material(es) marcados como "no encontrado" en el catálogo SEITE.`);
  }
}

/**
 * Marca un material como no_encontrado en Supabase y registra el historial.
 * Preserva el precio y enlace anteriores.
 */
async function markNoEncontrado(material, summary) {
  if (!DRY_RUN) {
    await supabase
      .from('materiales')
      .update({ estado_precio: 'no_encontrado' })
      .eq('id', material.id);

    await supabase.from('historial_precios_materiales').insert({
      material_id: material.id,
      codigo: material.codigo,
      precio_anterior: material.precio_unitario,
      precio_nuevo: null,
      moneda: material.moneda_catalogo,
      fuente: null,
      enlace: null,
      estado: 'no_encontrado',
    });
  }
  summary.noEncontrados++;
}

// ── Entry Point ───────────────────────────────────────────────────────────────
main().catch((err) => {
  console.error('Error fatal en el actualizador:', err);
  process.exit(1);
});
