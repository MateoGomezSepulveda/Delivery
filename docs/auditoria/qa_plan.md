# Plan Integral de Aseguramiento de Calidad y Estrategia de Testing (QA Plan)

**Proyecto:** Delivery Platform (Backend API & Real-time Tracking)  
**Versión del Documento:** 1.0.0  
**Fecha:** 18 de Agosto de 2026  
**Autor:** QA & Test Engineering Specialist Worker (`qa_worker_1`)  
**Estado:** Aprobado / Consultoría de Auditoría  

---

## 1. Resumen Ejecutivo y Filosofía de Calidad

### 1.1 Contexto y Misión de Calidad
La plataforma **Delivery** es un sistema distribuido y transaccional de comercio electrónico y logística en tiempo real, compuesto por una API RESTful desarrollada en **NestJS**, persistencia en **MongoDB (Mongoose)**, capas de caché en **Redis**, comunicación bidireccional mediante **WebSockets (Socket.IO)** y servicios en la nube (**AWS S3, SES, SNS**).

En aplicaciones de delivery donde intervienen transacciones financieras, control de inventario en tiempo real, máquinas de estados de órdenes críticas y geolocalización continua de repartidores, los fallos de software se traducen directamente en pérdidas económicas, fraude, órdenes duplicadas o insatisfacción crítica del usuario.

La misión de este Plan de QA es establecer un marco integral, determinista y automatizado que garantice que cada incremento de software cumpla con los más altos estándares de confiabilidad, seguridad, rendimiento y mantenibilidad antes de llegar a producción.

### 1.2 Filosofía de Ingeniería de Calidad (Quality Engineering Philosophy)
1. **Shift-Left Testing:** La calidad no es una fase tardía posterior al desarrollo; se integra desde el diseño del modelo de datos, la definición de contratos DTO y los tests unitarios previos a cada pull request.
2. **Cero Tolerancia a Flaky Tests:** Las pruebas deben ser deterministas e independientes del orden de ejecución. Se prohíbe el uso de `sleep()` arbitrarios en tests asíncronos; se emplean mecanismos de sincronización basados en eventos y estados.
3. **Aislamiento Total del Estado de Pruebas:** Cada caso de prueba de integración o E2E debe inicializar y limpiar su propio contexto de base de datos sin depender de datos residuales de ejecuciones previas.
4. **Verificación de Comportamiento e Invariantes:** Las pruebas deben validar el cumplimiento de las reglas de negocio e invariantes del dominio (ej. stocks no negativos, unicidad de órdenes, inmutabilidad de estados terminales), no meros detalles de implementación interna.
5. **Defensa en Profundidad:** Cada capa arquitectónica (Pipes, Guards, Interceptors, Services, Repositories, Database Constraints) cuenta con pruebas específicas diseñadas para detectar fallos en su nivel de abstracción.

---

## 2. Estrategia Global de Pruebas y Pirámide de Testing

La estrategia de testing sigue una distribución piramidal equilibrada que maximiza la velocidad de retroalimentación y la cobertura de riesgos:

```
                  / \
                 / E2E \           (10-15%) Flujos de Usuario Completos (Supertest)
                /-------\
               / Integr. \         (20-25%) Controllers + DB + Guards (MongoMemoryServer)
              /-----------\
             /   Unitarias \       (60-70%) Servicios, Pipes, Utilidades, Lógica Pura
            /---------------\
           / Pruebas No Func.\     Carga (k6), Resiliencia, Seguridad (OWASP API Top 10)
          /-------------------\
```

```
+-----------------------------------------------------------------------------------------+
|                                    PIRÁMIDE DE TESTING                                  |
+-------------------+---------------+-----------------------+-----------------------------+
| Nivel             | Volumen       | Herramientas          | Alcance y Objetivo          |
+-------------------+---------------+-----------------------+-----------------------------+
| Unit Testing      | 60% - 70%     | Jest, ts-jest, Mocks  | Lógica de negocio en        |
|                   |               | de Mongoose/NestJS    | Services, Guards, Pipes,    |
|                   |               |                       | Interceptors, Utils.        |
+-------------------+---------------+-----------------------+-----------------------------+
| Integration       | 20% - 25%     | Jest, Supertest,      | Validación de DTOs,         |
| Testing           |               | Mongo Memory Server   | Controllers + Services +    |
|                   |               |                       | Base de datos real en RAM.  |
+-------------------+---------------+-----------------------+-----------------------------+
| End-to-End (E2E)  | 10% - 15%     | Supertest, Socket.IO  | Flujos transaccionales      |
| Testing           |               | Client, Testcontainers| completos (Auth -> Cart ->  |
|                   |               |                       | Order -> Webhook -> Track). |
+-------------------+---------------+-----------------------+-----------------------------+
| No Funcional:     | Periódico /   | k6, Artillery,        | Concurrencia masiva, picos  |
| Carga & Estrés    | Pre-Release   | Autocannon            | de checkout, WebSocket sync.|
+-------------------+---------------+-----------------------+-----------------------------+
| No Funcional:     | CI continuo / | OWASP ZAP, npm audit, | BOLA/IDOR, NoSQL injection, |
| Seguridad         | SonarQube     | Snyk, Helmet checks   | Tampering de tokens JWT.    |
+-------------------+---------------+-----------------------+-----------------------------+
```

### 2.1 Pruebas Unitarias (Unit Tests)
- **Objetivo:** Aislar cada unidad de código (funciones, métodos de servicios) y validar su comportamiento ante entradas válidas, condiciones de borde y excepciones esperadas.
- **Técnica:** Inyección de dependencias mediante `@nestjs/testing` con mocks tipados de modelos de Mongoose (`getModelToken(Schema.name)`), `JwtService`, `ConfigService` y servicios de terceros.
- **Métricas:** Ejecución ultra rápida (< 5 segundos para todo el suite unitario) con 100% de aislamiento de red y disco.

### 2.2 Pruebas de Integración (Integration Tests)
- **Objetivo:** Verificar la correcta interacción entre la capa HTTP (Controllers, ValidationPipes, Guards, Interceptors, Filters) y la capa de datos (Mongoose Schemas, Middlewares de esquema, Índices, Agregaciones).
- **Técnica:** Instanciación de la aplicación NestJS en memoria conectada a una instancia efímera de **MongoDB Memory Server** (`mongodb-memory-server`), permitiendo validar operaciones atómicas de MongoDB (`$inc`, `$set`, `$pull`), índices únicos y populación de referencias (`populate`).

### 2.3 Pruebas End-to-End (E2E Tests)
- **Objetivo:** Validar flujos de negocio completos simular la experiencia real de clientes, administradores y repartidores consumiendo la API y los sockets.
- **Técnica:** Pruebas automatizadas con `Supertest` que invocan endpoints HTTP reales y clientes `socket.io-client` que se conectan a los gateways de WebSockets, verificando la sincronización de estado y la persistencia de datos.

### 2.4 Pruebas de Rendimiento, Carga y Estrés (Performance & Load Testing)
- **Objetivo:** Identificar cuellos de botella, contención de locks en base de datos, fugas de memoria y latencia bajo alta concurrencia.
- **Escenarios Clave:**
  - *Flash Sales:* 1,000 peticiones concurrentes agregando productos al carrito y procediendo al checkout.
  - *WebSocket Storm:* 5,000 conexiones concurrentes suscritas a salas de geolocalización recibiendo 5 actualizaciones/segundo.
  - *Burst Traffic en Pagos:* 500 webhooks asíncronos de pasarelas de pago llegando en una ventana de 10 segundos.
- **Herramienta:** Scripts en `k6` ejecutados contra entornos de staging idénticos a producción.
- **SLAs de Rendimiento:**
  - Latencia percentil 95 (p95) < 150 ms para operaciones de lectura (`GET /products`, `GET /categories`).
  - Latencia percentil 95 (p95) < 250 ms para operaciones de escritura (`POST /cart`, `POST /orders`).
  - Tasa de error HTTP 5xx: 0.00% bajo carga nominal, < 0.1% bajo estrés 2x.

### 2.5 Pruebas de Seguridad y Penetración (Security Testing)
- **Matriz OWASP API Security Top 10 (2023):**
  - **API1:2023 - Broken Object Level Authorization (BOLA / IDOR):** Tests automatizados intentando acceder a pedidos (`GET /orders/:id`) o perfiles (`GET /users/:id`, `PATCH /users/:id`) con tokens de usuarios no propietarios.
  - **API2:2023 - Broken Authentication:** Tests de reutilización de refresh tokens, expiración de tokens JWT, firma con secretos manipulados y fuerza bruta en `/auth/login`.
  - **API3:2023 - Broken Object Property Level Authorization:** Pruebas de Mass Assignment intentando enviar `{ role: "ADMIN" }` en `POST /auth/register` o `PATCH /users/:id`.
  - **API4:2023 - Unrestricted Resource Consumption:** Pruebas de evasión de Throttler/Rate Limit, payloads JSON masivos (> 10MB) y paginaciones abusivas (`limit=100000`).
  - **API5:2023 - Broken Function Level Authorization:** Verificación estricta de que usuarios con rol `CLIENT` o `DELIVERY` reciban `403 Forbidden` al invocar rutas administrativas (`PATCH /orders/:id/status`, `DELETE /categories/:id`).
  - **API8:2023 - Security Misconfiguration:** Verificación de cabeceras seguras (Helmet), políticas CORS restringidas y ausencia de stack traces en respuestas de error de producción.
  - **NoSQL Injection:** Pruebas enviando objetos con operadores de MongoDB (`{"email": {"$ne": null}}`, `{"password": {"$gt": ""}}`) para validar la sanitización de inputs.

---

## 3. Infraestructura de Automatización de Pruebas y Pipeline CI/CD

### 3.1 Stack Tecnológico de Testing

```
+--------------------------+-------------------------------------------------------------+
| Componente               | Herramienta / Paquete                     | Versión         |
+--------------------------+-------------------------------------------------------------+
| Test Runner & Assertion  | Jest + ts-jest                            | ^29.x / ^30.x   |
| HTTP Integration Client  | Supertest + @types/supertest              | ^7.x / ^6.x     |
| In-Memory Database       | mongodb-memory-server                     | ^10.x           |
| Containerized Services   | Testcontainers (Redis & Mongo Replica Set)| ^10.x           |
| WebSocket Testing Client | socket.io-client                          | ^4.x            |
| Mocking Utilities        | @nestjs/testing, jest-mock-extended       | ^11.x           |
| Performance Engine       | k6 (Grafana k6 OSS)                       | Latest          |
| Cobertura de Código      | Istanbul (integrado en Jest)              | Built-in        |
+--------------------------+-------------------------------------------------------------+
```

### 3.2 Estrategia de Aislamiento de Base de Datos y Teardown
Para garantizar pruebas rápidas, confiables y completamente aisladas:

1. **Entorno Local y CI Rápido (`mongodb-memory-server`):**
   - Se crea un binario de MongoDB en RAM por cada suite de pruebas.
   - En el hook `beforeEach()`, se limpian todas las colecciones (`await collection.deleteMany({})`).
   - En el hook `afterAll()`, se cierra la conexión de Mongoose (`await mongoose.disconnect()`) y se detiene el servidor en memoria (`await mongod.stop()`).

2. **Entorno de Transacciones Multi-Documento (`Testcontainers`):**
   - Para flujos que requieren transacciones ACID de MongoDB (como la creación de orden que descuenta stock y cambia el carrito a `CHECKED_OUT`), se levanta un contenedor Docker efímero configurado como Replica Set (`mongo:7` con `--replSet rs0`).

### 3.3 Configuración de Cobertura de Código (Coverage Gates)
En `package.json` / `jest.config.ts`, se configuran umbrales estrictos que provocan el fallo del build si la cobertura no supera el 80%:

```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    },
    "collectCoverageFrom": [
      "src/**/*.ts",
      "!src/main.ts",
      "!src/**/*.module.ts",
      "!src/**/*.dto.ts",
      "!src/**/*.enum.ts",
      "!src/**/*.schema.ts"
    ]
  }
}
```

### 3.4 Pipeline de Integración Continua (GitHub Actions CI Workflow)
El pipeline automatizado en `.github/workflows/ci.yml` ejecuta de forma secuencial y paralela los siguientes jobs:

```yaml
name: Continuous Integration & Quality Gate

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  code-quality:
    name: Lint, Formatting & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js 20.x
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: delivery-backend/package-lock.json
      - name: Install dependencies
        working-directory: delivery-backend
        run: npm ci
      - name: ESLint Check
        working-directory: delivery-backend
        run: npm run lint
      - name: TypeScript Compile Check
        working-directory: delivery-backend
        run: npx tsc --noEmit

  unit-and-integration-tests:
    name: Unit & Integration Tests (with Coverage)
    needs: code-quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js 20.x
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: delivery-backend/package-lock.json
      - name: Install dependencies
        working-directory: delivery-backend
        run: npm ci
      - name: Run Unit Tests with Coverage Gate (>80%)
        working-directory: delivery-backend
        run: npm run test:cov
      - name: Upload Coverage Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: delivery-backend/coverage

  e2e-tests:
    name: End-to-End Integration Tests
    needs: code-quality
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js 20.x
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: delivery-backend/package-lock.json
      - name: Install dependencies
        working-directory: delivery-backend
        run: npm ci
      - name: Run E2E Tests
        working-directory: delivery-backend
        env:
          NODE_ENV: test
          JWT_SECRET: ci_test_jwt_secret_must_be_long_enough_32_characters
          JWT_REFRESH_SECRET: ci_test_refresh_secret_32_characters_long
          REDIS_HOST: localhost
          REDIS_PORT: 6379
        run: npm run test:e2e

  security-audit:
    name: Security Vulnerability Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Audit dependencies
        working-directory: delivery-backend
        run: npm audit --audit-level=high
```

---

## 4. Catálogo Concreto de Casos de Prueba (Structured Test Specifications)

A continuación se especifican **6 casos de prueba detallados y estructurados**, cubriendo los escenarios más críticos y de mayor riesgo del sistema.

---

### Caso de Prueba 01 (TC-01): Rotación de Refresh Tokens y Detección de Replay Attacks

```
========================================================================================
ID: TC-01
TÍTULO: Autenticación, Rotación Segura de Refresh Tokens e Invalidación ante Replay Attack
CATEGORÍA: Seguridad / Autenticación / Integración
MÓDULO: src/auth/ (AuthService, RefreshTokenSchema, AuthController)
PRIORIDAD: P0 (Bloqueante / Seguridad Crítica)
========================================================================================

1. OBJETIVO:
   Verificar que al solicitar un nuevo par de tokens mediante POST /auth/refresh, el 
   refresh_token anterior sea invalidado inmediatamente (rotado), que se emita un nuevo
   par válido, y que un intento de reutilización del refresh_token antiguo (Replay Attack)
   sea rechazado con HTTP 401 Unauthorized y desencadene la revocación de la sesión.

2. PRECONDICIONES:
   - Usuario registrado en base de datos (email: "alice@test.com", password: "Password123!").
   - MongoDB en memoria activo y colecciones 'users' y 'refreshtokens' inicializadas.

3. DATOS DE ENTRADA (INPUT DATA):
   Paso A: POST /api/v1/auth/login
     Body: { "email": "alice@test.com", "password": "Password123!" }
     Respuesta esperada: { "access_token": "JWT_A", "refresh_token": "RT_1" }

   Paso B: POST /api/v1/auth/refresh
     Body: { "refreshToken": "RT_1" }
     Respuesta esperada: { "access_token": "JWT_B", "refresh_token": "RT_2" }

   Paso C (Replay Attack): POST /api/v1/auth/refresh
     Body: { "refreshToken": "RT_1" } (Token ya consumido)

4. PASOS DE EJECUCIÓN:
   1. Enviar petición POST /api/v1/auth/login con credenciales válidas.
   2. Almacenar 'access_token' (JWT_A) y 'refresh_token' (RT_1) recibidos.
   3. Verificar en MongoDB que RT_1 existe en la colección 'refreshtokens' con su 'expiresAt'.
   4. Enviar petición POST /api/v1/auth/refresh enviando { refreshToken: RT_1 }.
   5. Capturar la respuesta con nuevo par (JWT_B, RT_2).
   6. Verificar en MongoDB que RT_1 ya no existe (o su estado fue actualizado a RT_2).
   7. Enviar inmediatamente una segunda petición POST /api/v1/auth/refresh con RT_1 (ataque de replay).
   8. Intentar usar JWT_B en una ruta protegida (GET /api/v1/users/me).

5. RESULTADOS ESPERADOS:
   - Paso 1-2: HTTP 200/201 con tokens válidos no nulos.
   - Paso 4-5: HTTP 200/201 con tokens renovados (JWT_B !== JWT_A, RT_2 !== RT_1).
   - Paso 7: HTTP 401 Unauthorized con mensaje de error "Invalid refresh token" o "Token already used".
   - Paso 8: El nuevo token JWT_B opera correctamente autorizando la petición.

6. ASERCIONES CONCRETAS (Jest / Supertest Code Snippet):
   ```typescript
   // 1. Login inicial
   const loginRes = await request(app.getHttpServer())
     .post('/api/v1/auth/login')
     .send({ email: 'alice@test.com', password: 'Password123!' })
     .expect(201);
   const { access_token: jwtA, refresh_token: rt1 } = loginRes.body;
   expect(rt1).toBeDefined();

   // 2. Primera rotación (válida)
   const refreshRes = await request(app.getHttpServer())
     .post('/api/v1/auth/refresh')
     .send({ refreshToken: rt1 })
     .expect(200);
   const { access_token: jwtB, refresh_token: rt2 } = refreshRes.body;
   expect(rt2).not.toEqual(rt1);
   expect(jwtB).not.toEqual(jwtA);

   // 3. Intento de reuso de RT_1 (Replay Attack)
   const replayRes = await request(app.getHttpServer())
     .post('/api/v1/auth/refresh')
     .send({ refreshToken: rt1 })
     .expect(401);
   expect(replayRes.body.message).toMatch(/invalid|expired/i);
   ```

7. CASOS DE BORDE Y MITIGACIÓN DE RIESGOS:
   - Refresh token expirado por tiempo (> 7 días): Debe retornar 401 y purgar el documento de MongoDB.
   - Refresh token malformado o cadena vacía: ValidationPipe debe retornar 400 Bad Request.
   - Usuario eliminado de la base de datos tras emitir el refresh token: Debe retornar 401 "User no longer exists".
```

---

### Caso de Prueba 02 (TC-02): Modificación Concurrente del Carrito y Control de Condiciones de Carrera (Race Conditions)

```
========================================================================================
ID: TC-02
TÍTULO: Modificación Concurrente del Carrito y Prevención de Sobrevenda bajo Stock Límite
CATEGORÍA: Integración / Concurrencia / Lógica de Negocio
MÓDULO: src/cart/ y src/products/ (CartService, ProductsService)
PRIORIDAD: P0 (Integridad de Datos / Pérdida Financiera)
========================================================================================

1. OBJETIVO:
   Validar que múltiples peticiones concurrentes agregando unidades de un producto al
   mismo carrito no provoquen inconsistencias en las cantidades acumuladas ni permitan
   superar el stock disponible ni corromper el cálculo de 'total' del carrito.

2. PRECONDICIONES:
   - Usuario autenticado con token JWT (User ID: "user_cart_1").
   - Producto "Hamburguesa Doble" con stock = 5, precio unitario = $10.00, disponible = true.
   - Carrito activo inicial vacío.

3. DATOS DE ENTRADA (INPUT DATA):
   10 peticiones HTTP concurrentes (Promise.all) ejecutadas simultáneamente:
   Petición: POST /api/v1/cart
   Headers: { "Authorization": "Bearer <JWT_USER_1>" }
   Body: { "productId": "<MONGO_ID_HAMBURGUESA>", "quantity": 1 }

4. PASOS DE EJECUCIÓN:
   1. Crear producto con stock = 5 y precio = 10.00 en MongoDB.
   2. Lanzar simultáneamente 10 promesas de petición `POST /api/v1/cart` con `quantity: 1`.
   3. Recolectar las respuestas de las 10 peticiones (`Promise.allSettled`).
   4. Consultar el estado final del carrito mediante `GET /api/v1/cart`.
   5. Verificar la cantidad final del producto en el carrito y el monto total calculado.

5. RESULTADOS ESPERADOS:
   - Si no hay validación de stock en cart (o el stock es validado atómicamente):
     - El carrito debe consolidar un único elemento en el array `items` con `productId`.
     - La cantidad total `quantity` no debe perder incrementos por lecturas sucias (dirty reads).
     - El total del carrito debe ser exactamente `items[0].quantity * 10.00`.
   - Si se supera el límite de stock disponible (stock = 5):
     - Las peticiones excedentes deben retornar HTTP 400/409 con error "Stock insuficiente".
     - El carrito final debe contener exactamente quantity = 5 y total = 50.00.

6. ASERCIONES CONCRETAS (Jest / Supertest Code Snippet):
   ```typescript
   const promises = Array.from({ length: 5 }).map(() =>
     request(app.getHttpServer())
       .post('/api/v1/cart')
       .set('Authorization', `Bearer ${clientToken}`)
       .send({ productId: burgerProduct._id.toString(), quantity: 1 })
   );

   const results = await Promise.all(promises);
   results.forEach(res => expect(res.status).toBe(201));

   // Obtener estado consolidado
   const cartRes = await request(app.getHttpServer())
     .get('/api/v1/cart')
     .set('Authorization', `Bearer ${clientToken}`)
     .expect(200);

   expect(cartRes.body.items).toHaveLength(1);
   expect(cartRes.body.items[0].quantity).toBe(5);
   expect(cartRes.body.total).toBe(50.00);
   ```

7. CASOS DE BORDE Y MITIGACIÓN DE RIESGOS:
   - Envío de `quantity: 0` o `quantity: -3`: `AddToCartDto` con `@Min(1)` debe rechazar con HTTP 400.
   - Producto con `available: false`: Debe retornar HTTP 404/400 "Product not available".
   - ID de producto inexistente: Debe retornar HTTP 404 "Product not found".
```

---

### Caso de Prueba 03 (TC-03): Máquina de Estados del Pedido y Límites de Cancelación por el Cliente

```
========================================================================================
ID: TC-03
TÍTULO: Transiciones de la Máquina de Estados de Órdenes y Límites de Cancelación por Cliente
CATEGORÍA: Lógica de Dominio / Integración / Máquina de Estados
MÓDULO: src/orders/ (OrdersService, OrderStatusEnum, OrdersController)
PRIORIDAD: P1 (Regla de Negocio Crítica)
========================================================================================

1. OBJETIVO:
   Validar que el ciclo de vida del pedido siga estrictamente la máquina de estados 
   permitida: PENDING -> CONFIRMED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED.
   Validar que el cliente solo pueda cancelar su pedido cuando está en estado PENDING,
   y que cualquier intento de transición ilegal (ej. PENDING -> DELIVERED o 
   PREPARING -> CANCELLED por el cliente) sea rechazado con HTTP 400 Bad Request.

2. PRECONDICIONES:
   - Usuario Cliente autenticado ("client_user_1").
   - Usuario Administrador autenticado ("admin_user").
   - Carrito activo con 2 productos listo para checkout.

3. DATOS DE ENTRADA Y MATRIZ DE TRANSICIÓN:
   Matriz válida:
   - PENDING -> CONFIRMED | CANCELLED
   - CONFIRMED -> PREPARING | CANCELLED
   - PREPARING -> OUT_FOR_DELIVERY
   - OUT_FOR_DELIVERY -> DELIVERED
   - DELIVERED -> (Ninguna / Terminal)
   - CANCELLED -> (Ninguna / Terminal)

4. PASOS DE EJECUCIÓN:
   1. Cliente realiza checkout: `POST /api/v1/orders` con `{ "address": "Calle 123 #45-67" }`.
   2. Verificar que la orden se crea con estado `PENDING` y el carrito pasa a `CHECKED_OUT`.
   3. Intentar transición ilegal como Admin: `PATCH /api/v1/orders/:id/status` con `{ "status": "DELIVERED" }`.
   4. Verificar rechazo HTTP 400 (`Cannot change status from PENDING to DELIVERED`).
   5. Admin actualiza estado a `CONFIRMED`, luego a `PREPARING`.
   6. Cliente intenta cancelar su pedido en estado `PREPARING`: `PATCH /api/v1/orders/:id/cancel`.
   7. Verificar rechazo HTTP 400/403 (`No es posible cancelar un pedido en preparación`).
   8. Admin avanza a `OUT_FOR_DELIVERY` y finalmente a `DELIVERED`.
   9. Intentar modificar una orden ya entregada `DELIVERED` a `CANCELLED`.
   10. Verificar rechazo HTTP 400 (Estado terminal).

5. RESULTADOS ESPERADOS:
   - Creación exitosa en PENDING con address y total correctos.
   - Las transiciones fuera del grafo permitido lanzan `BadRequestException` con código 400.
   - Los estados terminales (`DELIVERED`, `CANCELLED`) quedan congelados para siempre.

6. ASERCIONES CONCRETAS (Jest / Supertest Code Snippet):
   ```typescript
   // 1. Crear Orden
   const orderRes = await request(app.getHttpServer())
     .post('/api/v1/orders')
     .set('Authorization', `Bearer ${clientToken}`)
     .send({ address: 'Av Principal 456' })
     .expect(201);
   const orderId = orderRes.body._id;
   expect(orderRes.body.status).toBe('PENDING');

   // 2. Transición inválida directa (PENDING -> DELIVERED)
   const invalidTransRes = await request(app.getHttpServer())
     .patch(`/api/v1/orders/${orderId}/status`)
     .set('Authorization', `Bearer ${adminToken}`)
     .send({ status: 'DELIVERED' })
     .expect(400);
   expect(invalidTransRes.body.message).toContain('Cannot change status from PENDING to DELIVERED');

   // 3. Transición legal (PENDING -> CONFIRMED -> PREPARING)
   await request(app.getHttpServer())
     .patch(`/api/v1/orders/${orderId}/status`)
     .set('Authorization', `Bearer ${adminToken}`)
     .send({ status: 'CONFIRMED' })
     .expect(200);

   await request(app.getHttpServer())
     .patch(`/api/v1/orders/${orderId}/status`)
     .set('Authorization', `Bearer ${adminToken}`)
     .send({ status: 'PREPARING' })
     .expect(200);

   // 4. Intento de cancelación por cliente en PREPARING
   const clientCancelRes = await request(app.getHttpServer())
     .patch(`/api/v1/orders/${orderId}/status`)
     .set('Authorization', `Bearer ${clientToken}`)
     .send({ status: 'CANCELLED' })
     .expect(403); // O 400 según Ownership/Role Policy
   ```

7. CASOS DE BORDE Y MITIGACIÓN DE RIESGOS:
   - Intentar crear una orden con carrito vacío: Debe fallar inmediatamente con HTTP 400 "Cart is empty".
   - ID de orden con formato hexadecimal inválido: `ParseMongoIdPipe` debe interceptar y retornar HTTP 400 antes de consultar la base de datos.
```

---

### Caso de Prueba 04 (TC-04): Protección de Autorización a Nivel de Objeto (BOLA / IDOR) con OwnershipGuard

```
========================================================================================
ID: TC-04
TÍTULO: Prevención de Broken Object Level Authorization (IDOR / BOLA) mediante OwnershipGuard
CATEGORÍA: Seguridad / Autorización / OWASP API Security
MÓDULO: src/common/guards/ownership.guard.ts, src/users/, src/orders/
PRIORIDAD: P0 (Vulnerabilidad de Seguridad Crítica)
========================================================================================

1. OBJETIVO:
   Verificar que un usuario autenticado legítimo ("Attacker User B") no pueda leer,
   modificar ni eliminar información sensible o recursos pertenecientes a otro usuario
   ("Victim User A") mediante la manipulación del parámetro `:id` en la URL.

2. PRECONDICIONES:
   - Usuario Víctima ("user_A", ID: "64a111111111111111111111", rol: CLIENT).
   - Usuario Atacante ("user_B", ID: "64a222222222222222222222", rol: CLIENT).
   - Usuario Administrador ("admin", ID: "64a333333333333333333333", rol: ADMIN).
   - Orden perteneciente a Usuario A (ID: "64a999999999999999999999").

3. DATOS DE ENTRADA (INPUT DATA):
   Petición 1: PATCH /api/v1/users/64a111111111111111111111 (Perfil de Víctima)
     Headers: { "Authorization": "Bearer <JWT_USER_B>" }
     Body: { "name": "Nombre Modificado por Atacante" }

   Petición 2: GET /api/v1/orders/64a999999999999999999999 (Orden de Víctima)
     Headers: { "Authorization": "Bearer <JWT_USER_B>" }

   Petición 3: PATCH /api/v1/users/64a111111111111111111111 (Mismo perfil por Admin)
     Headers: { "Authorization": "Bearer <JWT_ADMIN>" }
     Body: { "name": "Nombre Actualizado por Admin" }

4. PASOS DE EJECUCIÓN:
   1. Autenticar a Usuario B y obtener su token JWT.
   2. Ejecutar Petición 1 intentando modificar los datos de Usuario A.
   3. Evaluar la respuesta del servidor y validar que `OwnershipGuard` intercepta la petición.
   4. Ejecutar Petición 2 intentando leer la orden privada de Usuario A con el token de Usuario B.
   5. Evaluar la respuesta HTTP.
   6. Autenticar al Usuario Admin y ejecutar Petición 3 modificando el perfil de Usuario A.
   7. Verificar que el rol ADMIN tiene excepción explícita de bypass en `OwnershipGuard`.

5. RESULTADOS ESPERADOS:
   - Petición 1 (Atacante a perfil ajeno): HTTP 403 Forbidden ("No tienes permiso para modificar la cuenta de otra persona").
   - Petición 2 (Atacante a orden ajena): HTTP 403 Forbidden o 404 Not Found (sin revelar existencia).
   - Petición 3 (Admin a perfil ajeno): HTTP 200 OK con los datos modificados.

6. ASERCIONES CONCRETAS (Jest / Supertest Code Snippet):
   ```typescript
   // Atacante intenta modificar víctima
   const bOlaAttackRes = await request(app.getHttpServer())
     .patch(`/api/v1/users/${victimUser._id}`)
     .set('Authorization', `Bearer ${attackerToken}`)
     .send({ name: 'Hacked Name' })
     .expect(403);

   expect(bOlaAttackRes.body.message).toMatch(/permiso|forbidden/i);

   // Verificar que en base de datos el nombre de la víctima NO cambió
   const freshVictim = await userModel.findById(victimUser._id);
   expect(freshVictim.name).toBe('Victim Original Name');

   // Admin sí puede actualizar
   const adminRes = await request(app.getHttpServer())
     .patch(`/api/v1/users/${victimUser._id}`)
     .set('Authorization', `Bearer ${adminToken}`)
     .send({ name: 'Admin Updated Name' })
     .expect(200);

   expect(adminRes.body.name).toBe('Admin Updated Name');
   ```

7. CASOS DE BORDE Y MITIGACIÓN DE RIESGOS:
   - Petición sin header Authorization: `JwtAuthGuard` debe responder HTTP 401 antes de llegar a `OwnershipGuard`.
   - Modificación del propio campo `role`: Un usuario normal no debe poder elevar sus privilegios (`role: ADMIN`), lo cual debe ser filtrado en el DTO o en el servicio.
```

---

### Caso de Prueba 05 (TC-05): Idempotencia y Reconciliación Asíncrona de Webhooks de Pago

```
========================================================================================
ID: TC-05
TÍTULO: Idempotencia de Webhooks de Pasarela de Pagos y Reconciliación de Órdenes
CATEGORÍA: Integración / Pagos / Resiliencia y Concurrencia
MÓDULO: src/payments/ o src/orders/ (WebhookController, PaymentService)
PRIORIDAD: P0 (Integridad Financiera / Cero Cobros Duplicados)
========================================================================================

1. OBJETIVO:
   Garantizar que el endpoint de recepción de webhooks de pago (`POST /api/v1/payments/webhook`)
   sea estrictamente idempotente: procesar un evento de pago exitoso exactamente una vez,
   manejar reintentos automáticos del proveedor de pagos (Stripe/MercadoPago/Wompi) sin
   duplicar órdenes ni generar transacciones erróneas, y validar la firma criptográfica.

2. PRECONDICIONES:
   - Orden creada en base de datos con `status: PENDING` y `paymentStatus: UNPAID`.
   - Clave secreta de firma de webhook configurada en `ConfigService` (`WEBHOOK_SIGNING_SECRET`).
   - Colección `payment_events` con índice único en `eventId` para control de idempotencia.

3. DATOS DE ENTRADA (INPUT DATA):
   Payload del Webhook:
   ```json
   {
     "id": "evt_test_payment_123456789",
     "type": "payment_intent.succeeded",
     "data": {
       "object": {
         "id": "pi_987654321",
         "amount": 4500,
         "currency": "usd",
         "metadata": {
           "orderId": "<ORDER_MONGO_ID>"
         }
       }
     }
   }
   ```
   Headers:
   - `stripe-signature`: `t=1723980000,v1=valid_hmac_sha256_hash`

4. PASOS DE EJECUCIÓN:
   1. Enviar petición POST al webhook con firma válida y payload de evento nuevo.
   2. Verificar respuesta HTTP 200 OK y que el estado de la orden cambia a `CONFIRMED`.
   3. Simular reintento de la pasarela enviando exactamente la misma petición (mismo `eventId` y payload) 3 veces consecutivas.
   4. Simular petición con firma alterada/inválida (`stripe-signature: invalid_hash`).
   5. Simular petición con payload corrupto o `orderId` inexistente.

5. RESULTADOS ESPERADOS:
   - Paso 1-2: HTTP 200 OK, orden actualizada a `CONFIRMED`, evento registrado en `payment_events`.
   - Paso 3 (Reintentos idempotentes): HTTP 200 OK en todas las peticiones, pero la lógica de negocio interna se ejecuta solo una vez (sin duplicar notificaciones ni transiciones redundantes).
   - Paso 4 (Firma inválida): HTTP 400/401 Unauthorized / Bad Request ("Invalid signature"), orden sin alteraciones.
   - Paso 5 (OrderId inexistente): HTTP 404/422 con registro de alerta en logs estructurados.

6. ASERCIONES CONCRETAS (Jest / Supertest Code Snippet):
   ```typescript
   const payload = {
     id: 'evt_test_unique_001',
     type: 'payment_intent.succeeded',
     data: { object: { metadata: { orderId: testOrder._id.toString() } } },
   };
   const validSignature = generateValidHmacSignature(payload, webhookSecret);

   // 1. Primer envío (procesamiento real)
   const firstRes = await request(app.getHttpServer())
     .post('/api/v1/payments/webhook')
     .set('stripe-signature', validSignature)
     .send(payload)
     .expect(200);
   expect(firstRes.body.received).toBe(true);

   let updatedOrder = await orderModel.findById(testOrder._id);
   expect(updatedOrder.status).toBe('CONFIRMED');

   // 2. Reintento idéntico (Idempotencia)
   const retryRes = await request(app.getHttpServer())
     .post('/api/v1/payments/webhook')
     .set('stripe-signature', validSignature)
     .send(payload)
     .expect(200);
   expect(retryRes.body.duplicateHandled).toBe(true);

   // 3. Firma manipulada
   await request(app.getHttpServer())
     .post('/api/v1/payments/webhook')
     .set('stripe-signature', 'tampered_bad_signature')
     .send(payload)
     .expect(400);
   ```

7. CASOS DE BORDE Y MITIGACIÓN DE RIESGOS:
   - Desfase temporal en timestamp de la firma (Ataques de replay antiguos > 5 minutos): El validador debe rechazar firmas con `t` fuera de tolerancia.
   - Pago recibido para una orden que ya fue `CANCELLED` previamente: El webhook debe marcar la orden en estado `PAYMENT_REVIEW` y notificar al equipo de soporte para reembolso.
```

---

### Caso de Prueba 06 (TC-06): Streaming de Ubicación en Tiempo Real por WebSockets y Resiliencia ante Desconexión

```
========================================================================================
ID: TC-06
TÍTULO: Streaming de Ubicación de Repartidor vía WebSockets, Aislamiento de Salas y Reconexión
CATEGORÍA: Tiempo Real / WebSockets / E2E
MÓDULO: src/events/ (EventsGateway, DeliveryTrackingService)
PRIORIDAD: P1 (Experiencia de Usuario Core / Tiempo Real)
========================================================================================

1. OBJETIVO:
   Verificar que un repartidor autenticado pueda emitir coordenadas GPS en tiempo real
   (`driver:location_update`), que únicamente los clientes suscritos a la sala específica
   de la orden (`order:room:<orderId>`) reciban los eventos de tracking con baja latencia,
   y que tras una caída de red y reconexión el flujo se restablezca sin pérdida de estado.

2. PRECONDICIONES:
   - Servidor NestJS con WebSocket Gateway habilitado en puerto de test.
   - Orden en estado `OUT_FOR_DELIVERY` asignada al repartidor "driver_1" para el cliente "client_1".
   - Token JWT de repartidor y token JWT de cliente.

3. DATOS DE ENTRADA (INPUT DATA):
   - Conexión Socket 1 (Cliente): `io('http://localhost:PORT', { auth: { token: JWT_CLIENT } })`
   - Conexión Socket 2 (Repartidor): `io('http://localhost:PORT', { auth: { token: JWT_DRIVER } })`
   - Conexión Socket 3 (Cliente Espía no autorizado): `io('http://localhost:PORT', { auth: { token: JWT_CLIENT_SPY } })`
   - Evento de suscripción: `socket.emit('join:order_tracking', { orderId: '<ORDER_ID>' })`
   - Evento de ubicación: `socket.emit('driver:update_location', { orderId: '<ORDER_ID>', lat: 4.6097, lng: -74.0817, heading: 90 })`

4. PASOS DE EJECUCIÓN:
   1. Conectar Socket 1 (Cliente legítimo) y Socket 2 (Repartidor) con sus respectivos JWTs.
   2. Socket 1 emite `join:order_tracking`. Verificar que el servidor autoriza y une el socket a la sala `order:<orderId>`.
   3. Conectar Socket 3 (Cliente ajeno) e intentar unirse a `join:order_tracking` con el mismo `orderId`.
   4. Verificar que Socket 3 recibe `403 Unauthorized Room Access` o es ignorado.
   5. Socket 2 (Repartidor) emite `driver:update_location`.
   6. Verificar que Socket 1 recibe el evento `order:location_changed` con las coordenadas exactas.
   7. Desconectar abruptamente Socket 1 (`socket.disconnect()`), esperar 2 segundos y reconectar.
   8. Socket 1 vuelve a unirse a la sala y recibe la última posición conocida almacenada en caché Redis.

5. RESULTADOS ESPERADOS:
   - Conexión segura autenticada mediante handshake JWT.
   - Aislamiento estricto de salas: solo el cliente dueño de la orden y el admin reciben los broadcasts.
   - Latencia de entrega de socket a socket < 50 ms.
   - Tolerancia a reconexión sin caída del servidor.

6. ASERCIONES CONCRETAS (Jest / Socket.io-client Code Snippet):
   ```typescript
   // Configuración de clientes
   const clientSocket = io(`http://localhost:${port}`, { auth: { token: clientToken } });
   const driverSocket = io(`http://localhost:${port}`, { auth: { token: driverToken } });

   await Promise.all([
     new Promise(resolve => clientSocket.on('connect', resolve)),
     new Promise(resolve => driverSocket.on('connect', resolve)),
   ]);

   // Cliente se une a la orden
   clientSocket.emit('join:order_tracking', { orderId: order._id.toString() });

   // Preparar escucha en cliente legítimo
   const locationPromise = new Promise((resolve) => {
     clientSocket.on('order:location_changed', (data) => {
       expect(data.lat).toBe(4.6097);
       expect(data.lng).toBe(-74.0817);
       resolve(data);
     });
   });

   // Repartidor transmite ubicación
   driverSocket.emit('driver:update_location', {
     orderId: order._id.toString(),
     lat: 4.6097,
     lng: -74.0817,
     heading: 90,
   });

   await locationPromise;
   clientSocket.close();
   driverSocket.close();
   ```

7. CASOS DE BORDE Y MITIGACIÓN DE RIESGOS:
   - Envío de coordenadas fuera de rango (ej. `lat: 150.0`, `lng: -200.0`): El gateway debe descartar paquetes inválidos mediante validación de schema (class-validator en WebSockets).
   - Fuga de memoria por sockets huérfanos: Implementar limpieza automática de salas en el hook `handleDisconnect`.
```

---

## 5. Matriz de Severidad y Gestión de Defectos (Defect Classification Matrix)

Para clasificar y gestionar las incidencias encontradas durante la ejecución de pruebas y en producción, se establece el siguiente estándar:

```
+----------------------------------------------------------------------------------------------------+
|                                     MATRIZ DE SEVERIDAD DE DEFECTOS                                |
+----------+---------------+------------------------------------------------------+------------------+
| Nivel    | Severidad     | Criterios y Ejemplos de Impacto                      | SLA de Respuesta |
+----------+---------------+------------------------------------------------------+------------------+
| P0       | Blocker /     | - Vulnerabilidad de seguridad crítica (BOLA, RCE).   | < 4 Horas        |
|          | Crítico       | - Caída total de la API o base de datos.             | (Hotfix Inmediato|
|          |               | - Corrupción de datos en checkout / pagos duplicados.|                  |
|          |               | - Bloqueo total del login o registro de usuarios.    |                  |
+----------+---------------+------------------------------------------------------+------------------+
| P1       | High / Alto   | - Fallo en feature principal sin workaround posible. | < 24 Horas       |
|          |               | - Máquina de estados bloqueada en pedidos activos.   | (Sprint Actual)  |
|          |               | - Desconexión sistemática de WebSockets de tracking. |                  |
|          |               | - Cálculos erróneos de totales o descuentos.         |                  |
+----------+---------------+------------------------------------------------------+------------------+
| P2       | Medium /      | - Fallo en funcionalidad secundaria con workaround.  | < 3 Días         |
|          | Medio         | - Inconsistencia en filtros de paginación o búsqueda.| (Próximo Sprint) |
|          |               | - Tiempos de respuesta lentos en endpoints no core.  |                  |
|          |               | - Errores de validación con mensajes confusos.       |                  |
+----------+---------------+------------------------------------------------------+------------------+
| P3       | Low / Bajo    | - Errores cosméticos en Swagger / OpenAPI docs.      | Backlog General  |
|          |               | - Logs con formato no estándar sin impacto funcional.|                  |
|          |               | - Inconsistencias menores en ordenamiento de listas. |                  |
+----------+---------------+------------------------------------------------------+------------------+
```

### 5.1 Ciclo de Vida de un Defecto (Defect Workflow)
```
  [ NUEVO ] ---> [ TRIAGE / ASIGNADO ] ---> [ EN DESARROLLO ]
                                                   |
  [ CERRADO ] <--- [ QA VERIFICADO ] <--- [ READY FOR QA (Staging) ]
       ^                  |
       |                  +---> [ REABIERTO (Fallo de Test) ]
       +-----------------------------------+
```

1. **Reporte Estandarizado:** Todo defecto debe incluir: ID, Título, Severidad, Módulo, Precondiciones, Pasos de Reproducción, Payload de entrada, Comportamiento Observado vs Esperado, y Logs/Capturas.
2. **Análisis de Causa Raíz (RCA):** Para todo defecto P0/P1 resuelto, se exige un documento de RCA y la adición obligatoria de una prueba unitaria o de integración de regresión que reproduzca el fallo antes de darlo por cerrado.

---

## 6. Definición de Quality Gates para Promoción a Producción

Para autorizar el paso de una versión a los entornos de Staging y Producción, deben cumplirse de manera irrestricta los siguientes **5 Quality Gates**:

```
+----------------------------------------------------------------------------------------------------+
|                                    QUALITY GATES DE DESPLIEGUE                                     |
+--------+----------------------------+------------------------------------------+-------------------+
| Gate # | Dimensión                  | Criterio de Aprobación                   | Bloqueante (Y/N)  |
+--------+----------------------------+------------------------------------------+-------------------+
| QG-1   | Calidad de Código Estática | 0 Errores de ESLint.                     | SÍ                |
|        |                            | 0 Errores de compilación TypeScript.     |                   |
|        |                            | Formateo 100% compliant con Prettier.    |                   |
+--------+----------------------------+------------------------------------------+-------------------+
| QG-2   | Cobertura Automatizada     | >= 80% Cobertura de Líneas (Lines).      | SÍ                |
|        |                            | >= 80% Cobertura de Ramas (Branches).    |                   |
|        |                            | >= 80% Cobertura de Funciones.           |                   |
|        |                            | 100% de tests unitarios/e2e aprobados.   |                   |
+--------+----------------------------+------------------------------------------+-------------------+
| QG-3   | Seguridad y Vulnerabilidad | 0 Vulnerabilidades High / Critical (npm).| SÍ                |
|        |                            | Tests BOLA / IDOR 100% aprobados.        |                   |
|        |                            | Headers Helmet y CORS verificados.       |                   |
+--------+----------------------------+------------------------------------------+-------------------+
| QG-4   | Rendimiento y Resiliencia  | p95 < 150ms en lecturas bajo carga.      | SÍ                |
|        |                            | p95 < 250ms en checkout bajo carga.      |                   |
|        |                            | 0 Fugas de memoria en prueba de 1 hora.  |                   |
+--------+----------------------------+------------------------------------------+-------------------+
| QG-5   | Observabilidad & Operación | Health checks (/health y /ready) verdes. | SÍ                |
|        |                            | Logs estructurados JSON con RequestId.   |                   |
|        |                            | Plan de Rollback automatizado probado.   |                   |
+--------+----------------------------+------------------------------------------+-------------------+
```

---

## 7. Conclusión y Hoja de Ruta de Implementación de QA

El presente plan de calidad proporciona una guía sólida, ejecutable y medible para blindar el backend de la plataforma Delivery. Su adopción garantiza la estabilidad operativa requerida para escalar el negocio, evitando regresiones silenciosas, fallos de seguridad y degradación del rendimiento.

### Hoja de Ruta Inmediata para el Equipo de Desarrollo:
1. **Fase Inmediata (Fase 0.5 - 0.7):** Completar los suites unitarios de `cart.service.spec.ts`, `orders.service.spec.ts` y `ownership.guard.spec.ts`.
2. **Fase de Consolidación (Fase 3):** Configurar `mongodb-memory-server` e implementar el pipeline de CI en GitHub Actions con los umbrales de cobertura del 80%.
3. **Fase E2E & WebSockets (Fase 5):** Implementar las pruebas de integración continua para el gateway de WebSockets y los webhooks de pagos.
