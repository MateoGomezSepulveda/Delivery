# DISPATCH — Architecture & Security Worker

## Working Directory
`c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\.agents\arch_worker_1`

## Task Description
Perform an Architecture and Security audit for project "Delivery".
Write a comprehensive, highly technical and actionable audit report to:
`c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\docs\auditoria\arquitectura.md`

## Inputs
- `c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\.agents\ORIGINAL_REQUEST.md`
- `c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\docs\analisis_proyecto_delivery.md`
- `c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\STATUS.md`
- Existing backend source code in `c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\delivery-backend\src\`

## Mandatory Constraints
- DO NOT CHEAT. All implementations must be genuine.
- UNDER NO CIRCUMSTANCES write or modify source code files (e.g. .ts, .js, .py) outside of `docs/`. All outputs must be documentation/reports.
- Exclusive write ownership: `docs/auditoria/arquitectura.md` and your own `.agents/arch_worker_1/` directory.

## Report Requirements for `docs/auditoria/arquitectura.md`
1. Executive Summary of architectural health.
2. Comprehensive review of the existing 7 modules in `delivery-backend/src/` (Auth, Users, Categories, Products, Cart, Orders, Common) and the proposed roadmap in `docs/analisis_proyecto_delivery.md`.
3. Database & Data Model Analysis (Mongoose schemas, indexing strategy, transaction boundaries, relational integrity).
4. Security & Vulnerability Analysis:
   - Authentication & Token Lifecycle (JWT, refresh tokens, expiration, revocation).
   - Authorization & Access Control (RBAC, ownership guards, endpoint privilege escalation).
   - Data Protection (passwords, PII, injection risks / NoSQL injection, input sanitization).
   - Rate limiting, Throttler, CORS, Security Headers.
5. Scalability, Performance & Reliability Analysis:
   - Synchronous bottlenecks vs asynchronous queues (BullMQ/Redis).
   - Real-time scaling (WebSockets clustering, Redis Adapter).
   - Caching strategies.
   - Cloud Infrastructure & Deployment (ECS Fargate vs alternatives, ALB, CDN, DB scaling).
6. Prioritized Action Matrix (Critical, High, Medium, Low) with concrete technical remediation steps.

## Deliverable & Signoff
Write `docs/auditoria/arquitoria.md` (ensure `docs/auditoria/` exists), write your `handoff.md` and `progress.md` in your working directory, and notify parent via `send_message`.
