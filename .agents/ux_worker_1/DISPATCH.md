# DISPATCH — Product & UI/UX Audit Worker

## Working Directory
`c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\.agents\ux_worker_1`

## Task Description
Perform an exhaustive Product and UI/UX Audit for project "Delivery".
Write a comprehensive, design-system-backed audit and recommendations report to:
`c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\docs\auditoria\ux_audit.md`

## Inputs
- `c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\.agents\ORIGINAL_REQUEST.md`
- `c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\docs\analisis_proyecto_delivery.md`
- `c:\Users\mateo\OneDrive\Documentos\Proyectos\Delivery\STATUS.md`
- UI/UX Design System Skill: `C:\Users\mateo\.gemini\config\skills\ui-ux-pro-max\SKILL.md`

## Mandatory Constraints & Acceptance Criteria
- DO NOT CHEAT. All implementations must be genuine.
- UNDER NO CIRCUMSTANCES write or modify source code files (e.g. .ts, .js, .py) outside of `docs/`. All outputs must be documentation/reports.
- MUST incorporate `ui-ux-pro-max` principles (design system tokens, color psychology, visual hierarchy, ergonomics, accessibility WCAG 2.1 AA, responsive patterns, micro-interactions).
- Exclusive write ownership: `docs/auditoria/ux_audit.md` and your own `.agents/ux_worker_1/` directory.

## Report Requirements for `docs/auditoria/ux_audit.md`
1. Executive Summary & UX/Product Vision.
2. User Persona Profiles & Journey Mapping:
   - Consumer / Customer (Ordering, tracking, satisfaction).
   - Delivery Driver / Courier (Acceptance, navigation, proof-of-delivery).
   - Restaurant / Merchant Admin (Catalog management, order fulfillment queue).
   - System Admin (Platform metrics, user disputes, financial reconciliation).
3. Detailed User Flow Audits & Friction Analysis:
   - Flow A: Discovery & Search (Categories, filters, search bar, product modal with modifiers).
   - Flow B: Cart & Multi-item Management (Quantity steppers, empty states, minimum order thresholds).
   - Flow C: Checkout & Payment (Address selector, payment method selection, tip calculation, order summary breakdown).
   - Flow D: Live Order Tracking (Real-time map, status stepper, driver ETA, direct communication channels).
   - Flow E: Post-delivery, Reviews & Reordering (Rating rating stars, item-specific feedback, 1-click reorder).
4. UI/UX Design System Specification (Powered by `ui-ux-pro-max`):
   - Typography Hierarchy & Font pairings (e.g. Plus Jakarta Sans / Inter).
   - Color Palette & Semantic Tokens (Primary food delivery vibrant tones, warm neutrals, surface elevations, dark mode compatibility).
   - Component Guidelines (Buttons, Bottom Sheets, Floating Action Bars, Skeleton Loaders, Empty/Error states).
   - Mobile-First Ergonomics (Thumb zone mapping, one-handed operation, safe areas).
   - Accessibility (WCAG 2.1 AA contrast ratios, touch targets >= 44x44px, screen-reader aria labels).
5. Heuristic Evaluation & Improvement Backlog (Nielsen Norman Group 10 Heuristics breakdown with severity ratings and wireframe/mockup specifications).

## Deliverable & Signoff
Write `docs/auditoria/ux_audit.md`, write your `handoff.md` and `progress.md` in your working directory, and notify parent via `send_message`.
