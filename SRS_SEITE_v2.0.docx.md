

**ESPECIFICACIÓN DE REQUERIMIENTOS DE SOFTWARE**

IEEE 29148:2018 / IEEE 830 Compatible — SRS Versión 2.0

**Sistema de Estimación de**

**Instalaciones Eléctricas**

**de Tomacorrientes**

**SEITE**

| Código | SEITE-SRS-2026 |
| :---- | :---- |
| Versión | 2.0 — Release Candidate |
| **Estado** | Para revisión y handoff a ingeniería |
| Fecha de emisión | Marzo 2026 |
| **Estándar aplicado** | IEEE 29148:2018 / IEEE 830 |
| Sustituye a | SRS v1.0 — SEITE-2026 (obsoleto) |
| **Clasificación** | Confidencial — Uso Interno |

# **1\. Introducción**

## **1.1 Propósito**

Este documento especifica los requerimientos de software del Sistema de Estimación de Instalaciones Eléctricas de Tomacorrientes (SEITE) en su versión 2.0. Reemplaza completamente la versión 1.0, corrigiendo ambigüedades, vacíos técnicos y criterios de aceptación no medibles.

Destinatarios: ingenieros de desarrollo, arquitectos de software, equipo de QA, diseñadores UX y revisores técnicos del área eléctrica. Este documento constituye el contrato funcional y técnico del sistema.

## **1.2 Alcance**

SEITE es una aplicación web progresiva (PWA) offline-first que permite a técnicos eléctricos, contratistas y proyectistas:

* Configurar proyectos de instalación eléctrica con múltiples zonas y circuitos.

* Ingresar la cantidad y tipo de tomacorrientes por zona/circuito.

* Generar automáticamente un listado de materiales (BOM) calculado mediante coeficientes técnicos configurables.

* Ajustar manualmente el BOM con trazabilidad completa de cambios.

* Exportar el presupuesto de materiales en formatos PDF, XLSX y CSV.

* Versionar proyectos con capacidad de snapshot, restauración y comparación.

*⚠️  SEITE es una herramienta de estimación de materiales. No reemplaza el diseño eléctrico profesional, no calcula carga total del sistema, no modela caída de tensión ni geometría real de la instalación. Toda estimación debe ser validada por un ingeniero eléctrico certificado.*

## **1.3 Definiciones, Acrónimos y Abreviaturas**

| Término | Definición |
| ----- | ----- |
| SEITE | Sistema de Estimación de Instalaciones Eléctricas de Tomacorrientes — aplicación objeto de este documento. |
| BOM | Bill of Materials (Lista de Materiales): listado estructurado de todos los componentes requeridos para ejecutar la instalación estimada. |
| Tomacorriente (TC) | Dispositivo de conexión eléctrica definido por: tipo de corriente (120V/240V/GFCI/AFCI), número de polos y tipo de montaje (empotrado/superficial). |
| Estimación base | BOM calculado automáticamente por el motor de cálculo a partir de los datos de entrada. No contiene ajustes manuales. |
| Ajuste manual | Modificación explícita realizada por un usuario autorizado sobre una cantidad del BOM, con justificación obligatoria registrada. |
| Coeficiente técnico | Factor numérico que determina la cantidad de un material por unidad de tomacorriente. Configurado por perfil normativo (NEC, RETIE, etc.). |
| Perfil normativo | Conjunto de coeficientes y reglas eléctricas asociadas a una normativa regional (ej: NEC, RETIE, IEC 60364). |
| Circuito eléctrico | Agrupación lógica de tomacorrientes que comparten un breaker. Un circuito tiene un máximo configurable de tomacorrientes y una capacidad de breaker definida. |
| Zona | Agrupación física o funcional de tomacorrientes (ej: sala, cocina, oficina) que puede contener uno o más circuitos. |
| Snapshot | Copia inmutable del estado completo de un proyecto en un instante de tiempo, usada para versionado. |
| SRS | Software Requirements Specification — Especificación de Requerimientos de Software (este documento). |
| PWA | Progressive Web Application — aplicación web instalable con capacidades offline. |
| TC | Abreviatura de Tomacorriente, usada en fórmulas y tablas. |
| RF | Requerimiento Funcional. |
| RNF | Requerimiento No Funcional. |

## **1.4 Referencias Normativas**

| Documento | Descripción | Aplicación |
| ----- | ----- | ----- |
| IEEE 29148:2018 | Systems and software engineering — Life cycle processes — Requirements engineering | Estructura de este SRS |
| IEEE 830-1998 | Recommended Practice for Software Requirements Specifications | Complemento de formato |
| NFPA 70 (NEC 2023\) | National Electrical Code — Artículo 210 (Branch Circuits) | Reglas de circuitos ramales, carga por TC |
| RETIE 2013 | Reglamento Técnico de Instalaciones Eléctricas (Colombia) | Perfil normativo alternativo |
| IEC 60364 | Electrical installations of buildings | Perfil normativo internacional |
| OWASP ASVS 4.0 | Application Security Verification Standard | Criterios de seguridad |
| WCAG 2.1 AA | Web Content Accessibility Guidelines | Accesibilidad de la UI |

## **1.5 Visión General del Documento**

Este SRS está organizado en las siguientes secciones:

1. Introducción: propósito, alcance, definiciones y referencias.

2. Descripción general: arquitectura, usuarios y restricciones.

3. Modelo de datos: entidades, atributos y relaciones.

4. Motor de cálculo del BOM: fórmulas, coeficientes y reglas eléctricas.

5. Requerimientos funcionales: RF detallados con flujos, errores y criterios de aceptación.

6. Requerimientos no funcionales: rendimiento, seguridad, escalabilidad y auditoría.

7. Decisiones de diseño asumidas.

8. Apéndices: matriz de trazabilidad y glosario de errores.

# **2\. Descripción General del Sistema**

## **2.1 Arquitectura del Sistema**

### **2.1.1 Tipo de Aplicación: PWA Offline-First**

SEITE se implementa como una Progressive Web Application (PWA) con modo offline-first. Esta decisión se fundamenta en:

* Los sitios de instalación eléctrica frecuentemente carecen de conectividad estable a internet.

* El flujo de trabajo es predominantemente local (ingreso de datos, cálculo, exportación).

* Una PWA permite instalación en escritorio y móvil desde el navegador, sin tiendas de aplicaciones.

* El stack web (React \+ Service Worker) tiene menor fricción de distribución que Electron.

*⚙️ Decisión de diseño: Se eligió PWA sobre Electron por razones de distribución, mantenimiento y compatibilidad multiplataforma. Si el cliente requiere acceso a file system nativo o integración con ERP en versiones futuras, se evaluará migración a Electron o wrapper nativo.*

### **2.1.2 Estrategia Offline-First**

El sistema debe operar con plena funcionalidad sin conexión a internet. La conectividad es opcional y se usa exclusivamente para sincronización de datos y actualizaciones de catálogo.

| Componente | Almacenamiento offline | Sincronización online |
| ----- | ----- | ----- |
| Proyectos y BOM | IndexedDB (navegador) | Opcional: API REST (HTTPS) |
| Catálogo de materiales | IndexedDB \+ Service Worker Cache | Descarga periódica bajo demanda |
| Perfiles normativos | Bundled en la PWA (JSON) | Actualizables vía release |
| Sesión de usuario | JWT en localStorage cifrado | Validado contra servidor si hay conexión |
| Exportaciones (PDF/XLSX) | Generadas localmente en el navegador | Sin sincronización requerida |

### **2.1.3 Manejo de Conflictos de Sincronización**

Cuando se detecta un conflicto (misma versión de proyecto modificada en dos dispositivos), el sistema aplica la siguiente política:

9. El sistema detecta conflicto comparando vectores de versión (timestamps \+ ID de dispositivo).

10. Notifica al usuario con un modal que muestra ambas versiones lado a lado con las diferencias.

11. El usuario elige: conservar versión local, conservar versión remota, o crear nueva versión fusionada manualmente.

12. En modo autónomo (sin usuario activo), se conserva la versión con timestamp más reciente y se crea un snapshot automático de la versión descartada.

## **2.2 Funciones Principales**

| ID | Módulo | Descripción funcional |
| ----- | ----- | ----- |
| M-01 | Gestión de Proyectos | Crear, editar, duplicar, eliminar, versionar y exportar proyectos de estimación. |
| M-02 | Configuración de Zonas y Circuitos | Definir zonas físicas y asignar circuitos eléctricos con sus parámetros. |
| M-03 | Ingreso de Tomacorrientes | Registrar tipos y cantidades de TC por zona/circuito con validaciones técnicas. |
| M-04 | Motor de Cálculo del BOM | Calcular automáticamente materiales requeridos usando coeficientes normativos. |
| M-05 | Ajuste Manual del BOM | Modificar cantidades del BOM con justificación obligatoria y trazabilidad completa. |
| M-06 | Versionado de Proyectos | Crear snapshots, restaurar versiones anteriores y comparar cambios entre versiones. |
| M-07 | Exportación y Reportes | Generar PDF, XLSX y CSV del BOM con configuración de moneda, impuestos y formato. |
| M-08 | Catálogo de Materiales | Administrar el catálogo de materiales con precios, unidades y coeficientes técnicos. |
| M-09 | Administración de Coeficientes | Gestionar perfiles normativos con coeficientes configurables por tipo de TC e instalación. |
| M-10 | Gestión de Usuarios y Roles | Administrar usuarios, roles, permisos y sesiones. |

## **2.3 Perfiles de Usuario**

| Rol | Descripción | Permisos clave |
| ----- | ----- | ----- |
| Técnico | Crea y edita estimaciones de proyectos propios. | Crear proyectos, ingresar TC, ver y ajustar BOM, exportar reportes propios. |
| Contratista / Proyectista | Gestiona múltiples proyectos, puede crear proyectos para otros técnicos. | Todo lo del Técnico \+ ver proyectos de su equipo \+ administrar catálogo de materiales. |
| Administrador | Gestión total del sistema. | Todo lo anterior \+ gestión de usuarios, roles, perfiles normativos y coeficientes. |
| Auditor (solo lectura) | Revisión de proyectos y historial sin capacidad de edición. | Ver todos los proyectos \+ ver historial de cambios \+ exportar reportes. |

## **2.4 Restricciones del Sistema**

### **2.4.1 Alcance explícito — Lo que el sistema NO hace**

*⚠️  Las siguientes funciones están fuera del alcance de SEITE v2.0 y no deben ser implementadas ni prometidas:*

* Cálculo de carga eléctrica total del sistema (kVA, kW).

* Cálculo de caída de tensión en conductores.

* Diseño de tableros eléctricos o Single Line Diagrams.

* Modelado de geometría real de la instalación (planos, recorridos de conduit).

* Integración en tiempo real con APIs de proveedores de materiales o catálogos de precios externos.

* Generación de planos eléctricos o documentación para permisos de construcción.

* Simulación eléctrica de ningún tipo.

### **2.4.2 Restricciones Tecnológicas**

* Frontend: React 18+ con TypeScript. Gestión de estado: Zustand o Redux Toolkit. Almacenamiento local: Dexie.js (wrapper de IndexedDB).

* Backend (sincronización opcional): Node.js 20+ con Express o Fastify. Base de datos: PostgreSQL 15+.

* Exportación PDF: generada en el cliente usando jsPDF \+ autoTable. Exportación XLSX: SheetJS (xlsx).

* Autenticación: JWT (access token 15 min \+ refresh token 7 días). En modo offline, sesión persiste localmente hasta expiración del refresh token.

* El catálogo de materiales no debe superar 10,000 registros en la versión 1.0 del backend.

### **2.4.3 Restricciones de Negocio**

* Los precios del catálogo son ingresados manualmente por el Administrador o importados por archivo. El sistema no consulta APIs de precios externas.

* SEITE no emite facturas, órdenes de compra ni documentos con validez legal.

* La configuración de coeficientes normativos es responsabilidad del Administrador del sistema.

# **3\. Modelo de Datos**

Esta sección define las entidades principales del sistema, sus atributos clave y las relaciones entre ellas. El modelo es tecnológicamente agnóstico (aplica a IndexedDB local y PostgreSQL en la nube).

## **3.1 Entidades Principales**

### **3.1.1 Proyecto**

| Atributo | Tipo | Restricciones | Descripción |
| ----- | ----- | ----- | ----- |
| id | UUID v4 | PK, inmutable | Identificador único del proyecto. |
| nombre | String(150) | NOT NULL, único por usuario | Nombre descriptivo del proyecto. |
| descripcion | String(500) | NULLABLE | Descripción opcional del proyecto. |
| cliente | String(200) | NULLABLE | Nombre del cliente final. |
| ubicacion | String(300) | NULLABLE | Dirección o descripción del sitio. |
| perfilNormativoId | UUID | FK → PerfilNormativo, NOT NULL | Normativa aplicada a la estimación. |
| moneda | String(3) | ISO 4217, default: USD | Moneda del proyecto (USD, COP, MXN, etc.). |
| tasaImpuesto | Decimal(5,2) | 0.00 – 100.00, NOT NULL | Porcentaje de impuesto aplicado al total. |
| estado | Enum | BORRADOR | FINALIZADO | ARCHIVADO | Estado del ciclo de vida del proyecto. |
| versionActual | Integer | ≥ 1, NOT NULL | Número de versión activa del proyecto. |
| creadoPor | UUID | FK → Usuario, NOT NULL | Usuario que creó el proyecto. |
| creadoEn | DateTime (ISO 8601\) | NOT NULL | Timestamp de creación. |
| modificadoEn | DateTime (ISO 8601\) | NOT NULL | Timestamp de última modificación. |

### **3.1.2 Zona**

| Atributo | Tipo | Restricciones | Descripción |
| ----- | ----- | ----- | ----- |
| id | UUID v4 | PK, inmutable | Identificador único de la zona. |
| proyectoId | UUID | FK → Proyecto, NOT NULL | Proyecto al que pertenece. |
| nombre | String(100) | NOT NULL, único por proyecto | Nombre de la zona (ej: Cocina, Oficina 1). |
| descripcion | String(300) | NULLABLE | Descripción adicional. |
| orden | Integer | ≥ 0, NOT NULL | Orden de presentación dentro del proyecto. |

### **3.1.3 Circuito**

| Atributo | Tipo | Restricciones | Descripción |
| ----- | ----- | ----- | ----- |
| id | UUID v4 | PK, inmutable | Identificador único del circuito. |
| zonaId | UUID | FK → Zona, NOT NULL | Zona a la que pertenece. |
| nombre | String(100) | NOT NULL, único por zona | Nombre/etiqueta del circuito (ej: C-01, C-02). |
| capacidadBreaker | Integer | Enum: 15 | 20 | 30 | 50 (Amperios) | Capacidad del breaker asignado al circuito. |
| maxTomacorrientes | Integer | 1 – 20, configurable, NOT NULL | Máximo de TCs permitidos. Valor por defecto tomado del PerfilNormativo. |
| asignacionAuto | Boolean | NOT NULL, default: true | Si true, el sistema asigna TCs a circuitos automáticamente al superar el máximo. |

### **3.1.4 Tomacorriente (TC)**

| Atributo | Tipo | Restricciones | Descripción |
| ----- | ----- | ----- | ----- |
| id | UUID v4 | PK, inmutable | Identificador único del registro de TC. |
| circuitoId | UUID | FK → Circuito, NOT NULL | Circuito al que está asignado. |
| tipo | Enum | ESTANDAR\_120 | DOBLE\_120 | TRIPLE\_120 | ESTANDAR\_240 | GFCI | AFCI | GFCI\_AFCI | Tipo técnico del tomacorriente. |
| montaje | Enum | EMPOTRADO | SUPERFICIAL | Tipo de montaje físico. |
| cantidad | Integer | 1 – 50 por registro, NOT NULL | Número de unidades de este TC en este circuito. |
| notas | String(300) | NULLABLE | Observaciones técnicas opcionales. |

### **3.1.5 Material (Catálogo)**

| Atributo | Tipo | Restricciones | Descripción |
| ----- | ----- | ----- | ----- |
| id | UUID v4 | PK, inmutable | Identificador único del material. |
| codigo | String(50) | NOT NULL, único en catálogo | Código interno del material (ej: CAB-12-THHN-F). |
| descripcion | String(200) | NOT NULL | Nombre descriptivo completo. |
| unidad | Enum | UN | ML | M | ROLLO | CAJA | Unidad de medida del material. |
| precioUnitario | Decimal(12,4) | ≥ 0.0000, NOT NULL | Precio unitario en la moneda del catálogo. |
| monedaCatalogo | String(3) | ISO 4217, NOT NULL | Moneda base del catálogo (puede diferir del proyecto). |
| activo | Boolean | NOT NULL, default: true | Si false, no aparece en nuevas estimaciones pero persiste en BOM históricos. |
| categoria | Enum | CONDUCTOR | CANALETA | CAJA | ACCESORIO | PROTECCION | ACABADO | Clasificación del material. |
| creadoEn | DateTime | NOT NULL | Fecha de creación del registro. |

### **3.1.6 BOM (Bill of Materials — por proyecto)**

| Atributo | Tipo | Restricciones | Descripción |
| ----- | ----- | ----- | ----- |
| id | UUID v4 | PK, inmutable | Identificador único del registro BOM. |
| proyectoId | UUID | FK → Proyecto, NOT NULL | Proyecto al que pertenece. |
| materialId | UUID | FK → Material, NOT NULL | Material referenciado. |
| cantidadEstimada | Decimal(12,4) | ≥ 0, NOT NULL | Cantidad calculada por el motor de cálculo. Nunca modificada manualmente. |
| cantidadAjustada | Decimal(12,4) | ≥ 0, NOT NULL | Cantidad vigente. Igual a cantidadEstimada si no hay ajustes, o el último valor ajustado. |
| precioUnitarioSnap | Decimal(12,4) | ≥ 0, NOT NULL | Snapshot del precio al momento de calcular el BOM (evita cambios retroactivos). |
| ultimaActualizacion | DateTime | NOT NULL | Timestamp del último recálculo o ajuste. |

### **3.1.7 Ajuste**

| Atributo | Tipo | Restricciones | Descripción |
| ----- | ----- | ----- | ----- |
| id | UUID v4 | PK, inmutable | Identificador único del ajuste. |
| bomId | UUID | FK → BOM, NOT NULL | Registro BOM modificado. |
| usuarioId | UUID | FK → Usuario, NOT NULL | Usuario que realizó el ajuste. |
| cantidadAnterior | Decimal(12,4) | NOT NULL | Valor vigente antes del ajuste. |
| cantidadNueva | Decimal(12,4) | ≥ 0, NOT NULL | Valor establecido por el ajuste. |
| justificacion | String(500) | NOT NULL, mínimo 10 caracteres | Razón técnica del ajuste. Campo obligatorio. |
| timestamp | DateTime (ISO 8601\) | NOT NULL | Momento exacto del ajuste. |
| esRestauracion | Boolean | NOT NULL, default: false | Si true, este ajuste fue generado por la función «Restaurar estimación base». |

### **3.1.8 Snapshot (Versión de Proyecto)**

| Atributo | Tipo | Restricciones | Descripción |
| ----- | ----- | ----- | ----- |
| id | UUID v4 | PK, inmutable | Identificador único del snapshot. |
| proyectoId | UUID | FK → Proyecto, NOT NULL | Proyecto versionado. |
| numeroVersion | Integer | ≥ 1, único por proyecto | Número secuencial de versión. |
| etiqueta | String(100) | NULLABLE | Nombre opcional (ej: 'Pre-revisión cliente', 'v2 con ajustes cocina'). |
| payload | JSON (comprimido) | NOT NULL | Copia serializada completa del proyecto, zonas, circuitos, TC y BOM en ese momento. |
| creadoPor | UUID | FK → Usuario, NOT NULL | Usuario que creó el snapshot. |
| creadoEn | DateTime | NOT NULL | Timestamp de creación. |
| esCierreAutomatico | Boolean | NOT NULL | Si true, fue generado automáticamente por el sistema. |

## **3.2 Relaciones entre Entidades**

Las relaciones se expresan en notación cardinalidad mínima..máxima:

| Entidad origen | Relación | Entidad destino | Cardinalidad |
| ----- | ----- | ----- | ----- |
| Proyecto | contiene | Zona | 1..1 → 0..\* |
| Zona | contiene | Circuito | 1..1 → 1..\* |
| Circuito | agrupa | Tomacorriente | 1..1 → 1..\* |
| Proyecto | usa | PerfilNormativo | \*..\*→ 1..1 |
| Proyecto | tiene | BOM | 1..1 → 0..\* |
| BOM | referencia | Material | \*..\*→ 1..1 |
| BOM | tiene | Ajuste | 1..1 → 0..\* |
| Proyecto | tiene | Snapshot | 1..1 → 0..\* |
| Usuario | posee | Proyecto | 1..1 → 0..\* |

# **4\. Motor de Cálculo del BOM**

## **4.1 Definición de Circuito Eléctrico en SEITE**

En el contexto de SEITE, un circuito eléctrico es una entidad lógica que:

* Agrupa uno o más tomacorrientes que comparten un único breaker de protección.

* Pertenece a una sola Zona del proyecto.

* Tiene una capacidad de breaker definida (15A, 20A, 30A o 50A).

* Tiene un límite máximo configurable de tomacorrientes (parámetro maxTomacorrientes, valor por defecto según perfil normativo).

*📌 Bajo NEC 2023 Artículo 210.52, un circuito ramal de 20A no debe alimentar más de 10 tomacorrientes estándar. SEITE usa este valor como defecto para perfiles NEC. Es configurable por el Administrador.*

### **4.1.1 Asignación de Tomacorrientes a Circuitos**

| Modo | Comportamiento | Cuándo aplica |
| ----- | ----- | ----- |
| Manual | El usuario crea circuitos explícitamente y asigna TCs a cada uno. El sistema valida que no se supere maxTomacorrientes y genera advertencia si se excede. | Proyectistas con conocimiento detallado del diseño. |
| Automático | El usuario ingresa TCs en la Zona. El sistema crea circuitos automáticamente agrupando hasta maxTomacorrientes TCs por circuito. Los circuitos se nombran C-01, C-02, etc., de forma secuencial. | Técnicos en estimaciones rápidas sin diseño previo. |

La asignación automática sigue estas reglas de precedencia:

13. Los TCs de 240V siempre van en circuitos propios (uno por TC).

14. Los TCs GFCI y AFCI se asignan primero, antes de los estándar.

15. Los TCs de 120V estándar se llenan por orden de ingreso hasta alcanzar maxTomacorrientes.

16. Si se cambia maxTomacorrientes después de la asignación, el sistema reasigna y notifica al usuario.

## **4.2 Fórmula General del Motor de Cálculo**

La cantidad de un material M para un proyecto se calcula como:

**Cantidad(M) \= CEIL( Σ \[CoeF(M, tipo\_TC\_k, montaje\_k, perfil) × N\_TC\_k\] )**

Donde:

* M \= material a calcular (ej: Cable AWG 12 Fase).

* k \= índice de cada grupo de tomacorrientes (tipo \+ montaje únicos por circuito/zona).

* CoeF(M, tipo\_TC, montaje, perfil) \= coeficiente técnico del material M para el tipo de TC y montaje dados, bajo el perfil normativo activo.

* N\_TC\_k \= cantidad de tomacorrientes del grupo k.

* CEIL() \= función techo (redondeo hacia arriba al entero más cercano, excepto para materiales con unidad ML donde se redondea a 1 decimal).

### **4.2.1 Tratamiento de Breakers**

Los breakers son un caso especial calculado por circuito, no por tomacorriente:

**Cantidad(Breaker\_xA) \= número de circuitos con capacidadBreaker \= xA**

El sistema calcula automáticamente los breakers requeridos en función del número de circuitos definidos (modo manual) o generados (modo automático). Un proyecto con 3 circuitos de 20A requiere 3 breakers de 20A en el BOM.

### **4.2.2 Dependencias entre Materiales**

| Material | Depende de | Regla de dependencia |
| ----- | ----- | ----- |
| Caja metálica/PVC | Tipo de montaje del TC | 1 caja por TC. Si montaje=EMPOTRADO → caja EMT estándar. Si montaje=SUPERFICIAL → caja de sobreponer. |
| Conduit Ø3/4" | Caja \+ cantidad de conductores | Si conductores por conduit \> 3, se usa conduit Ø1". Coeficiente base asume Ø3/4" con 3 conductores (F+N+T). |
| Conector de conduit | Cantidad de conduit | 2 conectores por cada tramo de conduit (entrada y salida de caja). Calculado como 2 × cantidad de cajas. |
| Wire nuts / terminales | Tipo de TC | TC estándar: 3 wire nuts (F+N+T). TC GFCI/AFCI: 5 wire nuts (línea F, línea N, carga F, carga N, tierra). |
| Placa de acabado | Tipo de montaje \+ Poles | 1 placa por TC. El tipo de placa varía: simple/doble/triple según poles del TC. |
| Cinta aislante | Cantidad total de TCs | 1 rollo cada 15 TCs (redondeo techo). |

## **4.3 Catálogo de Coeficientes Base (Perfil NEC-2023)**

Los siguientes coeficientes son los valores por defecto del perfil NEC-2023 incluido en SEITE. Son modificables por el Administrador sin recompilar la aplicación.

| Código material | Descripción | Unidad | Coef. TC ESTÁNDAR\_120 | Coef. TC GFCI/AFCI | Coef. TC ESTANDAR\_240 | Notas |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| TC-UNIT | Tomacorriente (del tipo ingresado) | UN | 1.00 | 1.00 | 1.00 | Directo, sin coeficiente adicional. |
| CAJA-EMT-STD | Caja rectangular EMT estándar | UN | 1.00 (empotrado) | 1.00 | 1.00 | Solo si montaje=EMPOTRADO. |
| CAJA-SUP-STD | Caja de sobreponer PVC/metálica | UN | 1.00 (superficial) | 1.00 | 1.00 | Solo si montaje=SUPERFICIAL. |
| PLACA-STD | Placa de acabado estándar | UN | 1.00 | 1.00 | 1.00 | Tipo según poles del TC. |
| CAB-12-THHN-F | Cable AWG 12 THHN Fase | ML | 1.30 | 1.30 | 1.30 | Factor de desperdicio 30% incluido. |
| CAB-12-THHN-N | Cable AWG 12 THHN Neutro | ML | 1.30 | 1.30 | 1.30 | Factor de desperdicio 30% incluido. |
| CAB-12-THHN-T | Cable AWG 12 THHN Tierra | ML | 1.30 | 1.30 | 1.30 | Factor de desperdicio 30% incluido. |
| CONDUIT-34-EMT | Conduit EMT Ø3/4" (tramo promedio) | ML | 0.95 | 0.95 | 1.10 | TC 240V requiere mayor recorrido. |
| CONECTOR-34 | Conector de conduit Ø3/4" | UN | 2.00 | 2.00 | 2.00 | 2 por caja (entrada \+ salida). |
| GRAPA-STD | Abrazadera/grapa para conduit | UN | 2.85 | 2.85 | 3.30 | Cada \~0.9 m de conduit. |
| TORNILLO-ANC | Tornillos y tuercas de anclaje | UN | 4.00 | 4.00 | 4.00 | 4 por caja. |
| WIRENUTS-STD | Wire nuts / terminales | UN | 3.00 | 5.00 | 3.00 | GFCI/AFCI requiere 5 por doble conexión. |
| CINTA-AISL | Cinta aislante (rollo 18m) | ROLLO | 0.067 | 0.067 | 0.067 | \= 1/15; redondeo techo al final. |

*📌 Los coeficientes de cable incluyen un factor de desperdicio del 30% (configurable por perfil normativo). El factor base de longitud de cable asume una altura de techo de 3.0 m y recorrido estándar desde el tablero. Si el proyecto requiere mayor precisión, el usuario debe ajustar manualmente las cantidades de cable en el BOM.*

## **4.4 Sistema de Perfiles Normativos**

SEITE soporta múltiples perfiles normativos configurables. Un perfil normativo es un conjunto de:

* Coeficientes técnicos por material y tipo de TC.

* Reglas eléctricas (maxTomacorrientes por circuito, capacidad default de breakers, etc.).

* Factor de desperdicio global aplicado a conductores.

* Identificador de la normativa (NEC, RETIE, IEC, personalizado).

| Parámetro configurable | NEC-2023 (default) | RETIE-2013 | Descripción |
| ----- | ----- | ----- | ----- |
| maxTomacorrientes / circuito 20A | 10 | 8 | Máximo TCs de 120V por circuito ramal de 20A. |
| capacidadBreakerDefault | 20A | 20A | Capacidad del breaker al crear un nuevo circuito. |
| factorDesperdicioCondutor | 30% | 25% | Porcentaje adicional sobre longitud base de conductores. |
| coefConduitPorTC\_120 | 0.95 ML | 1.00 ML | Metros de conduit por TC de 120V. |
| maxConductoresPorConduit3/4 | 3 | 3 | Máximo de conductores calibre 12 en conduit Ø3/4". |
| requiereCircuitoPropioTC240 | true | true | Todo TC de 240V debe tener circuito dedicado. |

*⚙️ Decisión de diseño: Se incluyen NEC-2023 y RETIE-2013 como perfiles predefinidos en la versión inicial. El Administrador puede crear perfiles personalizados. Los perfiles son archivos JSON versionados almacenados en la base de datos, no en el código fuente.*

## **4.5 Precisión de la Estimación**

SEITE produce estimaciones de materiales bajo las siguientes condiciones y limitaciones conocidas:

| Condición | Precisión esperada | Justificación |
| ----- | ----- | ----- |
| Recorrido de conduit | ±25–40% | No se modela geometría real. El coeficiente asume recorrido promedio desde tablero. |
| Longitud de cable | ±20–30% | Factor de desperdicio configurable, pero sin planos reales. |
| Cantidad de TC, cajas, placas | 100% exacto | Cálculo directo 1:1. |
| Breakers | 100% exacto | Un breaker por circuito definido. |
| Accesorios (tornillos, wire nuts) | ±10–15% | Depende de la instalación real pero el coeficiente es suficientemente representativo. |

*⚠️  La imprecisión en conduit y cable es inherente al modelo. Todo BOM exportado debe incluir esta advertencia en el pie de página del reporte.*

# **5\. Requerimientos Funcionales**

Cada RF incluye: descripción, precondiciones, flujo principal, flujos alternativos, manejo de errores y criterios de aceptación medibles (CA).

## **5.1 Módulo M-01: Gestión de Proyectos**

### **RF-01: Crear Proyecto**

El sistema debe permitir a usuarios con rol Técnico, Contratista o Administrador crear un nuevo proyecto de estimación.

#### **Precondiciones**

* El usuario tiene sesión activa (online u offline con refresh token válido).

#### **Flujo Principal**

17. El usuario activa «Nuevo Proyecto» desde el dashboard.

18. El sistema presenta un formulario con los campos: nombre (\*), descripción, cliente, ubicación, perfil normativo (\*), moneda (\*), tasa de impuesto (\*).

19. El usuario completa los campos obligatorios (\*) y confirma.

20. El sistema valida: nombre único por usuario, tasa de impuesto en rango \[0.00, 100.00\], perfil normativo existente.

21. El sistema crea el proyecto con id=UUID\_v4, versionActual=1, estado=BORRADOR, y redirige al editor del proyecto.

#### **Flujos Alternativos**

* FA-01a: Si el usuario cancela en cualquier paso, no se crea ningún registro.

* FA-01b: Si el usuario está offline, el proyecto se crea en IndexedDB local y se marca para sincronización pendiente.

#### **Manejo de Errores**

| Código de error | Condición | Respuesta del sistema |
| ----- | ----- | ----- |
| ERR-PRJ-001 | Nombre duplicado para el mismo usuario | Mostrar: «Ya existe un proyecto con este nombre. Elige un nombre diferente.» |
| ERR-PRJ-002 | Tasa de impuesto fuera de rango | Mostrar: «La tasa de impuesto debe estar entre 0.00% y 100.00%.» |
| ERR-PRJ-003 | Campo obligatorio vacío | Resaltar campo en rojo con etiqueta «Requerido». |

#### **Criterios de Aceptación**

* CA-RF01-1: El proyecto aparece en el listado del usuario en menos de 500 ms tras la confirmación.

* CA-RF01-2: El proyecto se almacena en IndexedDB/DB con todos los campos ingresados y los campos generados (id, estado=BORRADOR, versionActual=1, creadoEn).

* CA-RF01-3: Si el nombre está duplicado, el sistema muestra ERR-PRJ-001 y no crea el proyecto.

### **RF-02: Guardar Proyecto (Auto-save y Manual)**

El sistema debe persistir automáticamente los cambios del proyecto activo cada 120 segundos y ante cualquier evento de cierre.

#### **Flujo Principal — Auto-save**

22. Cada 120 segundos, si hay cambios no persistidos, el sistema serializa el estado del proyecto activo.

23. Persiste en IndexedDB con timestamp actualizado.

24. Muestra un indicador no bloqueante «Guardado automáticamente» durante 2 segundos.

#### **Flujo Principal — Guardado Manual**

25. El usuario presiona Ctrl+S (desktop) o el botón «Guardar».

26. El sistema persiste inmediatamente y actualiza modificadoEn.

#### **Criterios de Aceptación**

* CA-RF02-1: El auto-save ocurre en un intervalo de 120 ± 5 segundos.

* CA-RF02-2: Tras un cierre inesperado del navegador, al reabrir la aplicación el proyecto recupera el estado del último guardado automático.

* CA-RF02-3: El guardado manual completa en menos de 200 ms en proyectos con hasta 500 TCs.

### **RF-03: Duplicar y Eliminar Proyectos**

#### **Duplicar**

* El sistema copia todos los datos del proyecto (zonas, circuitos, TCs, BOM, ajustes) a un nuevo proyecto.

* El nombre del nuevo proyecto es «\[Nombre original\] — Copia» con sufijo incremental si ya existe.

* El nuevo proyecto tiene estado=BORRADOR, versionActual=1, y NO copia los snapshots históricos.

#### **Eliminar**

* El sistema solicita confirmación con el texto literal: «Eliminar el proyecto \[nombre\]? Esta acción es irreversible.»

* Tras confirmación, el registro y todos sus datos relacionados (zonas, circuitos, TCs, BOM, ajustes, snapshots) son eliminados permanentemente.

* Si el proyecto está en estado FINALIZADO, se requiere confirmación adicional: «Este proyecto está marcado como Finalizado. ¿Está seguro?»

## **5.2 Módulo M-02: Configuración de Zonas y Circuitos**

### **RF-04: Gestión de Zonas**

El usuario puede crear, editar, reordenar y eliminar zonas dentro de un proyecto.

#### **Reglas de negocio**

* Un proyecto debe tener al menos 1 zona para poder calcular el BOM.

* Eliminar una zona elimina en cascada todos sus circuitos y TCs asociados; se requiere confirmación del usuario.

* El nombre de la zona es único dentro del proyecto (case-insensitive).

#### **Criterios de Aceptación**

* CA-RF04-1: El sistema acepta hasta 100 zonas por proyecto sin degradación de rendimiento (\<300 ms de respuesta en UI).

* CA-RF04-2: Intentar crear una zona con nombre duplicado muestra error y no persiste el registro.

### **RF-05: Gestión de Circuitos**

El usuario puede crear, editar y eliminar circuitos dentro de una zona.

#### **Reglas de negocio**

* Cada zona debe tener al menos 1 circuito para poder contener TCs.

* Al crear un circuito, capacidadBreaker se establece en el valor default del perfil normativo activo.

* Si la suma de TCs en un circuito supera maxTomacorrientes, el sistema muestra una advertencia persistente (no bloqueante) y marca el circuito con un indicador visual de advertencia.

* Eliminar un circuito elimina en cascada todos sus TCs; se requiere confirmación.

#### **Criterios de Aceptación**

* CA-RF05-1: Al cambiar maxTomacorrientes de un perfil normativo, los circuitos existentes que superen el nuevo límite se marcan con advertencia en menos de 1 segundo.

* CA-RF05-2: El sistema permite asignación manual de TCs a circuitos respetando la validación de maxTomacorrientes.

## **5.3 Módulo M-03: Ingreso de Tomacorrientes**

### **RF-06: Registrar Tomacorrientes**

El usuario puede registrar grupos de TCs (mismo tipo y montaje) dentro de un circuito.

#### **Precondiciones**

* El proyecto tiene al menos 1 zona con al menos 1 circuito.

#### **Validaciones**

| Campo | Regla de validación | Error si falla |
| ----- | ----- | ----- |
| tipo | Valor debe pertenecer al Enum definido en §3.1.4 | «Tipo de tomacorriente inválido.» |
| montaje | Valor debe ser EMPOTRADO o SUPERFICIAL | «Tipo de montaje inválido.» |
| cantidad | Entero positivo entre 1 y 50 | «La cantidad debe ser un número entero entre 1 y 50.» |
| circuito | El circuito destino debe existir y pertenecer al proyecto activo | «Circuito no encontrado en este proyecto.» |

#### **Flujo de asignación automática a circuitos**

27. Si el usuario ingresa TCs en una zona con asignacionAuto=true, el sistema distribuye los TCs en los circuitos existentes de la zona.

28. Si todos los circuitos están al máximo, crea un nuevo circuito C-\[N+1\] automáticamente.

29. Muestra al usuario el resultado de la distribución antes de confirmar.

#### **Criterios de Aceptación**

* CA-RF06-1: Ingreso de 100 TCs distribuidos en múltiples circuitos completa en menos de 1 segundo.

* CA-RF06-2: Valores fuera del rango (negativos, decimales, \>50) son rechazados con mensaje de error.

* CA-RF06-3: Un TC de 240V siempre se asigna a un circuito exclusivo, independientemente del modo de asignación.

## **5.4 Módulo M-04: Motor de Cálculo del BOM**

### **RF-07: Generación del BOM**

El sistema debe calcular el BOM completo aplicando las fórmulas definidas en §4.2.

#### **Disparadores del cálculo**

* El usuario añade, modifica o elimina TCs.

* El usuario cambia el perfil normativo del proyecto.

* El usuario modifica manualmente maxTomacorrientes o la configuración de circuitos.

#### **Comportamiento**

30. El sistema calcula las cantidades según la fórmula de §4.2 y las fórmulas especiales de §4.2.1 y §4.2.2.

31. Persiste los resultados en la tabla BOM actualizando cantidadEstimada. cantidadAjustada NO se modifica si ya existe un ajuste manual en ese registro.

32. Actualiza el snapshot del precio (precioUnitarioSnap) únicamente si no existe un valor previo o si el usuario solicita explícitamente «Actualizar precios».

#### **Criterios de Aceptación**

* CA-RF07-1: El BOM se recalcula en menos de 2 segundos para proyectos con hasta 1,000 TCs distribuidos en hasta 100 zonas.

* CA-RF07-2: Si el catálogo no contiene el material requerido, el sistema genera el registro BOM con cantidadEstimada calculada pero precioUnitarioSnap=0 y muestra una advertencia: «Material \[código\] no encontrado en el catálogo. Asigne un precio manualmente.»

* CA-RF07-3: cantidadEstimada es siempre el resultado de la fórmula sin ajustes. cantidadAjustada refleja el ajuste manual vigente o es igual a cantidadEstimada si no hay ajustes.

## **5.5 Módulo M-05: Ajuste Manual del BOM**

### **RF-08: Modificar Cantidad Ajustada**

El usuario autorizado puede modificar cantidadAjustada de cualquier registro del BOM.

#### **Reglas de negocio**

* cantidadAjustada ≥ 0\. El sistema acepta 0 (indica que el material no se usará, pero permanece en el BOM con subtotal \= 0).

* La justificación es obligatoria: mínimo 10 caracteres, máximo 500\.

* cantidadEstimada nunca es modificada por un ajuste manual. Es de solo lectura en la UI.

#### **Columnas visibles en la tabla BOM**

| Columna | Fuente de datos | Editable | Descripción |
| ----- | ----- | ----- | ----- |
| Material | Material.descripcion | No | Nombre del material. |
| Unidad | Material.unidad | No | Unidad de medida. |
| Cant. Estimada | BOM.cantidadEstimada | No (solo lectura) | Calculado por el motor. Nunca editable. |
| Cant. Ajustada | BOM.cantidadAjustada | Sí (spinner numérico) | Valor vigente para el cálculo de costos. |
| Δ Diferencia | Calculado: ajustada − estimada | No | Verde si \> 0, Rojo si \< 0, Neutro si \= 0\. |
| P. Unitario | BOM.precioUnitarioSnap | No (ver RF-12) | Precio al momento del cálculo. |
| Subtotal | Calculado: ajustada × p.unitario | No | Actualizado en tiempo real al cambiar ajustada. |
| Justificación | Último Ajuste.justificacion | Al editar cantidad | Obligatoria al hacer ajuste. |

#### **Criterios de Aceptación**

* CA-RF08-1: Al guardar un ajuste, se crea un registro en la tabla Ajuste con todos sus campos en menos de 300 ms.

* CA-RF08-2: El subtotal y el total del proyecto se actualizan en tiempo real (\< 100 ms) al modificar cantidadAjustada.

* CA-RF08-3: Intentar guardar un ajuste con justificación \< 10 caracteres muestra error y no persiste el cambio.

### **RF-09: Restaurar Estimación Base**

El usuario puede restaurar cantidadAjustada a cantidadEstimada para un material individual o para todos los materiales del BOM.

#### **Comportamiento**

* Al restaurar un material: cantidadAjustada \= cantidadEstimada. Se crea un registro Ajuste con esRestauracion=true y justificación automática: «Restaurado a estimación base por \[usuario\] el \[timestamp\].»

* Al restaurar todo el BOM: se aplica la restauración a todos los registros con cantidadAjustada ≠ cantidadEstimada. Se solicita confirmación antes de ejecutar.

#### **Criterios de Aceptación**

* CA-RF09-1: La restauración individual completa en menos de 200 ms.

* CA-RF09-2: La restauración masiva de un BOM con 50 materiales completa en menos de 1 segundo.

### **RF-10: Historial de Ajustes**

El usuario puede consultar el historial completo de ajustes de un material del BOM.

#### **Información mostrada por ajuste**

* Número de ajuste (secuencial por material).

* Fecha y hora (formato: DD/MM/YYYY HH:mm:ss, zona horaria local del dispositivo).

* Usuario que realizó el ajuste.

* Cantidad anterior → Cantidad nueva.

* Justificación completa.

* Indicador visual si es restauración automática.

#### **Criterios de Aceptación**

* CA-RF10-1: El historial muestra todos los ajustes ordenados cronológicamente (más reciente primero).

* CA-RF10-2: El historial persiste aun cuando el BOM sea recalculado.

## **5.6 Módulo M-06: Versionado de Proyectos**

### **RF-11: Crear Snapshot (Versión)**

El usuario puede crear manualmente un snapshot del estado actual del proyecto.

#### **Disparadores automáticos de snapshot**

* Al cambiar el estado del proyecto a FINALIZADO.

* Al recibir un conflicto de sincronización (se crea snapshot de la versión descartada).

* Al restaurar el BOM completo (RF-09 masivo).

#### **Comportamiento**

33. El sistema serializa el estado completo del proyecto (zonas, circuitos, TCs, BOM, ajustes) en un JSON comprimido.

34. Almacena el snapshot con numeroVersion \= versionActual \+ 1, incrementando versionActual en el proyecto.

35. El snapshot es inmutable; no puede ser editado, solo consultado o restaurado.

#### **Criterios de Aceptación**

* CA-RF11-1: Un snapshot de un proyecto con 1,000 TCs y 50 materiales en el BOM se crea en menos de 3 segundos.

* CA-RF11-2: El payload JSON del snapshot reproduce fielmente el estado del proyecto al momento de su creación.

### **RF-12: Restaurar y Comparar Versiones**

#### **Restaurar**

* El usuario selecciona un snapshot del historial y confirma la restauración.

* El sistema crea automáticamente un snapshot del estado actual (antes de restaurar) con etiqueta «Auto-guardado pre-restauración».

* El sistema reemplaza el estado activo del proyecto con el payload del snapshot seleccionado.

#### **Comparar**

* El usuario puede seleccionar dos versiones (cualquier combinación de actual \+ snapshot, o dos snapshots) para ver diferencias.

* El sistema muestra una vista de diferencias tipo diff con: materiales añadidos/eliminados del BOM, cantidades que cambiaron (estimadas y ajustadas), zonas/circuitos/TCs modificados.

#### **Criterios de Aceptación**

* CA-RF12-1: La vista de comparación se carga en menos de 2 segundos para proyectos con hasta 100 materiales en el BOM.

* CA-RF12-2: La restauración no es posible sin crear primero el snapshot automático de respaldo.

## **5.7 Módulo M-07: Exportación y Reportes**

### **RF-13: Exportar BOM**

El sistema debe permitir exportar el BOM en tres formatos: PDF, XLSX y CSV.

#### **Configuración de exportación**

| Parámetro | Tipo | Default | Descripción |
| ----- | ----- | ----- | ----- |
| Incluir precios | Boolean | true | Si false, las columnas de precio y subtotal se omiten del reporte. |
| Incluir historial de ajustes | Boolean | false | Si true, se añade una sección/hoja adicional con todos los ajustes. |
| Filtrar por zonas | Multi-select | Todas | Permite exportar el BOM de zonas específicas. |
| Incluir advertencia de precisión | Boolean | true | Pie de página con advertencia de variación en conduit/cable. |
| Decimales en cantidades | Integer \[0–4\] | 2 | Precisión de las cantidades en el reporte. |

#### **Formato PDF**

* Encabezado: nombre del proyecto, cliente, fecha de generación, versión del proyecto, perfil normativo aplicado.

* Tabla de materiales con columnas: Código, Descripción, Unidad, Cant. Estimada, Cant. Ajustada, Δ, P. Unitario, Subtotal.

* Totales: subtotal sin impuesto, monto de impuesto (tasa%), total final. Todo en la moneda configurada del proyecto.

* Pie de página: «Estimación generada con SEITE v2.0. Variaciones en conduit y cable de ±25–40% son esperadas. Validar con ingeniero eléctrico certificado.»

#### **Formato XLSX**

* Hoja 1: BOM completo con fórmulas de Excel para subtotales y totales (no valores planos).

* Hoja 2 (si habilitada): Historial de ajustes.

* Hoja 3: Metadatos del proyecto (nombre, cliente, fecha, perfil normativo).

#### **Formato CSV**

* Un archivo plano con cabecera. Separador de campo: coma. Codificación: UTF-8 con BOM.

* Columnas: codigo\_material, descripcion, unidad, cantidad\_estimada, cantidad\_ajustada, precio\_unitario, subtotal.

#### **Criterios de Aceptación**

* CA-RF13-1: La exportación PDF de un BOM con 50 materiales completa en menos de 5 segundos en el navegador.

* CA-RF13-2: La exportación XLSX contiene fórmulas funcionales (no valores planos) en columnas de subtotal y total.

* CA-RF13-3: El archivo CSV está codificado en UTF-8 con BOM y es importable en Excel sin pérdida de caracteres especiales.

* CA-RF13-4: El total del reporte refleja cantidadAjustada × precioUnitarioSnap para cada material.

## **5.8 Módulo M-08: Catálogo de Materiales**

### **RF-14: Administración del Catálogo**

El usuario con rol Administrador o Contratista puede gestionar el catálogo de materiales.

#### **Operaciones**

* Crear: Ingresa nuevo material con todos los campos de §3.1.5. El código es único y validado al guardar.

* Editar: Modifica descripción, precio, unidad o categoría. No modifica el id ni el código.

* Desactivar: Cambia activo=false. El material desaparece de nuevas estimaciones pero persiste en BOM históricos con sus cantidades y precio snapshot.

* Importar: Carga masiva desde XLSX o CSV. El sistema valida cada fila y reporta errores por fila sin cancelar las filas válidas.

#### **Criterios de Aceptación**

* CA-RF14-1: La importación de un catálogo de 500 materiales completa en menos de 10 segundos.

* CA-RF14-2: Si una fila del archivo de importación tiene datos inválidos, el sistema importa las filas válidas y muestra un reporte de errores con número de fila y descripción del error.

* CA-RF14-3: Un material desactivado no aparece en la búsqueda de materiales para nuevos BOM, pero sí en BOM históricos.

# **6\. Requerimientos No Funcionales**

## **6.1 Rendimiento**

| ID | Métrica | Valor objetivo | Condición de medición |
| ----- | ----- | ----- | ----- |
| RNF-REN-01 | Tiempo de cálculo del BOM | \< 2 segundos | Proyecto con 1,000 TCs en 100 zonas, dispositivo con CPU de 4 núcleos a 2.0 GHz. |
| RNF-REN-02 | Tiempo de respuesta de UI al ajuste | \< 100 ms | Actualización de subtotal y total tras modificar cantidadAjustada. |
| RNF-REN-03 | Tiempo de exportación PDF | \< 5 segundos | BOM con 100 materiales, generado en el cliente (navegador). |
| RNF-REN-04 | Tiempo de carga inicial (cold start) | \< 3 segundos | Conexión 4G (10 Mbps). Primera carga con caché vacía. |
| RNF-REN-05 | Tiempo de carga (warm start, offline) | \< 1 segundo | Service Worker cacheado. Sin conexión a internet. |
| RNF-REN-06 | Auto-save | \< 200 ms sin bloquear UI | Guardado en IndexedDB de proyecto con 500 TCs. |

## **6.2 Escalabilidad**

| ID | Límite | Comportamiento esperado |
| ----- | ----- | ----- |
| RNF-ESC-01 | 50 zonas por proyecto | Sin degradación de rendimiento. UI renderiza en \< 500 ms. |
| RNF-ESC-02 | 200 circuitos por proyecto | Sin degradación. Paginación activada en la vista de circuitos si \> 50\. |
| RNF-ESC-03 | 1,000 TCs por proyecto | Motor de cálculo completa en \< 2 s (ver RNF-REN-01). |
| RNF-ESC-04 | 10,000 materiales en catálogo | Búsqueda en catálogo devuelve resultados en \< 500 ms con búsqueda incremental. |
| RNF-ESC-05 | 500 proyectos por usuario en IndexedDB | La lista de proyectos carga en \< 1 s con paginación de 20 elementos. |
| RNF-ESC-06 | 50 snapshots por proyecto | El historial de versiones carga en \< 1 s. |

## **6.3 Seguridad**

| ID | Requerimiento | Especificación |
| ----- | ----- | ----- |
| RNF-SEG-01 | Cifrado de datos locales | Datos de proyectos en IndexedDB cifrados con AES-256-GCM usando clave derivada de la sesión del usuario. |
| RNF-SEG-02 | Autenticación | JWT: access token con expiración de 15 minutos, refresh token de 7 días almacenado en httpOnly cookie (online) o localStorage cifrado (offline). |
| RNF-SEG-03 | Autenticación offline | La sesión offline se mantiene activa mientras el refresh token sea válido. Al expirar, se requiere autenticación online para renovar. |
| RNF-SEG-04 | Control de acceso (RBAC) | Verificación de rol en cada operación crítica tanto en cliente como en servidor. Una solicitud con token válido pero rol insuficiente devuelve HTTP 403\. |
| RNF-SEG-05 | Comunicación en red | Todas las comunicaciones con el backend usan HTTPS (TLS 1.2 mínimo). HTTP plano es rechazado con redirección 301\. |
| RNF-SEG-06 | Protección contra CSRF | Tokens CSRF en todas las mutaciones de estado. OWASP ASVS 4.0 Nivel 2\. |
| RNF-SEG-07 | Límite de intentos de login | Máximo 5 intentos fallidos consecutivos. Bloqueo de cuenta por 15 minutos tras superar el límite. |

## **6.4 Confiabilidad y Disponibilidad**

| ID | Requerimiento | Especificación |
| ----- | ----- | ----- |
| RNF-CON-01 | Disponibilidad offline | Funcionalidad completa de estimación (RF-01 a RF-13) disponible sin conexión a internet. |
| RNF-CON-02 | Recuperación ante fallos | Tras cierre inesperado del navegador, el proyecto recupera el estado del último auto-save al reabrir la aplicación en menos de 3 segundos. |
| RNF-CON-03 | Integridad de datos | Toda operación de escritura en IndexedDB es transaccional. No existen estados inconsistentes ante una interrupción de escritura. |
| RNF-CON-04 | Disponibilidad del servidor (online) | 99.5% de uptime mensual (si se despliega el backend de sincronización). |

## **6.5 Auditoría y Logs**

| ID | Evento auditado | Datos registrados |
| ----- | ----- | ----- |
| RNF-AUD-01 | Login / Logout | userId, timestamp, IP, dispositivo, resultado (éxito/fallo). |
| RNF-AUD-02 | Creación/eliminación de proyecto | userId, proyectoId, nombre del proyecto, timestamp. |
| RNF-AUD-03 | Modificación de coeficientes o perfiles normativos | userId, campo modificado, valor anterior, valor nuevo, timestamp. |
| RNF-AUD-04 | Ajuste manual de BOM | Registrado en tabla Ajuste (ver §3.1.7). Adicionalmente en log de auditoría del servidor si está online. |
| RNF-AUD-05 | Creación/restauración de snapshots | userId, proyectoId, snapshotId, tipo (manual/automático), timestamp. |
| RNF-AUD-06 | Exportación de reportes | userId, proyectoId, formato (PDF/XLSX/CSV), timestamp, configuración de exportación. |

Los logs de auditoría del servidor se almacenan en un sistema append-only (no modificables). Retención mínima: 12 meses.

## **6.6 Usabilidad**

| ID | Requerimiento | Criterio medible |
| ----- | ----- | ----- |
| RNF-USA-01 | Curva de aprendizaje | Un técnico sin capacitación previa debe completar una estimación básica (1 zona, 5 TCs, exportar PDF) en menos de 15 minutos. |
| RNF-USA-02 | Mensajes de error | Todo mensaje de error incluye: código de error, descripción clara en español, y una acción sugerida. Longitud máxima del mensaje: 150 caracteres. |
| RNF-USA-03 | Accesibilidad | WCAG 2.1 Nivel AA. Contraste mínimo 4.5:1 en texto normal, 3:1 en texto grande. Navegación completa por teclado. |
| RNF-USA-04 | Responsividad | Interfaz funcional en resoluciones desde 1024×768 (escritorio mínimo) hasta 1920×1080. En tablets (768px): modo compacto. |
| RNF-USA-05 | Feedback de operaciones | Toda operación que tarde más de 500 ms muestra un indicador de progreso. Operaciones \> 3 s muestran progreso con porcentaje si es calculable. |

## **6.7 Portabilidad y Compatibilidad**

| Plataforma / Entorno | Versión mínima soportada | Nivel de soporte |
| ----- | ----- | ----- |
| Google Chrome | 110+ | Primario — suite de pruebas completa. |
| Microsoft Edge | 110+ | Primario — mismo motor que Chrome. |
| Mozilla Firefox | 110+ | Secundario — pruebas de regresión en releases. |
| Safari (macOS) | 16+ | Secundario — funcionalidad PWA limitada (sin push notifications). |
| Chrome (Android) | 110+ | Terciario — interfaz adaptable, sin garantía de exportación PDF. |
| Safari (iOS) | 16+ | Terciario — limitaciones de IndexedDB en iOS conocidas; se documenta. |
| Internet Explorer | Ninguna | No soportado. |

## **6.8 Mantenibilidad**

* El código fuente debe tener cobertura de tests unitarios ≥ 80% en el motor de cálculo del BOM (§4.2).

* El motor de cálculo debe estar desacoplado de la UI (capa de lógica pura, sin dependencias de React).

* Los perfiles normativos (coeficientes y reglas) deben poder actualizarse sin recompilar la aplicación (formato JSON editable por el Administrador).

* El sistema de logs debe permitir activar/desactivar niveles de log (DEBUG, INFO, WARN, ERROR) sin reiniciar la aplicación.

# **7\. Decisiones de Diseño Asumidas**

Las siguientes decisiones fueron tomadas por el equipo de arquitectura ante la ausencia de especificación explícita del cliente. Deben ser confirmadas o modificadas antes del inicio del sprint de desarrollo.

| ID | Decisión asumida | Alternativas descartadas | Justificación |
| ----- | ----- | ----- | ----- |
| DA-01 | PWA offline-first sobre Electron o app nativa. | Electron (mayor acceso a filesystem), App nativa multiplataforma. | Menor fricción de distribución, sin instaladores, actualizaciones automáticas, stack web uniforme. |
| DA-02 | IndexedDB (Dexie.js) como almacenamiento local principal. | SQLite (via sql.js), localStorage. | IndexedDB soporta transacciones y consultas complejas. localStorage tiene límite de 5MB. sql.js tiene mayor overhead. |
| DA-03 | Generación de PDF en el cliente (jsPDF), sin servidor. | Renderizado PDF en servidor. | Funciona offline. Evita envío de datos sensibles al servidor para generar documentos. |
| DA-04 | Coeficientes base asumen longitud de cable con factor 1.30 (30% desperdicio). No se modela geometría real. | Módulo de planos con recorridos reales. | La complejidad de un módulo de geometría está fuera del alcance v2.0. El factor configurable es suficiente para estimaciones. |
| DA-05 | Los precios en BOM se toman como snapshot al momento del cálculo. No se actualizan automáticamente. | Precios en tiempo real del catálogo. | Evita cambios retroactivos en proyectos cerrados. El usuario puede solicitar explícitamente «Actualizar precios». |
| DA-06 | NEC-2023 como perfil normativo predeterminado. RETIE-2013 incluido como segundo perfil. | Solo NEC, o solo perfiles personalizados. | Cubre los mercados objetivo principales (Norteamérica y Colombia). Los perfiles son extensibles por el Administrador. |
| DA-07 | Justificación obligatoria de mínimo 10 caracteres en ajustes manuales. | Justificación opcional. | Garantiza trazabilidad mínima. Un campo vacío o de 1 carácter no provee valor de auditoría. |
| DA-08 | Moneda configurada por proyecto, no globalmente. | Moneda global del sistema. | Un contratista puede tener proyectos en múltiples países con diferentes monedas simultáneamente. |

# **8\. Apéndices**

## **8.1 Matriz de Trazabilidad de Requerimientos**

| ID RF | Módulo | Descripción resumida | Prioridad | Versión objetivo |
| ----- | ----- | ----- | ----- | ----- |
| RF-01 | M-01 | Crear proyecto de estimación | Crítica | v1.0 |
| RF-02 | M-01 | Auto-save y guardado manual | Crítica | v1.0 |
| RF-03 | M-01 | Duplicar y eliminar proyectos | Alta | v1.0 |
| RF-04 | M-02 | Gestión de zonas | Crítica | v1.0 |
| RF-05 | M-02 | Gestión de circuitos | Crítica | v1.0 |
| RF-06 | M-03 | Registrar tomacorrientes con validaciones | Crítica | v1.0 |
| RF-07 | M-04 | Generación automática del BOM | Crítica | v1.0 |
| RF-08 | M-05 | Ajuste manual de cantidades con justificación | Crítica | v1.0 |
| RF-09 | M-05 | Restaurar estimación base (individual y masivo) | Alta | v1.0 |
| RF-10 | M-05 | Historial de ajustes por material | Alta | v1.0 |
| RF-11 | M-06 | Crear snapshots de versión | Alta | v1.0 |
| RF-12 | M-06 | Restaurar y comparar versiones | Media | v1.1 |
| RF-13 | M-07 | Exportación PDF, XLSX, CSV | Crítica | v1.0 |
| RF-14 | M-08 | Administración del catálogo de materiales | Alta | v1.0 |

## **8.2 Catálogo de Códigos de Error**

| Código | Módulo | Condición | Mensaje al usuario |
| ----- | ----- | ----- | ----- |
| ERR-PRJ-001 | Proyectos | Nombre de proyecto duplicado para el mismo usuario | «Ya existe un proyecto con este nombre. Elige un nombre diferente.» |
| ERR-PRJ-002 | Proyectos | Tasa de impuesto fuera de rango \[0.00, 100.00\] | «La tasa de impuesto debe estar entre 0.00% y 100.00%.» |
| ERR-CIR-001 | Circuitos | Número de TCs supera maxTomacorrientes del circuito | «El circuito \[nombre\] tiene más tomacorrientes del máximo permitido (\[max\]).» |
| ERR-TC-001 | Tomacorrientes | Cantidad fuera del rango \[1, 50\] | «La cantidad debe ser un número entero entre 1 y 50.» |
| ERR-TC-002 | Tomacorrientes | TC de 240V asignado a circuito compartido | «Los tomacorrientes de 240V requieren circuito exclusivo.» |
| ERR-BOM-001 | BOM | Material del catálogo no encontrado al calcular | «Material \[código\] no encontrado en el catálogo. Asigne un precio manualmente.» |
| ERR-AJU-001 | Ajustes | Justificación con menos de 10 caracteres | «La justificación debe tener al menos 10 caracteres.» |
| ERR-CAT-001 | Catálogo | Código de material duplicado | «El código \[código\] ya existe en el catálogo.» |
| ERR-EXP-001 | Exportación | Fallo en generación de PDF en el cliente | «No se pudo generar el PDF. Intente de nuevo o use el formato XLSX.» |
| ERR-SES-001 | Sesión | Refresh token expirado en modo offline | «Su sesión ha expirado. Conéctese a internet para renovarla.» |

## **8.3 Historial de Versiones del Documento**

| Versión | Fecha | Autor | Descripción de cambios |
| ----- | ----- | ----- | ----- |
| 1.0 | Marzo 2026 | Equipo de análisis | Versión inicial del SRS. Estructura básica de requerimientos. |
| 2.0 | Marzo 2026 | Arquitecto de software senior | Reescritura completa. Arquitectura PWA definida. Modelo de datos formalizado. Motor de cálculo especificado con fórmulas. Perfiles normativos configurables. RF con flujos alternativos, manejo de errores y CA medibles. RNF con métricas verificables. Decisiones de diseño documentadas. |

