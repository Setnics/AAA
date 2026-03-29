# Solicitud de evaluación técnica para implementación de modelo de estimación eléctrica (NEC 2020 Costa Rica)

## 1. Contexto del sistema

Se requiere evaluar la viabilidad de implementar un **módulo de
estimación de materiales (BOM)** para instalaciones de tomacorrientes
eléctricos, conforme al **NEC 2020 adoptado en Costa Rica**.

El sistema debe permitir generar, de forma automatizada, una lista
completa de materiales, cantidades y costos asociados a partir de
parámetros básicos del proyecto eléctrico.

------------------------------------------------------------------------

## 2. Objetivo funcional

Desarrollar un componente dentro de una aplicación web que:

-   Genere automáticamente un **Bill of Materials (BOM)**
-   Calcule cantidades con factores de desperdicio
-   Asigne protecciones según normativa NEC
-   Estime costos del proyecto
-   Sea escalable a distintos tipos de proyectos (residencial,
    comercial)

------------------------------------------------------------------------

## 3. Entradas del sistema (Inputs)

El sistema debe aceptar como mínimo:

### Parámetros generales:

-   Área del proyecto (m²)
-   Tipo de instalación (empotrada / expuesta)
-   Nivel de electrificación (bajo / medio / alto)
-   Voltaje del sistema (120/240 V)

### Parámetros eléctricos:

-   Cantidad de tomacorrientes
-   Distribución por zonas (cocina, baño, exterior, etc.)
-   Longitud estimada de canalización

------------------------------------------------------------------------

## 4. Procesamiento requerido (Lógica de negocio)

La IA debe evaluar e implementar las siguientes reglas:

### 4.1 Dimensionamiento eléctrico

-   Asignación de circuitos según NEC (Art. 210)
-   Máximo de carga por circuito (80%)
-   Potencia estimada por toma (\~180 VA)

### 4.2 Selección de conductores

-   Calibre mínimo: #12 AWG cobre (20A)
-   Diferenciación fase / neutro / tierra

### 4.3 Canalización

-   Selección de diámetro de tubería según cantidad de conductores
-   Inclusión de accesorios (curvas, conectores, cajas)

### 4.4 Dispositivos

-   Inclusión obligatoria de:
    -   GFCI (zonas húmedas)
    -   TR (tamper resistant)
    -   WR (exteriores)

### 4.5 Protección

-   Breakers por circuito
-   Inclusión de SPD en tablero principal
-   Evaluación de AFCI si aplica

### 4.6 Puesta a tierra

-   Dimensionamiento básico del sistema de tierra
-   Inclusión de varilla y conductor

### 4.7 Factores de ajuste

-   Desperdicio:
    -   Cable: 10--15%
    -   Tubería: 5--10%
-   Margen de contingencia: 5--10%

------------------------------------------------------------------------

## 5. Salidas esperadas (Outputs)

El sistema debe generar:

### 5.1 Lista de materiales (BOM)

-   Agrupada por categorías:
    -   Conductores
    -   Canalización
    -   Dispositivos
    -   Protección
    -   Tierra
    -   Consumibles

### 5.2 Metrado detallado

-   Cantidades ajustadas con desperdicio

### 5.3 Estimación de costos

-   Costo por ítem
-   Total de materiales
-   Mano de obra estimada
-   Total del proyecto

### 5.4 Validaciones normativas

-   Alertas si:
    -   Falta GFCI en zonas requeridas
    -   Circuito sobrecargado
    -   Falta sistema de tierra

------------------------------------------------------------------------

## 6. Requisitos técnicos de implementación

### 6.1 Arquitectura sugerida

-   Frontend: React / Vue
-   Backend: Node.js / Python (FastAPI recomendado)
-   Motor de cálculo: módulo independiente (rule engine)

### 6.2 Modelo de datos (simplificado)

Entidades clave: - Proyecto - Circuito - Material - Regla NEC -
Resultado BOM

### 6.3 Escalabilidad

El sistema debe permitir: - Incorporar nuevas normativas - Ajustar
precios dinámicamente - Integrar catálogos de proveedores

------------------------------------------------------------------------

## 7. Evaluación solicitada

Se solicita a la IA evaluar:

1.  Coherencia del modelo lógico\
2.  Cobertura normativa (NEC 2020)\
3.  Viabilidad de automatización\
4.  Posibles optimizaciones algorítmicas\
5.  Riesgos técnicos o ambigüedades\
6.  Sugerencias para mejorar precisión en estimaciones

------------------------------------------------------------------------

## 8. Criterio de éxito

El sistema será considerado adecuado si:

-   Genera un BOM completo sin omisiones críticas\
-   Cumple con normativa NEC aplicable\
-   Reduce desviaciones de costo en obra (\<10%)\
-   Es adaptable a distintos tipos de proyectos

------------------------------------------------------------------------

## 9. Observaciones finales

Este modelo está basado en prácticas reales de ingeniería
electromecánica en campo. Su correcta implementación requiere:

-   Validación normativa continua\
-   Ajuste según condiciones reales de instalación\
-   Integración futura con planos eléctricos (opcional)

------------------------------------------------------------------------

Se solicita un análisis técnico detallado y recomendaciones para su
implementación óptima en entorno web.
