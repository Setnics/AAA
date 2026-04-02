# Analisis y workflow de SEITE

## Resumen del proyecto

SEITE es una app web construida con React, TypeScript y Vite para estimacion de proyectos electricos.

- `src/pages/Dashboard.tsx` centraliza la gestion de proyectos.
- `src/pages/ProjectEditor.tsx` concentra el trabajo principal: configuracion, zonas, circuitos, tomacorrientes, BOM y exportacion.
- `src/pages/Catalog.tsx` administra el catalogo local y la sincronizacion de materiales desde Supabase.
- `src/stores/projectStore.ts` maneja el estado y la persistencia operativa del proyecto activo.
- `src/database/db.ts` define la persistencia offline con Dexie sobre IndexedDB.
- `.github/workflows/price-update.yml` ejecuta el sondeo semanal de precios hacia Supabase.

## Flujo funcional del sistema

1. Crear un proyecto desde el dashboard.
2. Configurar datos base del proyecto, perfil normativo y parametros economicos.
3. Crear zonas y circuitos.
4. Registrar tomacorrientes por circuito.
5. Recalcular la lista de materiales (BOM) de forma automatica.
6. Ajustar cantidades manualmente cuando haga falta y conservar historial.
7. Exportar resultados en PDF, XLSX o CSV.
8. Mantener el catalogo actualizado:
   - sincronizacion manual desde la nube en la app
   - sondeo semanal automatizado con GitHub Actions

## Workflow tecnico recomendado

1. Preparar entorno local.
   - `npm install`
   - crear `.env` a partir de `.env.example`
   - ejecutar `npm run dev`
2. Desarrollar cambios en la app principal.
   - UI y rutas en `src/pages` y `src/components`
   - logica en `src/stores`, `src/engine` y `src/database`
3. Validar antes de subir cambios.
   - `npm run lint`
   - `npm run test`
   - `npm run build`
4. Abrir push o pull request.
5. Dejar que `.github/workflows/app-ci.yml` valide la app automaticamente.
6. Mantener el flujo de precios separado.
   - `price-update.yml` sigue siendo el workflow programado para materiales
   - usar ejecucion manual con `dry_run` cuando se cambie el scraper o la logica de sondeo

## Por que se separo el workflow

El proyecto tiene dos ritmos distintos:

- la app web necesita validacion rapida y constante en cada cambio
- el sondeo de precios depende de secretos, llamadas externas y una ejecucion mas lenta

Por eso el nuevo workflow `app-ci.yml` valida el frontend con `npm ci`, `npm run lint`, `npm run test` y `npm run build`, mientras que `price-update.yml` queda reservado para la actualizacion semanal de precios.

## Observaciones actuales

- El `README.md` ya describe el producto real y el flujo tecnico vigente.
- Ya existe una base de tests automatizados sobre motor y store.
- El baseline actual de calidad automatizada queda en lint + test + build.

Como siguiente mejora natural, el proyecto puede ampliar cobertura hacia exportadores y sincronizacion con Supabase.
