# Original User Request

## 2026-08-18T05:51:13Z

Realizar una auditoría integral y fase de planificación para el proyecto "Delivery", actuando estrictamente como consultores. El equipo debe analizar la arquitectura, investigar dependencias, diseñar planes de QA y auditar la experiencia de producto (UX). **Bajo ninguna circunstancia el equipo debe escribir o modificar código fuente.**

Requested team: Full team (Research, QA, Architecture, Product)

Working directory: ~/teamwork_projects/delivery_audit
Integrity mode: demo

## Requirements

### R1. Revisión de Arquitectura y Seguridad
Analizar el documento de planificación actual (`docs/analisis_proyecto_delivery.md`) y el código fuente. Identificar cuellos de botella y vulnerabilidades. Generar el reporte en `docs/auditoria/arquitectura.md`.

### R2. Investigación tecnológica (Research)
Investigar las mejores herramientas para trazabilidad, pagos y WebSockets, referenciando proyectos Open Source. Generar un análisis comparativo en `docs/auditoria/research.md`.

### R3. Diseño de Aseguramiento de Calidad (QA)
Diseñar un plan de pruebas estructurado basado en los requisitos. Generar el reporte en `docs/auditoria/qa_plan.md`.

### R4. Auditoría de Producto y UI/UX
Analizar los flujos de usuario y entregar recomendaciones de usabilidad. Generar el reporte en `docs/auditoria/ux_audit.md`.

## Acceptance Criteria

### Verificación Objetiva de Entregables
- [ ] La carpeta `docs/auditoria/` debe ser creada y contener exactamente los cuatro archivos solicitados: `arquitectura.md`, `research.md`, `qa_plan.md`, y `ux_audit.md`.
- [ ] Ningún archivo de código fuente (ej. `.ts`, `.js`, `.py`) fuera de la carpeta `docs/` debe haber sido modificado por el equipo.
- [ ] El archivo `research.md` debe contener al menos una tabla comparativa con 2 o más herramientas/librerías.
- [ ] El archivo `qa_plan.md` debe enumerar al menos 5 casos de prueba concretos.
