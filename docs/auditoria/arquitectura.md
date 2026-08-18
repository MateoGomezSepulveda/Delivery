# Auditoría Integral de Arquitectura y Seguridad — Delivery Backend

**Documento:** `docs/auditoria/arquitectura.md`  
**Fecha de Emisión:** Agosto 2026  
**Versión:** 1.0.0 — Informe Técnico de Auditoría y Consultoría  
**Estado:** Finalizado — Listo para Revisión y Ejecución  

---

## 1. Resumen Ejecutivo (Executive Summary)

El presente informe constituye una **auditoría técnica exhaustiva de arquitectura, seguridad, modelado de datos y escalabilidad** realizada sobre el proyecto **Delivery Backend** (desarrollado con NestJS 11, Mongoose 9 / MongoDB y TypeScript) y su plan maestro de evolución documentado en `docs/analisis_proyecto_delivery.md` y `STATUS.md`.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ESTADO ARQUITECTÓNICO GLOBAL                      │
│                                                                         │
│  Índice de Salud Arquitectónica: 72 / 100                               │
│  Postura de Seguridad: MEDIA-ALTA (con 2 vulnerabilidades críticas)     │
│  Nivel de Preparación para Producción: EN PROGRESO (Fase 0.4 completada)│
│  Escalabilidad Teórica: ALTA (con implementación de BullMQ + Redis)     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Diagnóstico General
El backend cuenta con una **base modular limpia y bien estructurada bajo las convenciones idiomáticas de NestJS**, separando controladores, servicios, DTOs y esquemas de Mongoose. Se han implementado salvaguardas iniciales como `Helmet`, `ThrottlerModule`, `ValidationPipe` global con sanitización de payloads, y una estrategia combinada de `JwtAuthGuard` y `RolesGuard` como `APP_GUARD` globales.

Sin embargo, la auditoría ha identificado **hallazgos de alta criticidad** que deben ser mitigados antes del despliegue en entornos productivos:
1. **Fuga de Token de Recuperación (`devToken`) en HTTP Response:** El endpoint `POST /auth/forgot-password` retorna el token criptográfico directamente en el payload JSON de la respuesta.
2. **Escalada de Privilegios en `POST /users`:** El DTO `CreateUserDto` expone el campo opcional `role?: Role`, permitiendo que una petición directa a `POST /users` cree usuarios con rol `ADMIN` saltándose las restricciones de registro.
3. **Condición de Carrera y No-Atomicidad en Checkout (`createOrder`):** La creación de órdenes y el cambio de estado del carrito a `CHECKED_OUT` se ejecutan en operaciones desconectadas sin transacciones ACID de MongoDB (`ClientSession`), abriendo la puerta a pérdidas de carritos o duplicidad de pedidos ante concurrencia.
4. **Acumulación Indefinida de Tokens por Falta de Índices TTL:** Las colecciones `RefreshToken` y `PasswordReset` carecen de índices TTL en MongoDB (`expireAfterSeconds: 0`), lo que genera retención perpetua de datos obsoletos.
5. **Riesgo de DoS por ReDoS en Búsquedas Regex:** Endpoints de `Users` y `Categories` ejecutan búsquedas mediante `$regex` con inputs del cliente sin sanitizar ni escapar caracteres especiales.

---

## 2. Auditoría Detallada Módulo por Módulo y Roadmap

```
                                  MAPA DE DEPENDENCIAS DE MÓDULOS ACTUALES
                                  
                                        ┌─────────────────┐
                                        │   AppModule     │
                                        │  (Global Guards)│
                                        └────────┬────────┘
                                                 │
                  ┌──────────────┬───────────────┼──────────────┬──────────────┐
                  ▼              ▼               ▼              ▼              ▼
           ┌────────────┐ ┌────────────┐  ┌────────────┐ ┌────────────┐ ┌────────────┐
           │ AuthModule │ │UsersModule │  │ Categories │ │  Products  │ │   Common   │
           └─────┬──────┘ └──────┬─────┘  └─────┬──────┘ └──────┬─────┘ └────────────┘
                 │               │              │               │
                 │               └──────────────┼───────────────┤
                 ▼                              ▼               ▼
           ┌────────────┐                 ┌────────────┐ ┌────────────┐
           │ Refresh/   │                 │ CartModule │ │OrdersModule│
           │ PassReset  │                 └──────┬─────┘ └──────┬─────┘
           └────────────┘                        │              │
                                                 └──────────────┘
```

---

### 2.1 Módulo `auth/` (Autenticación y Sesiones)
* **Archivos evaluados:** `auth.controller.ts`, `auth.service.ts`, `jwt.strategy.ts`, `jwt-auth.guard.ts`, `roles.guard.ts`, `seed.service.ts`, `schemas/refresh-token.schema.ts`, `schemas/password-reset.schema.ts`.

#### Hallazgos Técnicos
1. **[CRÍTICO] Fuga de Credenciales en `forgotPassword`:**  
   En `auth.service.ts` línea 133:
   ```typescript
   return { message: 'If the email exists, a reset link was generated.', devToken: resetToken };
   ```
   *Impacto:* Aunque concebido para desarrollo, exponer `devToken` en la respuesta JSON permite a cualquier atacante resetear contraseñas arbitrarias conociendo únicamente el correo electrónico de la víctima.
   *Remediación:* Eliminar inmediatamente `devToken` de la respuesta o condicionarlo estrictamente a `process.env.NODE_ENV !== 'production'`.
2. **[ALTO] Almacenamiento en Texto Plano de Refresh Tokens y Reset Tokens:**  
   Los tokens se guardan tal como se generan (`crypto.randomBytes().toString('hex')`) en las colecciones de MongoDB.
   *Impacto:* Si la base de datos se ve comprometida (data breach, volcado indebido, acceso no autorizado), todos los refresh tokens activos y tokens de reseteo pueden ser utilizados inmediatamente para secuestrar sesiones.
   *Remediación:* Almacenar únicamente el hash criptográfico SHA-256 del token en la base de datos (`crypto.createHash('sha256').update(token).digest('hex')`).
3. **[MEDIO] Falta de Detección de Reuso de Refresh Tokens (Token Family):**  
   Si un refresh token antiguo o interceptado es utilizado, el sistema actual simplemente responde error o rota el token existente si aún no venció. No invalida la familia de tokens del usuario ni alerta sobre posible robo de credenciales.
4. **[MEDIO] Seed Service Dependiente de `.env` sin Validación Fuerte:**  
   `seed.service.ts` crea un usuario Administrador en `OnModuleInit`. Si `ADMIN_PASSWORD` es débil o se usa el valor por defecto en producción, el sistema queda expuesto desde el arranque.

---

### 2.2 Módulo `users/` (Gestión de Identidades)
* **Archivos evaluados:** `users.controller.ts`, `users.service.ts`, `schema/users.schema.ts`, `dto/create-user.dto.ts`, `dto/update-user.dto.ts`.

#### Hallazgos Técnicos
1. **[CRÍTICO] Escalada de Privilegios en Creación de Usuarios:**  
   `CreateUserDto` expone:
   ```typescript
   @IsOptional()
   @IsEnum(Role)
   role?: Role;
   ```
   Y en `users.controller.ts`:
   ```typescript
   @Post()
   create(@Body() createUserDto: CreateUserDto) {
     return this.usersService.create(createUserDto);
   }
   ```
   *Impacto:* `usersService.create()` no restringe el rol, permitiendo que cualquier llamada directa a `POST /users` (por ejemplo, mediante un usuario autenticado o si la ruta se vuelve pública) genere usuarios con rol `ADMIN`.
   *Remediación:* Quitar el campo `role` de `CreateUserDto` o restringir la asignación de roles exclusivamente a administradores mediante un `AdminCreateUserDto` protegido con `@Roles(Role.ADMIN)`.
2. **[ALTO] Vulnerabilidad de ReDoS / Expresiones Regulares no Escapadas:**  
   En `users.service.ts`:
   ```typescript
   const filter = search ? {
     $or: [
       { name: { $regex: search, $options: 'i' } },
       { email: { $regex: search, $options: 'i' } },
     ],
   } : {};
   ```
   *Impacto:* Caracteres de control regex (como `.*.*.*.*.*a`) provocan backtracking catastrófico en el motor de MongoDB, consumiendo el 100% de la CPU y causando Denegación de Servicio (DoS).
   *Remediación:* Escapar los caracteres especiales antes de construir la consulta:
   ```typescript
   const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
   ```
3. **[MEDIO] Restricción Incondicional de Rol en `update()`:**  
   En `users.service.ts` línea 65: `if (updateData.role) delete updateData.role;`.  
   *Impacto:* Ni siquiera los administradores pueden cambiar el rol de un usuario mediante `PATCH /users/:id`. Se requiere un método y endpoint explícito `PATCH /users/:id/role` exclusivo para administradores.

---

### 2.3 Módulo `categories/` (Categorización de Catálogo)
* **Archivos evaluados:** `categories.controller.ts`, `categories.service.ts`, `schemas/category.schema.ts`.

#### Hallazgos Técnicos
1. **[POSITIVO] Validación de Integridad Referencial:**  
   `categories.service.ts` implementa correctamente `findByCategory(id)` antes de eliminar, bloqueando la eliminación de categorías que contienen productos vinculados.
2. **[MEDIO] Búsqueda Regex no Escapada:**  
   Al igual que en usuarios, `findAll()` en categorías filtra con `{ name: { $regex: search, $options: 'i' } }` sin escapar caracteres especiales.
3. **[BAJO] Ausencia de Índices para Ordenamiento:**  
   La colección `categories` no tiene índice compuesto para ordenamiento alfabético o paginación masiva `{ name: 1 }`.

---

### 2.4 Módulo `products/` (Catálogo de Productos)
* **Archivos evaluados:** `products.controller.ts`, `products.service.ts`, `schemas/product.schema.ts`, `dto/create-product.dto.ts`, `dto/product-pagination.dto.ts`.

#### Hallazgos Técnicos
1. **[ALTO] Inconsistencia entre Schema y DTO (`description`):**  
   En `product.schema.ts`: `@Prop({ required: true }) description: string;`  
   En `create-product.dto.ts`: `@IsOptional() description?: string;`  
   *Impacto:* Si un cliente crea un producto sin descripción, la validación del DTO pasa, pero Mongoose lanza una excepción no controlada `ValidationError` al intentar persistir.
   *Remediación:* Alinear DTO y Schema para que ambos definan `description` como obligatorio o ambos como opcional.
2. **[MEDIO] Validación Débil de Precios:**  
   En `CreateProductDto`, `price` está marcado con `@IsNumber()` pero carece de `@IsPositive()` o `@Min(0)`.
3. **[MEDIO] Indexación Parcial del Catálogo:**  
   Existe un índice de texto `$text` en `name` y `description`. Sin embargo, las consultas más comunes de la aplicación móvil de delivery son por categoría y disponibilidad (`categoryId` + `available` + `price`). La falta de un índice compuesto provoca `COLLSCAN` en MongoDB.
   *Remediación:* Añadir:
   ```typescript
   ProductSchema.index({ categoryId: 1, available: 1, price: 1 });
   ```

---

### 2.5 Módulo `cart/` (Carrito de Compras)
* **Archivos evaluados:** `cart.controller.ts`, `cart.service.ts`, `schemas/cart.schema.ts`, `dto/add-to-cart.dto.ts`.

#### Hallazgos Técnicos
1. **[ALTO] Ausencia de Índice Único Parcial en Carritos Activos:**  
   El schema `cart.schema.ts` no posee un índice único para `{ userId: 1, status: 'ACTIVE' }`.  
   *Impacto:* Si un usuario ejecuta dos solicitudes concurrentes (`POST /cart/add`), se pueden generar dos carritos con estado `ACTIVE` para el mismo usuario, dejando la base de datos en estado inconsistente.
   *Remediación:*
   ```typescript
   CartSchema.index({ userId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'ACTIVE' } });
   ```
2. **[MEDIO] Mutación sobre Documento Poblado (`populate`):**  
   `getActiveCart` retorna un documento con `.populate('items.productId')`. Al llamar a `cart.save()` en `addProduct` o `removeProduct`, Mongoose guarda subdocumentos cuyos campos `productId` ahora contienen el objeto producto completo en lugar del `ObjectId`, pudiendo causar problemas de serialización o escrituras redundantes.
3. **[MEDIO] DTO Inline en Eliminación de Productos:**  
   En `cart.controller.ts`, `removeProduct` recibe `@Body() body: { productId: string }` en lugar de un DTO validado con `ParseMongoIdPipe` o `@IsMongoId()`.
4. **[PENDIENTE] Fase 0.5 Incompleta:**  
   Falta implementar `clearCart()` y exponer `DELETE /cart/clear` tal como estipula `STATUS.md`.

---

### 2.6 Módulo `orders/` (Gestión de Órdenes y Checkout)
* **Archivos evaluados:** `orders.controller.ts`, `orders.service.ts`, `schemas/order.schema.ts`, `dto/create-order.dto.ts`, `dto/update-order-status.dto.ts`.

#### Hallazgos Técnicos
1. **[CRÍTICO] Falta de Atomicidad y Transacciones en Checkout (`createOrder`):**  
   En `orders.service.ts`:
   ```typescript
   // 1. Obtener carrito
   const cart = await this.cartService.getActiveCart(userId);
   // 2. Crear orden
   const order = new this.orderModel({ ... });
   // 3. Modificar estado del carrito
   cart.status = 'CHECKED_OUT';
   await cart.save();
   // 4. Guardar orden
   return order.save();
   ```
   *Impacto:* Si el paso 4 falla (error de red, validación de schema o corte de BD), el carrito queda marcado como `CHECKED_OUT` y el cliente pierde sus productos sin que se haya generado la orden. Si dos llamadas entran a la vez, se generan dos órdenes con el mismo contenido.
   *Remediación:* Utilizar una sesión transaccional de MongoDB (`mongoose.startSession()`):
   ```typescript
   const session = await this.orderModel.db.startSession();
   await session.withTransaction(async () => {
     // Operaciones atómicas
   });
   ```
2. **[ALTO] Precios y Disponibilidad Desactualizados en Checkout:**  
   `createOrder` confía en los precios e ítems guardados en el carrito previamente. Si el precio cambió en el catálogo o el producto se marcó como `available: false` mientras el usuario navegaba, la orden se procesa con datos obsoletos.
   *Remediación:* Validar en tiempo de checkout la disponibilidad actual y el precio vigente de cada producto directamente con `productsService`.
3. **[MEDIO] Ausencia de Paginación en Consultas de Órdenes:**  
   `findMyOrders` y `findAllOrders` realizan `find().populate(...)` sin `limit` ni `skip`. Con miles de órdenes, esto provocará agotamiento de memoria (OOM) y latencias inaceptables.
4. **[MEDIO] Falta de Endpoint `GET /orders/:id` y Cancelación por Cliente:**  
   Los clientes no pueden consultar el detalle de una orden individual ni cancelar pedidos en estado `PENDING`.

---

### 2.7 Módulo `common/` (Transversales y Utilidades)
* **Archivos evaluados:** `filters/http-exception.filter.ts`, `guards/ownership.guard.ts`, `pipes/parse-mongo-id.pipe.ts`, `dto/pagination-query.dto.ts`.

#### Hallazgos Técnicos
1. **[ALTO] Limitación Arquitectónica de `OwnershipGuard`:**  
   `OwnershipGuard` compara `user.userId !== request.params.id`. Esto funciona únicamente cuando el parámetro `:id` representa al usuario (como en `/users/:id`). En recursos como órdenes (`/orders/:id`), carritos o direcciones, `:id` representa la entidad, no el usuario, por lo que el guard bloquearía incorrectamente o requeriría consultar el documento en la base de datos.
   *Remediación:* Implementar guards contextuales o validar el ownership dentro del servicio de cada dominio.
2. **[MEDIO] `HttpExceptionFilter` sin Correlation ID / Request ID:**  
   El filtro formatea el error pero no inyecta un `requestId` para trazabilidad en logs de producción (CloudWatch / Datadog).
3. **[MEDIO] Inexistencia de `TransformInterceptor`:**  
   Las respuestas HTTP no están normalizadas globalmente (`{ success: true, data, meta, timestamp }`).

---

### 2.8 Evaluación del Roadmap (Fases 0 a 7)

```
                            LÍNEA DE TIEMPO DEL ROADMAP
                            
  Fase 0        Fase 1       Fase 2       Fase 3       Fase 4       Fase 5       Fase 6       Fase 7
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Blindar │─▶│ Docker  │─▶│ Calidad │─▶│ Testing │─▶│Seguridad│─▶│ Features│─▶│ Rendim. │─▶│ Deploy  │
│ 7 Mód.  │  │ Pro     │  │ / Logs  │  │ & CI/CD │  │ Avanzada│  │ Core    │  │ & BullMQ│  │ AWS ECS │
└─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
   (Hoy)
```

| Fase | Título | Evaluación Arquitectónica | Riesgos y Recomendaciones |
|---|---|---|---|
| **Fase 0** | Blindar 7 Módulos Existentes | **Esencial.** Base de estabilidad. | Completar antes de introducir nuevas dependencias. Priorizar mitigación de vulnerabilidades críticas. |
| **Fase 1** | Docker Profesional | **Bien planteada.** Migración a Node 20, non-root `node`, multi-stage. | Asegurar que `dumb-init` maneje correctamente señales `SIGTERM`/`SIGINT` para graceful shutdown de conexiones a MongoDB y Redis. |
| **Fase 2** | Calidad Global y Observabilidad | **Crítica.** Winston estructurado + Terminus + Joi. | Configurar `Joi` en `app.module.ts` de forma temprana para evitar que la aplicación levante con variables de entorno faltantes o mal formateadas. |
| **Fase 3** | Testing Completo + CI | **Obligatoria.** Cobertura > 80%, E2E con MongoDB Memory Server. | Asegurar que las pruebas E2E prueben concurrencia y transacciones ACID. |
| **Fase 4** | Seguridad Avanzada | **Relevante.** `express-mongo-sanitize`, audit logging, rate limiting granular. | Aplicar `express-mongo-sanitize` antes del router de NestJS para prevenir inyecciones de operadores NoSQL (`$gt`, `$ne`). |
| **Fase 5** | Features Core (11 módulos nuevos) | **Alta complejidad.** WebSockets, S3, SES, SNS, Repartidores. | Requiere desacoplamiento asíncrono inmediato (colas BullMQ) para evitar bloquear el event-loop con llamadas HTTP a servicios externos de AWS. |
| **Fase 6** | Rendimiento y Escala | **Estratégica.** Redis Caching, BullMQ, Aggregations. | Configurar Redis con política de desalojo `allkeys-lru` y cluster con réplicas de lectura. |
| **Fase 7** | Deploy a AWS (ECS Fargate) | **Óptima.** Relación costo/beneficio superior a EKS para el volumen actual. | Configurar VPC multi-AZ con subnets públicas para ALB y privadas para tareas ECS, MongoDB Atlas y ElastiCache. |

---

## 3. Análisis de Base de Datos y Modelo de Datos (MongoDB / Mongoose)

```
                            DIAGRAMA ENTIDAD-RELACIÓN (LÓGICO)
                            
       ┌────────────────────────┐                   ┌────────────────────────┐
       │         User           │                   │        Category        │
       ├────────────────────────┤                   ├────────────────────────┤
       │ _id: ObjectId          │                   │ _id: ObjectId          │
       │ name: String           │                   │ name: String (Unique)  │
       │ email: String (Unique) │                   │ description: String    │
       │ password: String(Hash) │                   └───────────┬────────────┘
       │ role: Enum (CLIENT,..) │                               │ 1
       └───────────┬────────────┘                               │
                   │ 1                                          │ N
                   │                                ┌───────────▼────────────┐
                   │                                │        Product         │
                   │                                ├────────────────────────┤
                   │                                │ _id: ObjectId          │
                   │                                │ name: String           │
                   │                                │ description: String    │
                   │                                │ price: Number          │
                   │                                │ available: Boolean     │
                   │                                │ categoryId: ObjectId ──┼──┐
                   │                                └───────────┬────────────┘  │
                   │                                            │               │
                   │ 1                                          │ N             │
       ┌───────────┴────────────┐                   ┌───────────▼────────────┐  │
       │     RefreshToken       │                   │       OrderItem        │  │
       ├────────────────────────┤                   ├────────────────────────┤  │
       │ token: String          │                   │ productId: ObjectId ───┼──┘
       │ user: ObjectId ────────┤                   │ name: String           │
       │ expiresAt: Date (TTL)  │                   │ quantity: Number       │
       └────────────────────────┘                   │ price: Number          │
                   │ 1                              └───────────┬────────────┘
                   │                                            │ 1..N
                   │ 1                              ┌───────────▼────────────┐
       ┌───────────┴────────────┐                   │         Order          │
       │          Cart          │                   ├────────────────────────┤
       ├────────────────────────┤                   │ _id: ObjectId          │
       │ _id: ObjectId          │                   │ userId: ObjectId       │
       │ userId: ObjectId       │                   │ items: [OrderItem]     │
       │ items: [CartItem]      │                   │ total: Number          │
       │ total: Number          │                   │ address: String        │
       │ status: ACTIVE/CHECKOUT│                   │ status: OrderStatus    │
       └────────────────────────┘                   └────────────────────────┘
```

### 3.1 Estrategia de Índices (Index Strategy)

La falta de índices adecuados es la causa #1 de degradación en bases de datos NoSQL documentales bajo carga.

| Colección | Índice Recomendado | Tipo | Justificación / Beneficio |
|---|---|---|---|
| `refresh_tokens` | `{ expiresAt: 1 }` | **TTL (`expireAfterSeconds: 0`)** | Eliminación automática de tokens caducados por el motor de MongoDB. |
| `refresh_tokens` | `{ token: 1 }` | **Unique** | Búsqueda O(1) en validación y rotación de sesión. |
| `password_resets`| `{ expiresAt: 1 }` | **TTL (`expireAfterSeconds: 0`)** | Limpieza automática de tokens de reseteo vencidos. |
| `password_resets`| `{ token: 1 }` | **Unique** | Búsqueda rápida y prevención de duplicados. |
| `users` | `{ email: 1 }` | **Unique** | Búsqueda en login y prevención de correos duplicados (ya activo). |
| `products` | `{ name: 'text', description: 'text' }` | **Text Index** | Búsqueda por palabras clave en catálogo (ya activo). |
| `products` | `{ categoryId: 1, available: 1, price: 1 }` | **Compuesto** | Filtro estándar de productos por categoría, disponibilidad y rango de precio. |
| `carts` | `{ userId: 1, status: 1 }` | **Compuesto Parcial Único** | `partialFilterExpression: { status: 'ACTIVE' }`. Evita múltiples carritos activos por usuario. |
| `orders` | `{ userId: 1, createdAt: -1 }` | **Compuesto** | Historial de pedidos del cliente ordenado cronológicamente. |
| `orders` | `{ status: 1, createdAt: -1 }` | **Compuesto** | Panel de administración / Repartidores para listar órdenes activas o en preparación. |

---

### 3.2 Transacciones y Fronteras de Consistencia (ACID Boundaries)

En MongoDB, las operaciones sobre un único documento son atómicas por naturaleza. Sin embargo, los flujos del negocio de Delivery involucran **múltiples documentos y colecciones**:
1. **Flujo de Checkout:** `Cart` (actualización de estado a `CHECKED_OUT`) + `Order` (creación del documento) + `Product` (reserva/decremento de inventario o stock) + `Coupon` (marcaje de uso).
2. **Flujo de Asignación de Pedido:** `Order` (cambio de estado a `PREPARING`/`OUT_FOR_DELIVERY`) + `DeliveryProfile` (asignación de repartidor activo).

#### Implementación Patrón Transaccional en NestJS
```typescript
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class OrdersService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
  ) {}

  async createOrderTransactional(userId: string, address: string) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const cart = await this.cartModel.findOne({ userId, status: 'ACTIVE' }).session(session);
      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('El carrito está vacío');
      }

      // Validar precios actuales y generar orden dentro de la sesión
      const order = new this.orderModel({
        userId,
        items: cart.items,
        total: cart.total,
        address,
        status: OrderStatus.PENDING,
      });
      await order.save({ session });

      cart.status = 'CHECKED_OUT';
      await cart.save({ session });

      await session.commitTransaction();
      return order;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
```

---

## 4. Auditoría de Seguridad y Vulnerabilidades

```
                              SUPERFICIE DE ATAQUE Y DEFENSAS
                              
    Cliente Web / Móvil
           │
           ▼
    ┌──────────────┐     1. WAF: Filtrado IP, Geo-blocking, SQLi/XSS rules
    │   AWS WAF    │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐     2. ALB / HTTPS: TLS 1.3, Certificado ACM
    │   ALB + TLS  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐     3. NestJS Middleware: Helmet, CORS Whitelist, Mongo-Sanitize
    │  Middlewares │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐     4. Global Guards: ThrottlerGuard, JwtAuthGuard, RolesGuard
    │ Global Guards│
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐     5. Core Logic: DTO ValidationPipe (whitelist: true),
    │  Controllers │        Sanitized RegEx, Hashed Tokens, Ownership Verifiers
    └──────────────┘
```

### 4.1 Ciclo de Vida de Tokens y Autenticación

```
                           FLUJO DE AUTENTICACIÓN Y REFRESH SEGURO
                           
  Cliente                           AuthService                        MongoDB
     │                                   │                                │
     │── 1. POST /auth/login ───────────▶│                                │
     │      { email, password }          │── 2. Validar Hash (bcrypt) ───▶│
     │                                   │◀─ Usuario Validado ────────────│
     │                                   │                                │
     │                                   │── 3. Hash SHA256(RefreshToken) │
     │                                   │── 4. Guardar Hash + Exp ──────▶│
     │◀─ 5. { access_token (15m), ───────│                                │
     │        refresh_token (7d) }       │                                │
     │                                   │                                │
     │                                   │                                │
     │── 6. POST /auth/refresh ─────────▶│                                │
     │      { refreshToken }             │── 7. Hash SHA256(Token) ───────▶│
     │                                   │◀─ Registro Encontrado ─────────│
     │                                   │                                │
     │                                   │── 8. Rotación: Invalida Viejo, │
     │                                   │      Genera Nuevo Par ────────▶│
     │◀─ 9. { access_token, ─────────────│                                │
     │        nuevo_refresh_token }      │                                │
```

1. **Access Tokens de Corta Duración:** Configurados a 15 minutos (`expiresIn: '15m'`).
2. **Refresh Tokens Opacos con Hashing:** Generados mediante `crypto.randomBytes(40).toString('hex')`. Almacenados en BD exclusivamente como hash SHA-256 para neutralizar brechas de datos.
3. **Rotación con Detección de Reuso:** Si un token ya utilizado se presenta, se invalidan todos los tokens de la familia del usuario (detección de robo de sesión).
4. **Almacenamiento Seguro en Frontend:** Los tokens deben persistirse en cookies `HttpOnly; Secure; SameSite=Strict` o en almacenamiento cifrado nativo (`SecureStore` en React Native / Flutter).

---

### 4.2 Control de Acceso Basado en Roles (RBAC) y Ownership

* **Estructura de Roles Actual:** `CLIENT`, `ADMIN`, `DELIVERY`.
* **Mecanismo de Guard Global:** `JwtAuthGuard` y `RolesGuard` protegen el 100% de los endpoints por defecto a menos que se use el decorador `@Public()`.
* **Ownership Guard Refactorizado:** No asumir que `:id` siempre es un ID de usuario. La verificación de propiedad debe delegarse a servicios o interceptores que consulten la entidad respectiva (`resource.userId.toString() === requestingUser.userId`).

---

### 4.3 Protección de Datos e Inyección NoSQL

1. **Sanitización de Operadores NoSQL:**  
   Instalar e integrar `express-mongo-sanitize` en `main.ts` para eliminar llaves que comiencen con `$` o `.` en `req.body`, `req.query` y `req.params`.
2. **Escapado Estricto de Expresiones Regulares:**  
   Todas las búsquedas con `$regex` deben sanitizar entradas de texto usando una utilidad común:
   ```typescript
   export function sanitizeRegex(input: string): string {
     return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
   }
   ```
3. **Validación Exhaustiva de DTOs:**  
   Mantener activas las opciones `whitelist: true` y `forbidNonWhitelisted: true` en `ValidationPipe` para bloquear inyección de propiedades maliciosas o atributos no declarados.

---

### 4.4 Rate Limiting, CORS y Cabeceras de Seguridad

1. **Throttling Granular por Tipo de Endpoint:**  
   El límite global actual (10 req/min) es demasiado estricto para navegación de catálogo y demasiado laxo para ataques de fuerza bruta en autenticación.
   * `POST /auth/login` y `POST /auth/refresh`: 5 solicitudes / minuto.
   * `POST /auth/forgot-password`: 3 solicitudes / minuto.
   * Catálogo (`GET /products`, `GET /categories`): 120 solicitudes / minuto.
2. **Configuración de CORS:**  
   Reemplazar `origin: '*'` por un array explícito obtenido desde `ConfigService`:
   ```typescript
   const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS')?.split(',') || [];
   app.enableCors({
     origin: (origin, callback) => {
       if (!origin || allowedOrigins.includes(origin)) {
         callback(null, true);
       } else {
         callback(new ForbiddenException('CORS Bloqueado por Política de Seguridad'));
       }
     },
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
   });
   ```
3. **Cabeceras HTTP (Helmet):**  
   Configurar Content Security Policy (CSP), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` (HSTS).

---

## 5. Escalabilidad, Rendimiento y Confiabilidad

```
                       ARQUITECTURA DE ESCALABILIDAD ASÍNCRONA
                       
   Petición HTTP
   (Crear Pedido)
         │
         ▼
  ┌──────────────┐     Respuesta Inmediata (<100ms)
  │ NestJS API   │ ─────────────────────────────────▶ Cliente HTTP (201 Created)
  └──────┬───────┘
         │
         │ Publicar Trabajo Asíncrono
         ▼
  ┌──────────────┐
  │ Redis Queue  │
  │  (BullMQ)    │
  └──────┬───────┘
         │
         ├───────────────────────────────┬───────────────────────────────┐
         ▼                               ▼                               ▼
  ┌──────────────┐                ┌──────────────┐                ┌──────────────┐
  │ Worker Email │                │ Worker Push  │                │ Worker WS    │
  │   (AWS SES)  │                │  (AWS SNS)   │                │(Redis Adapter│
  └──────────────┘                └──────────────┘                └──────────────┘
```

### 5.1 Desacoplamiento Asíncrono con BullMQ y Redis

Las operaciones de I/O bloqueante o dependientes de APIs externas de terceros no deben ejecutarse dentro del ciclo de vida síncrono de la petición HTTP.

| Proceso | Modelo Actual | Modelo Propuesto (BullMQ) | Justificación |
|---|---|---|---|
| **Envío de Emails (SES)** | Síncrono en endpoint | Cola `mail-queue` con 3 reintentos y backoff exponencial | Evita demoras de 500-1500ms en el response del usuario. |
| **Notificaciones Push (SNS/FCM)** | Planificado síncrono | Cola `notifications-queue` | Disparo concurrente a clientes y repartidores sin bloquear hilos. |
| **Procesamiento de Imágenes** | Síncrono con Multer | Cola `media-processing-queue` (Sharp → WebP/AVIF → S3) | La compresión de imágenes satura la CPU del contenedor API. |
| **Webhooks de Pagos** | Síncrono | Cola `payments-webhook-queue` | Garantía de entrega "at-least-once" y protección ante caídas temporales. |

---

### 5.2 Escalabilidad de WebSockets en Tiempo Real

Para soportar el rastreo de pedidos y repartidores en tiempo real (Fase 5):
1. **Problema de Escalabilidad:** Si la API escala a múltiples contenedores (2 a 10 tareas en ECS Fargate), un socket conectado a la Instancia A no recibirá eventos emitidos desde la Instancia B.
2. **Solución: `@socket.io/redis-adapter`:**
   Todos los contenedores se conectan a un cluster de Redis (ElastiCache). Cuando un repartidor actualiza su posición (`PATCH /delivery/location`), el evento se publica en Redis Pub/Sub y se distribuye a todas las instancias conectadas a la sala del pedido (`room: order_{id}`).
3. **Estructura de Salas (Rooms):**
   * `order_{orderId}`: Cliente que ordenó + Repartidor asignado + Soporte Admin.
   * `riders_available`: Canal de broadcast para ofertas de entrega a repartidores cercanos.

---

### 5.3 Estrategia de Caching Multi-Nivel (Cache-Aside)

```
                            PATRÓN CACHE-ASIDE CON REDIS
                            
   Petición GET /products
           │
           ▼
    ┌──────────────┐      ¿Existe en Caché?
    │ Redis Cache  │ ────(HIT)───────────────────────▶ Retornar Datos (<5ms)
    └──────┬───────┘
           │ (MISS)
           ▼
    ┌──────────────┐
    │ MongoDB Atlas│ ───▶ Guardar en Redis (TTL 10m) ──▶ Retornar Datos (<80ms)
    └──────────────┘
```

* **Categorías:** TTL de 1 hora (`invalidateOn`: mutaciones en `/categories`).
* **Catálogo de Productos:** TTL de 10 minutos (`invalidateOn`: cambios de precio, stock o disponibilidad en `/products`).
* **Sesión / Permisos de Usuario:** TTL de 5 minutos o invalidación instantánea en cambio de rol / logout.

---

### 5.4 Arquitectura en AWS y Despliegue en Producción

```
                                  ARQUITECTURA AWS PRODUCCIÓN
                                  
                                        ┌───────────────┐
                                        │   Route 53    │
                                        └───────┬───────┘
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │  CloudFront   │ ──▶ S3 Bucket (Assets / Media)
                                        └───────┬───────┘
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │  ALB + ACM    │ (SSL/TLS Termination)
                                        │    + WAF      │
                                        └───────┬───────┘
                                                │
                                                ▼ VPC (Multi-AZ)
                        ┌───────────────────────────────────────────────┐
                        │              Subnets Privadas                 │
                        │                                               │
                        │   ┌───────────────────────────────────────┐   │
                        │   │         ECS Fargate Cluster           │   │
                        │   │   ┌──────────────┐ ┌──────────────┐   │   │
                        │   │   │ API Task 1   │ │ API Task 2   │   │   │
                        │   │   └──────┬───────┘ └──────┬───────┘   │   │
                        │   │          └────────┬───────┘           │   │
                        │   │                   │ (Auto-scaling)    │   │
                        │   └───────────────────┼───────────────────┘   │
                        │                       │                       │
                        │          ┌────────────┴───────────┐           │
                        │          ▼                        ▼           │
                        │   ┌──────────────┐         ┌──────────────┐   │
                        │   │ ElastiCache  │         │MongoDB Atlas │   │
                        │   │   (Redis)    │         │(Private Link)│   │
                        │   └──────────────┘         └──────────────┘   │
                        └───────────────────────────────────────────────┘
```

#### Análisis Comparativo de Opciones de Cómputo

| Criterio | AWS ECS Fargate | Kubernetes (AWS EKS) | Monolito EC2 Tradicional |
|---|---|---|---|
| **Complejidad Operativa** | **Baja-Media (Sin gestión de nodos)** | Alta (Gestión de Control Plane, Helm, Ingress) | Media (Mantenimiento de OS, parches manuales) |
| **Costo Base Inicial** | **Bajo (~$15-30/mes por tareas)** | Alto (~$73/mes solo control plane + nodos) | Bajo (~$15-20/mes por t3.small) |
| **Auto-scaling** | Nativo y rápido por métricas CloudWatch | Muy potente (HPA, KEDA) pero complejo | Lento (basado en AMI / Auto Scaling Groups) |
| **Seguridad / Aislamiento** | Contenedores aislados por micro-VM | Aislamiento por Pods / Namespaces | Aislamiento a nivel de VM |
| **Veredicto de Auditoría** | **RECOMENDADO para Delivery** | Overkill para la etapa actual | No recomendado para producción elástica |

---

## 6. Matriz de Acciones Priorizadas y Plan de Remediación

```
                        MATRIZ DE SEVERIDAD DE HALLAZGOS
                        
     Impacto
       ▲
       │  [CRIT-01] Fuga devToken
  ALTO │  [CRIT-02] Escalada Privilegios POST /users
       │  [CRIT-03] No-Atomicidad Checkout
       │
       │                   [HIGH-01] Tokens en Texto Plano
  MEDIO│                   [HIGH-02] Inyección ReDoS Regex
       │                   [HIGH-03] Inconsistencia DTO/Schema
       │
       │                                     [MED-01] Falta TTL Tokens
  BAJO │                                     [MED-02] Ausencia Paginación Órdenes
       │                                     [LOW-01] Swagger no integrado
       └───────────────────────────────────────────────────────────────────►
                                                                    Esfuerzo
```

| ID | Hallazgo / Vulnerabilidad | Severidad | Módulo | Remediacón Técnica Concreta |
|---|---|---|---|---|
| **CRIT-01** | Fuga de `devToken` en respuesta de `forgotPassword` | **CRÍTICO** | `auth` | Eliminar `devToken` del payload retornado en `auth.service.ts` y enviarlo exclusivamente vía logs internos de desarrollo. |
| **CRIT-02** | Escalada de privilegios a `ADMIN` en `POST /users` | **CRÍTICO** | `users` | Quitar `role` de `CreateUserDto` o restringir el endpoint `/users` con `@Roles(Role.ADMIN)`. |
| **CRIT-03** | Condición de carrera y falta de transacciones en Checkout | **CRÍTICO** | `orders`/`cart` | Implementar `mongoose.ClientSession` con `withTransaction()` en `createOrder` para garantizar consistencia ACID. |
| **HIGH-01** | Almacenamiento de Refresh y Reset Tokens en texto plano | **ALTO** | `auth` | Hashear tokens con SHA-256 antes de guardarlos en MongoDB (`crypto.createHash('sha256')`). |
| **HIGH-02** | Vulnerabilidad de DoS por ReDoS en búsquedas regex | **ALTO** | `users`/`categories` | Implementar función `sanitizeRegex()` antes de pasar strings de búsqueda a `$regex`. |
| **HIGH-03** | Inconsistencia DTO vs Schema en `description` de Producto | **ALTO** | `products` | Hacer `description` obligatoria en `CreateProductDto` o marcarla como opcional en `ProductSchema`. |
| **HIGH-04** | Falta de índice único parcial en Carritos Activos | **ALTO** | `cart` | Crear índice compuesto único `{ userId: 1, status: 1 }` con `partialFilterExpression: { status: 'ACTIVE' }`. |
| **MED-01** | Retención perpetua de tokens por falta de índice TTL | **MEDIO** | `auth` | Añadir índice TTL `expiresAfterSeconds: 0` sobre el campo `expiresAt` en `RefreshToken` y `PasswordReset`. |
| **MED-02** | Consultas sin paginación en `findMyOrders` y `findAllOrders` | **MEDIO** | `orders` | Incorporar `PaginationQueryDto` (`limit`, `page`) en los métodos de consulta de órdenes. |
| **MED-03** | Ausencia de validación de precios y stock al crear la orden | **MEDIO** | `orders` | Re-verificar contra catálogo el precio y disponibilidad de cada ítem durante el checkout. |
| **MED-04** | `OwnershipGuard` acoplado exclusivamente a `params.id` de usuario | **MEDIO** | `common` | Desacoplar guard o validar pertenencia a nivel de servicio para entidades como pedidos o carritos. |
| **LOW-01** | Swagger y Documentación OpenAPI no inicializados en `main.ts` | **BAJO** | `main` | Configurar `SwaggerModule.setup('api/docs', app, document)` en `main.ts`. |
| **LOW-02** | Falta de Prefijo Global `api/v1` en `main.ts` | **BAJO** | `main` | Añadir `app.setGlobalPrefix('api/v1')` para versionamiento de API estándar. |
| **LOW-03** | Origen CORS abierto (`*`) | **BAJO** | `main` | Configurar lista blanca de dominios permitidos desde variables de entorno. |

---

## 7. Conclusión y Dictamen de Auditoría

El proyecto **Delivery Backend** cuenta con bases sólidas de diseño modular en NestJS y una máquina de estados clara para los pedidos. Las brechas detectadas son típicas de etapas intermedias de desarrollo y **completamente subsanables mediante el plan de acción estructurado en este informe**.

Ejecutar las mitigaciones de la **Fase 0** (especialmente `CRIT-01`, `CRIT-02`, `CRIT-03`, `HIGH-01` y `HIGH-02`) dejará al sistema en un estado de **alta robustez, seguridad bancaria y preparado para escalar elásticamente en AWS ECS Fargate**.
