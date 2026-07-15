# SS Pipe Ricco — Flow Redesign Plan

This is a large redesign of the existing app. Below is the plan I'll execute in phases, with your approval. I'll flag important trade-offs so you can confirm before I touch the database.

## Scope summary

Convert the app from a Master-Data-driven production flow to a **manual production entry** system with **automatic BOM-based material consumption**, **real-time inventory**, **simplified purchase**, **gap analysis**, and a **modern industrial dashboard**.

## Important decisions I need you to confirm

1. **Plant field** — Current DB requires `plant_id` on products, purchases, production, inventory. Your spec removes "Plant" from Purchase. Options:
   - **(A) Keep a single default Plant hidden** (recommended, least destructive — all existing data preserved).
   - (B) Drop plant entirely from schema (destructive, loses history, breaks RLS `user_plants`).
   
   → I'll go with **(A)** unless you say otherwise.

2. **Existing data** — I will NOT delete existing products, materials, purchase orders, or production entries. New simplified forms will coexist; old fields become optional/hidden.

3. **Supervisors** — New concept. I'll add a `supervisors` table linked to `departments`, manageable by Admin.

4. **Shift/Date on Production** — Spec says remove. I'll auto-set `entry_date = today`, `shift = 'general'` behind the scenes (DB requires them).

5. **Purchase simplification** — I'll hide PO/Invoice/Supplier/Pricing fields in the UI and auto-generate placeholder values. Existing purchase orders remain viewable.

## Phase 1 — Database migrations

- Create `supervisors` (id, name, department_id, status, timestamps) + RLS + GRANTs.
- Seed default departments (Fabrication, Welding, Assembly, Finishing, Dispatch, Maintenance) if missing.
- Seed default products (Stand, Table, Rack, Trolley, Jig) linked to default plant/department/material — only if not present.
- Make `products.pipe_size_id`, `products.length_mm/width_mm/height_mm` nullable (spec's simplified products don't need dimensions). Update `tg_products_autocalc` to no-op when dimensions are null.
- Add `min_stock` on `materials` (already have `min_stock_qty` — reuse).
- Add `notifications` table (type, message, ref_table, ref_id, read_at, user scope) + triggers for low-stock and gap events.

## Phase 2 — Production Entry redesign

- Rewrite `src/routes/_authenticated.production.tsx`:
  - Remove Date, Shift from UI.
  - Product dropdown = existing products + "Other → + Add New Product" inline creator (saves to `products` with default plant/department, no dimensions).
  - Department dropdown (from `departments`).
  - Supervisor dropdown (filtered by selected department).
  - Quantity, Remarks.
  - Live BOM consumption preview (already exists — keep).
- Save: auto-fill date=today, shift=general, plant=default, material_id=first BOM material.

## Phase 3 — Purchase simplification

- Rewrite `src/routes/_authenticated.purchase.tsx`:
  - Show only: Purchase Date, Material (with size in label), Quantity, Remarks.
  - Auto-generate `po_no`, set supplier=null (or "Direct"), plant=default, rate=0, gst=0.
- Inventory continues to auto-post via existing `tg_purchase_post_inventory` trigger.

## Phase 4 — Material & Product Masters

- Simplify Material Master form: Name, Size, Unit, Current Stock (read-only from view), Min Stock, Remarks.
- Simplify Product Master form: Name, Code, Department, Description, Status + BOM editor (already exists).
- Add Supervisors master page under `/masters/supervisors`.

## Phase 5 — Dashboard redesign

- Rewrite dashboard cards per spec: Total Materials, Total Stock, Today's Production, Today's Consumption, Low Stock, Out of Stock, Pending, Stock Value.
- Add charts using `recharts` (already available via shadcn): Production Trend (line), Department Performance (bar), Top Products (pie).
- Recent Activities from `audit_logs`.

## Phase 6 — Reports

- Add report tabs: Daily/Dept/Supervisor/Product-wise Production, Material Consumption, Inventory Ledger, Purchase History, Low Stock, Gap Analysis.
- PDF (jsPDF) + Excel (xlsx) + Print — utilities exist in `src/lib/export.ts` and `ExportMenu`.

## Phase 7 — Notifications

- Bell icon in navbar showing unread notifications.
- Triggers: low-stock (on inventory change), negative stock, gap detected, new product/material created.

## Technical notes

- All schema changes go through `supabase--migration` for your approval.
- RLS policies scope by role via existing `has_role` / `user_plants`.
- Keep TanStack Router + Query patterns already in the codebase.
- Reuse existing components (`EntryListView`, `ExportMenu`, `ExcelImport`, `BomEditor`).

## What I will NOT do without asking

- Delete any existing tables or historical rows.
- Remove `plant_id` from the schema.
- Change auth/role model.

---

**Please confirm** (or edit) so I can start with Phase 1 (DB migration). If you want, I can also start with just Phase 2 (Production Entry redesign) as a quick win before the full rework.
