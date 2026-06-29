# Spring Boot Reference (non-runnable)

This folder mirrors the Java 21 / Spring Boot 3 backend that would back the
SS Pipe Material Planning & Inventory Management System. It is reference
code only — the live application runs the same business rules in
PostgreSQL (Lovable Cloud) via triggers, RLS and views, fronted by the
React + TanStack Start app in `src/`.

## Module map

- config/        SecurityConfig, JwtFilter, OpenAPI
- domain/        JPA @Entity classes, 1:1 with DB tables
- repository/    Spring Data JPA repositories
- service/       ProductService, InventoryService, GapService, ...
- web/controller @RestController REST APIs
- web/dto        Request / Response DTOs (records)
- web/mapper     MapStruct mappers
- security/      JwtService, RefreshTokenService, RoleVoter
- common/        GlobalExceptionHandler, ApiError, Pagination helpers
- resources/db/migration  Flyway scripts (same DDL as supabase/migrations)

## Endpoints

- POST /api/auth/login, /api/auth/refresh, /api/auth/logout
- CRUD  /api/masters/{plants,departments,suppliers,pipe-sizes,materials,products}
- CRUD  /api/production, /api/purchase, /api/scrap, /api/gap-verification
- GET   /api/inventory/stock, /api/inventory/ledger
- GET   /api/reports/{production,purchase,consumption,gap}

All endpoints follow DTO + Service + Repository layers, Bean Validation,
pagination & sorting via Pageable, filtering via JPA Specifications, and
expose Swagger at /swagger-ui.html.

## Business engines (parity with the DB triggers)

- ProductCalculationEngine    -> totalMeter / totalFeet / pipes_required_*
- ProductionConsumptionEngine -> pipe + meter consumption, posts production_out
- PurchaseTotalsEngine        -> subTotal, gst, total; posts purchase_in
- GapVerificationEngine       -> expected, allowedWastage, actualGap
- InventoryLedger             -> append-only; stock = sum(qty_in) - sum(qty_out)

## Security

- JWT access + refresh (HS256, 15 min / 7 day TTL)
- BCryptPasswordEncoder
- Method-level @PreAuthorize("hasAnyRole(...)") for the 10 roles
- Audit interceptor writes to audit_logs for every mutation
