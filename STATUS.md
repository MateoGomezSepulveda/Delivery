# Estado del Proyecto

**Última actualización:** 11 de Agosto de 2026

## Última Tarea / Contexto Actual
- Se completaron las **Fases 0.1, 0.2 y 0.3** de Auth, Users y Categories.
- Se completó la **Fase 0.4** (Products), arreglando el typo del schema, añadiendo validaciones `NotFoundException`, implementando `ProductPaginationDto` con filtros por precio y categoría, añadiendo índices de búsqueda de texto de MongoDB (`$text`), agregando `ParseMongoIdPipe` y Swagger, además de las Pruebas Unitarias.
- Se completó la **Fase 0.5** (Cart), creando el `RemoveFromCartDto`, añadiendo validaciones de cantidad, creando el método `clearCart()`, agregando Swagger y completando 8 tests unitarios.

## Siguiente Paso
- Iniciar la **Fase 0.6 — Módulo `orders/`**. 
  - Paginación en `findMyOrders()` y `findAllOrders()`.
  - Permitir cancelación de pedidos por parte del cliente.
  - Endpoint `GET /orders/:id`.
  - Vaciar carrito automáticamente después de crear el pedido.
  - Verificar Swagger y validación de IDs.
  - Escribir tests unitarios (`orders.service.spec.ts`).
