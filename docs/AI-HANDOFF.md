# SEITE - Handoff Tecnico para IA

## Objetivo de este documento

Este archivo existe para que cualquier IA pueda entrar al proyecto con contexto suficiente, identificar el estado actual y continuar el trabajo sin rehacer analisis basico ni romper decisiones ya tomadas.

## Resumen ejecutivo

SEITE es una aplicacion web offline-first para estimacion de materiales de instalaciones electricas. La app permite crear proyectos, definir zonas y circuitos, registrar tomacorrientes, calcular un BOM automaticamente, ajustar cantidades manualmente, exportar resultados y sincronizar catalogo con Supabase.

El proyecto ya tiene una base tecnica estable:

- `lint` pasa
- `test` pasa
- `build` pasa
- existe CI para validar `lint + test + build`

Estado residual importante:

- el repo local puede contener cambios no integrados fuera del flujo principal; revisar `git status` antes de tocar archivos
- queda una vulnerabilidad conocida en `xlsx` sin fix automatico disponible por npm
- el workflow de scraping de precios sigue siendo un subflujo aparte y no debe mezclarse con el CI de la app

## Stack y componentes

### Frontend

- React 19
- TypeScript
- Vite 8
- React Router DOM 7
- Zustand 5
- Dexie 4 sobre IndexedDB
- Supabase JS
- jsPDF / jspdf-autotable
- xlsx

### Estructura relevante

- `src/pages`
  - `Dashboard.tsx`: gestion de proyectos
  - `ProjectEditor.tsx`: configuracion, zonas, tomacorrientes, BOM y exportacion
  - `Catalog.tsx`: catalogo local, ofertas y sincronizacion con nube
- `src/stores`
  - `projectStore.ts`: estado operativo central del proyecto activo
- `src/database`
  - `schema.ts`: tipos del dominio
  - `db.ts`: versiones de Dexie y stores
  - `seedData.ts`: catalogo inicial
  - `normativeProfiles.ts`: perfiles normativos y coeficientes
- `src/engine`
  - `bomCalculator.ts`: motor puro de calculo de BOM
  - `circuitAssigner.ts`: motor puro de asignacion de circuitos
- `src/export`
  - exportadores PDF, XLSX y CSV
- `.github/workflows`
  - `app-ci.yml`: CI de la aplicacion
  - `price-update.yml`: sondeo semanal de precios

## Estado funcional actual

La aplicacion puede hacer esto:

1. Crear, duplicar, cargar y eliminar proyectos.
2. Configurar impuestos, moneda, tipo de cambio, nivel de electrificacion y parametros del proyecto.
3. Crear zonas y circuitos.
4. Registrar grupos de tomacorrientes por circuito.
5. Recalcular el BOM automaticamente al cambiar outlets, circuitos o catalogo.
6. Ajustar cantidades manualmente y restaurarlas con historial.
7. Exportar a PDF, XLSX y CSV.
8. Administrar catalogo oficial y ofertas.
9. Sincronizar materiales desde Supabase.
10. Ejecutar un flujo programado de actualizacion de precios desde GitHub Actions.

## Contratos del dominio que no deben romperse

### 1. `engine/` debe mantenerse puro

Los archivos en `src/engine` no deben importar React, Zustand, Dexie ni UI. Deben seguir siendo funciones puras y testeables.

### 2. Los codigos de materiales son claves de negocio

Los codigos como `TC-UNIT`, `CAB-12-THHN-F` y `BREAKER-20A` conectan:

- coeficientes normativos
- catalogo
- resultados del BOM

Si se cambia un codigo en un lado y no en el otro, el BOM deja de resolver materiales correctamente.

### 3. El BOM usa snapshot de precio

`BOMEntry.precioUnitarioSnap` representa el precio congelado en la moneda del proyecto al recalcular el BOM. No debe reinterpretarse como precio del catalogo en vivo.

### 4. IndexedDB es la fuente local de verdad

El estado operativo se persiste en Dexie. Si se cambia schema o indices en `db.ts`, hay que:

1. incrementar version
2. documentar el cambio
3. agregar migracion si aplica

### 5. Los ajustes manuales del BOM deben preservarse

Cuando se recalcula el BOM, si una linea ya tenia ajuste manual, ese ajuste debe mantenerse mientras siga existiendo el material.

## Decisiones tecnicas recientes ya integradas

Estas decisiones ya forman parte del estado estable y no deben revertirse sin razon fuerte:

- CI separada para la app en `.github/workflows/app-ci.yml`
- documentacion real del proyecto en `README.md`
- base de tests automatizados con Vitest
- tipado correcto de `nivelElectrificacion`, incluyendo `ESPECIAL`
- eliminacion de `setState` inseguro en `ProjectEditor`
- uso de precio de catalogo aunque falte enlace de referencia, acompañado por warnings
- mano de obra configurable por proyecto
- asignacion de circuitos corregida para evitar referencias incorrectas al ultimo circuito usado

## Suite automatizada actual

### Scripts

- `npm run lint`
- `npm run test`
- `npm run build`

### Cobertura inicial

- `src/engine/bomCalculator.test.ts`
  - preservacion de ajustes manuales
  - conversion de moneda
  - warnings por enlaces faltantes
  - materiales faltantes
  - subtotal e impuestos
- `src/engine/circuitAssigner.test.ts`
  - circuitos dedicados 240V
  - creacion de circuitos extra por capacidad
  - validacion de sobrecapacidad
- `src/stores/projectStore.test.ts`
  - defaults de creacion de proyecto
  - ajuste y restauracion de BOM con persistencia

### Setup de tests

- `vitest.config.ts`
- `src/test/setup.ts`

Los tests usan `fake-indexeddb` para emular IndexedDB en entorno Node.

## Workflows

### CI de aplicacion

Archivo: `.github/workflows/app-ci.yml`

Valida:

- `npm ci`
- `npm run lint`
- `npm run test`
- `npm run build`

### Sondeo de precios

Archivo: `.github/workflows/price-update.yml`

Ese flujo:

- corre semanalmente
- usa secrets de Supabase
- instala dependencias del subproyecto `scripts/price-updater`
- ejecuta scraping / sondeo externo

No debe tratarse como parte del loop normal de desarrollo del frontend.

## Riesgos y deuda tecnica vigente

### 1. `xlsx`

`npm audit` sigue reportando una vulnerabilidad alta en `xlsx` sin fix automatico disponible.

Implicacion:

- no bloquea el desarrollo inmediato
- si la exportacion XLSX es prioritaria para produccion, conviene evaluar upgrade manual, parche alterno o reemplazo de libreria

### 2. Chunks grandes en build

El build de Vite pasa, pero advierte sobre chunks mayores a 500 kB. No es bloqueante, pero conviene revisarlo si se agregan nuevas funcionalidades pesadas.

### 3. Cobertura todavia parcial

Hay tests en motor y store, pero aun faltan:

- exportadores
- sincronizacion con Supabase
- flujos del catalogo
- regression tests de UI critica

### 4. Arbol local potencialmente sucio

Puede haber cambios no integrados fuera de este flujo, especialmente en:

- `scripts/price-updater`
- `src/components/layout/Sidebar.tsx`
- `src/database/*`
- `src/lib/supabaseClient.ts`
- `src/pages/Dashboard.tsx`

Regla operativa:

- revisar `git status` antes de editar
- no revertir cambios ajenos sin confirmacion explicita

## Como trabajar a partir de aqui

### Si vas a agregar una nueva funcionalidad

1. Revisar `git status`.
2. Confirmar si el archivo objetivo ya tiene cambios locales.
3. Si la funcionalidad toca dominio o calculo, empezar por `schema.ts`, `normativeProfiles.ts`, `bomCalculator.ts` o `projectStore.ts`.
4. Añadir o ajustar tests antes de tocar UI cuando el cambio afecte logica.
5. Cerrar con `npm run lint`, `npm run test` y `npm run build`.

### Si vas a cambiar el schema local

1. actualizar `src/database/schema.ts`
2. actualizar `src/database/db.ts`
3. versionar/migrar Dexie
4. revisar `seedData.ts`
5. ajustar tests

### Si vas a cambiar reglas de calculo

1. tocar `src/engine/bomCalculator.ts`
2. validar perfiles en `src/database/normativeProfiles.ts`
3. añadir tests directos del motor
4. verificar que `projectStore.ts` siga preservando ajustes manuales

### Si vas a tocar scraping o precios

Separar claramente:

- frontend: `src/*`
- sondeo automatizado: `scripts/price-updater/*`

No mezclar ambos cambios en el mismo scope salvo que haya una razon funcional real.

## Proximo paso recomendado para el proyecto

Con la base actual, el siguiente paso natural es funcional, no de infraestructura.

Prioridad sugerida:

1. definir la siguiente funcionalidad de negocio
2. decidir si impacta dominio, calculo, catalogo o exportacion
3. abrir el cambio sobre la base ya estabilizada

Si la siguiente fase necesita mas seguridad tecnica antes de crecer, la mejor inversion adicional es ampliar tests hacia:

- exportadores
- sincronizacion del catalogo con Supabase
- flujo de dashboard y formulario de proyecto
