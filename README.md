# SEITE

SEITE es una aplicacion web para estimacion de instalaciones electricas. El flujo principal cubre la creacion de proyectos, configuracion tecnica, definicion de zonas y circuitos, registro de tomacorrientes, generacion automatica de BOM y exportacion de resultados.

La aplicacion trabaja en modo offline-first con IndexedDB mediante Dexie, y usa Supabase para sincronizacion de catalogo y para el proceso externo de actualizacion de precios.

## Documentacion clave

- `README.md`: vision general, stack y comandos principales
- `docs/workflow-proyecto.md`: flujo tecnico resumido del repositorio
- `docs/AI-HANDOFF.md`: handoff tecnico detallado para cualquier IA o nuevo agente

## Capacidades principales

- Gestion de proyectos de estimacion electrica.
- Configuracion de parametros economicos y perfil normativo por proyecto.
- Modelado de zonas, circuitos y grupos de tomacorrientes.
- Generacion automatica de BOM con historial de ajustes manuales.
- Exportacion a PDF, XLSX y CSV.
- Catalogo local de materiales con sincronizacion desde la nube.
- Sondeo programado de precios de materiales mediante GitHub Actions.

## Stack tecnico

- React 19
- TypeScript
- Vite
- Zustand
- Dexie / IndexedDB
- Supabase
- jsPDF / jspdf-autotable
- xlsx

## Requisitos

- Node.js 24 recomendado
- npm
- Credenciales validas de Supabase para ejecutar la app con integracion en nube

## Inicio rapido

1. Instalar dependencias del frontend:

```bash
npm install
```

2. Crear el archivo `.env` a partir de `.env.example`.

3. Completar las variables requeridas:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

4. Ejecutar la aplicacion en desarrollo:

```bash
npm run dev
```

5. Validar calidad antes de subir cambios:

```bash
npm run lint
npm run test
npm run build
```

## Scripts del repositorio

### Frontend principal

- `npm run dev`: levanta Vite en modo desarrollo.
- `npm run lint`: ejecuta ESLint sobre el proyecto.
- `npm run test`: ejecuta la suite automatizada con Vitest.
- `npm run test:watch`: ejecuta Vitest en modo interactivo.
- `npm run build`: compila TypeScript y genera el build de produccion.
- `npm run preview`: sirve localmente el build generado.

### Price updater

El proceso de sondeo de precios vive en `scripts/price-updater` y tiene dependencias separadas.

```bash
cd scripts/price-updater
npm install
npm start
```

Modo simulacion:

```bash
npm test
```

Ese proceso requiere `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` para escribir resultados en Supabase.

## Variables de entorno

### Frontend

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

La app falla al iniciar si estas variables no existen. El cliente de Supabase se crea en `src/lib/supabaseClient.ts`.

### GitHub Actions para precios

El workflow programado de precios usa estos secrets en GitHub:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

## Arquitectura del proyecto

### Frontend

- `src/pages`: pantallas principales (`Dashboard`, `ProjectEditor`, `Catalog`).
- `src/components`: componentes reutilizables de UI.
- `src/stores`: estado global y logica operativa con Zustand.
- `src/engine`: motor de calculo de BOM y asignacion de circuitos.
- `src/export`: exportadores PDF, XLSX y CSV.
- `src/lib`: integraciones externas, incluida la conexion a Supabase.

### Persistencia local

- `src/database/db.ts`: define la base Dexie y sus versiones.
- `src/database/schema.ts`: tipos de dominio.
- `src/database/seedData.ts`: catalogo base sembrado en el primer arranque.
- `src/database/normativeProfiles.ts`: perfiles normativos soportados.

Perfiles incluidos actualmente:

- `NEC-2023`
- `RETIE-2013`
- `NEC-2020-NCR`

## Flujo funcional

1. Crear un proyecto desde el dashboard.
2. Configurar area, perfil normativo, tipo de cambio e impuestos.
3. Crear zonas y circuitos.
4. Registrar tomacorrientes por circuito.
5. Recalcular BOM automaticamente.
6. Ajustar cantidades manualmente cuando sea necesario.
7. Exportar el resultado.
8. Actualizar catalogo:
   - manualmente desde la app
   - automaticamente con el workflow semanal de precios

## GitHub Actions

### CI de la app

Archivo: `.github/workflows/app-ci.yml`

Se ejecuta en:

- `push`
- `pull_request`
- `workflow_dispatch`

Acciones:

- `npm ci`
- `npm run lint`
- `npm run test`
- `npm run build`

Ese workflow usa variables placeholder de Supabase solo para permitir el build en CI. No depende de secrets reales.

### Sondeo semanal de precios

Archivo: `.github/workflows/price-update.yml`

Se ejecuta:

- cada lunes a las 12:30 UTC
- manualmente con opcion `dry_run`

Ese workflow esta separado del CI de la app porque depende de scraping externo, ejecucion mas lenta y secrets de Supabase.

## Notas de desarrollo

- La app es offline-first. IndexedDB es la fuente de verdad local para proyectos, zonas, circuitos, tomacorrientes y BOM.
- El catalogo base se siembra automaticamente en el primer arranque.
- Si cambias el schema de Dexie, incrementa la version de la base y agrega una migracion cuando corresponda.
- El proyecto ya tiene una base de pruebas automatizadas en `src/engine` y `src/stores`.
- El baseline actual de calidad es `lint + test + build`.

## Limitaciones actuales

- El build actual genera una advertencia de Vite por chunks grandes en produccion.
- El workflow de precios debe mantenerse y probarse por separado del frontend.
