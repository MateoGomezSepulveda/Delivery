# DISPATCH — Technology Research Worker

## Working Directory
`c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\.agents\research_worker_1`

## Task Description
Perform an in-depth Technology Research and comparative evaluation for project "Delivery".
Write a comprehensive, structured research report to:
`c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\docs\auditoria\research.md`

## Inputs
- `c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\.agents\ORIGINAL_REQUEST.md`
- `c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\docs\analisis_proyecto_delivery.md`
- `c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\STATUS.md`

## Mandatory Constraints & Acceptance Criteria
- DO NOT CHEAT. All implementations must be genuine.
- UNDER NO CIRCUMSTANCES write or modify source code files (e.g. .ts, .js, .py) outside of `docs/`. All outputs must be documentation/reports.
- MUST contain at least one structured comparative table comparing 2 or more tools/libraries across each key technological pillar.
- Exclusive write ownership: `docs/auditoria/research.md` and your own `.agents/research_worker_1/` directory.

## Report Requirements for `docs/auditoria/research.md`
1. Executive Summary & Technological Objectives for Delivery platform.
2. Pillar 1: Order Traceability & Real-Time Geolocation
   - Open source tools, geospatial query engines, Redis geospatial vs Mongo 2dsphere vs PostGIS, background location tracking protocols.
   - Comparative Table (e.g. Redis Geo vs MongoDB GeoJSON vs PostGIS / Dedicated solutions).
3. Pillar 2: Payment Gateway Integration & Transaction Integrity
   - Stripe vs Mercado Pago vs PayPal vs Open Source alternatives (e.g. Medusa payments / custom webhooks).
   - Webhook security (idempotency keys, signature verification, replay attack prevention).
   - Comparative Table (e.g. Stripe vs Mercado Pago vs Addon Gateways with fees, latency, SDK quality, local market fit).
4. Pillar 3: WebSockets & Real-Time Event Distribution
   - Socket.io vs native WebSockets (ws) vs Server-Sent Events (SSE) vs gRPC streaming.
   - Horizontal scaling via Redis Pub/Sub, Redis Streams, or RabbitMQ/Kafka.
   - Comparative Table (Socket.io + Redis Adapter vs SSE + Redis vs Native WS with benchmarks, memory footprint, reconnection logic).
5. Pillar 4: Background Jobs & Distributed Task Queues
   - BullMQ (Redis) vs RabbitMQ vs AWS SQS/SNS vs Temporal/Kafka.
   - Comparative Table for task scheduling, retries, dead letter queues (DLQ).
6. Recommendation & Implementation Roadmap: Selected toolchain tailored to NestJS + MongoDB + AWS ECS.

## Deliverable & Signoff
Write `docs/auditoria/research.md`, write your `handoff.md` and `progress.md` in your working directory, and notify parent via `send_message`.
