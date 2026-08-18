# BRIEFING — 2026-08-18T00:53:35Z

## Mission
Perform comprehensive technology research and comparative evaluation for the "Delivery" platform, focusing on Geolocation & Traceability, Payment Gateways, WebSockets & Real-Time Distribution, and Distributed Task Queues/Background Jobs. Deliver the definitive research report at `docs/auditoria/research.md`.

## 🔒 My Identity
- Archetype: specialist
- Roles: specialist, implementer, qa
- Working directory: c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\.agents\research_worker_1
- Original parent: 09f4c0f3-abd1-49e3-aa20-b4f14c9c05db
- Milestone: Technology Research & Stack Selection Audit

## 🔒 Key Constraints
- UNDER NO CIRCUMSTANCES write or modify source code files (e.g., .ts, .js, .py) outside of `docs/`. All outputs must be documentation / research reports.
- Exclusive deliverable: `docs/auditoria/research.md`.
- MUST contain structured comparative tables evaluating 2 or more tools/libraries (pros, cons, licenses, fit for NestJS/AWS stack) across each pillar.
- Base analysis on `docs/analisis_proyecto_delivery.md`, `STATUS.md`, and `ORIGINAL_REQUEST.md`.

## Current Parent
- Conversation ID: 09f4c0f3-abd1-49e3-aa20-b4f14c9c05db
- Updated: 2026-08-18T00:53:35Z

## Task Summary
- **What to build**: Comprehensive Technology Research Document (`docs/auditoria/research.md`).
- **Success criteria**:
  1. Executive Summary & Tech Selection Objectives.
  2. Section 1: Order Traceability & Real-Time Geolocation (Redis Geo vs Mongo 2dsphere vs PostGIS / Dedicated telemetry, background location updates).
  3. Section 2: Payment Gateways (Stripe vs Mercado Pago vs Open Source payment hubs, webhook security, idempotency).
  4. Section 3: WebSockets & Real-Time Distribution (Socket.io + Redis Adapter vs native WS vs SSE vs WebTransport, connection lifecycle, reconnection).
  5. Section 4: Background Jobs & Message Queues (BullMQ vs RabbitMQ vs AWS SQS/SNS).
  6. Structured comparative tables (>=2 tools/libraries) for each pillar.
  7. Final recommended toolchain & architectural integration roadmap for NestJS + MongoDB + AWS ECS.

## Key Decisions Made
- **Pillar 1 (Geolocation):** Two-tier architecture selected: Redis Geospatial (`GEOADD`/`GEOSEARCH`) as the high-throughput Hot Buffer, MongoDB 2dsphere (`order_trips` GeoJSON `LineString`) for cold historical persistence.
- **Pillar 2 (Payments):** Hybrid Strategy Pattern (Stripe for global credit cards/Connect split + Mercado Pago for LATAM local rails & cash) with strict raw body HMAC-SHA256 verification, 300s timestamp tolerance, and Redis distributed idempotency locks.
- **Pillar 3 (Real-Time):** Socket.io v4.7+ with `@socket.io/redis-adapter` for multi-task ECS horizontal scaling and Connection State Recovery for unstable mobile networks.
- **Pillar 4 (Queues):** BullMQ on AWS ElastiCache Redis (shared instance with DB segregation) for zero-added-cost delayed jobs (order timeouts), retries with exponential backoff + jitter, and DLQ alerting.
- **Zero Code Modification:** 100% compliance with non-modification constraint; deliverable generated exclusively in `docs/auditoria/research.md`.

## Artifact Index
- `c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\docs\auditoria\research.md` — Definitive Technology Research & Stack Evaluation Report (702 lines, 4 comparative tables).
- `c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\.agents\research_worker_1\progress.md` — Progress tracker and liveness heartbeat.
- `c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\.agents\research_worker_1\handoff.md` — Handoff report with 5 mandatory components.
- `c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\.agents\research_worker_1\DISPATCH.md` — Dispatch assignment.
