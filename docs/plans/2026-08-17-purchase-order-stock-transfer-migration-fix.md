# Fix purchase-order / stock-transfer schema drift + expose purchase source on stock movements

## Progress (updated 2026-08-17)

Repo: `D:\Client\core-apis`. `develop` is a protected branch (direct push rejected — PRs required), so work is on branch `fix/purchase-order-migration-drift` (pushed to origin, commit `cbe0e64`, PR not yet opened). Committed and pushed so far:

- [x] **A1** — `1786301965722-migration.ts` edited in place: removed all `purchase_orders`/`stock_transfers` `store_id`/`from_store_id`/`to_store_id` churn from both `up()` and `down()`, leaving the file a no-op for those two tables. Verified with `grep` that neither table name appears in the file anymore.
- [x] **B** — `purchase-orders.seed.ts`: added missing `organizationId: '00000000-0000-4000-8000-000000000001'` (matches the canonical seed org id used in `suppliers.seed.ts`/`products.seed.ts`/`inventory.seed.ts`).
- [ ] **A2** — corrective migration for already-migrated (non-fresh) databases — **cannot be done in this environment**: no Docker/Postgres available here, and `migration:generate` requires a live DB synced to the pre-fix state. Someone with DB access needs to run:
  ```
  npm run migration:generate
  ```
  against a DB currently in the `store_id` state, then hand-correct the output per the "A2" section below (rename not drop+add; nullable→backfill→not-null for `organization_id`) before committing, and add it to `migrations/index.ts`.
- [ ] **C1** — add `resolvePurchaseOrderSourcesAsync`/`resolveTransferSourcesAsync` to `i-stock-movement.repo.ts` + `stock-movement.repo.ts`. Not started — was mid-read of `stock-movement.entity.ts` (confirmed: `movementType: EMovementType`, `referenceId?`, `referenceType?` fields exist as described in the plan; no relation for `referenceId` since it's polymorphic) when this session paused.
- [ ] **C2** — add `supplierName?`/`purchaseOrderNumber?`/`fromLocationName?`/`toLocationName?` to `stock-movement.model.ts` + `stock-movement.response.ts`. Not started.
- [ ] **C3** — wire resolution into `list-movements-by-inventory.query-handler.ts` + `get-stock-movement.query-handler.ts`. Not started.
- [ ] **C4** — set `referenceType = 'stock_transfer'` in `complete-stock-transfer.command-handler.ts`. Not started.
- [ ] Final lint pass (`npm run lint`) once C1–C4 land.

To resume: pick up at C1 in `src/application/modules/stock-movements/` and `src/infrastructure/persistence/repositories/stock-movement.repo.ts`. The full design for C1–C4 is unchanged from the "C. Expose purchase-vs-transfer source on stock-movement logs" section below.

## Context

The user asked to check how "purchases" work — specifically whether stock comes from an external store/supplier vs. an internal warehouse — and to find improvements. Investigation of `core-apis` (NestJS/TypeORM backend) showed:

- "Warehouse" isn't a separate entity — it's just a `type` (`store`/`warehouse`) on the unified `locations` table (`ELocationType`). That part is fine.
- Buying from an external supplier (**Purchase Orders**) and moving stock between the org's own locations (**Stock Transfers**) are two intentionally separate features (different required fields: supplier+cost vs. from/to location). The user confirmed this split should stay — decision: **keep both flows separate**, but make stock movements report which one produced them.
- While tracing "where does a purchase's stock actually go," a real, verified bug surfaced: the `purchase_orders` and `stock_transfers` migration history has drifted from the current entity code. On a true fresh install (`migration:up` from an empty schema), the chain breaks. This is unrelated to the original ask but sits directly in the same tables, so it must be fixed first — everything downstream (including the reporting the user wants) depends on these tables actually having the columns the entities expect.
- The user also asked for visibility into purchase-vs-transfer source directly on the existing stock-movement logs, not a new report page or a merged creation flow (both confirmed via AskUserQuestion).

## Verified bug: migration/entity drift on `purchase_orders` and `stock_transfers`

Read directly (not from `database.md`, which is stale) — `src/infrastructure/persistence/migrations/*`, `type-orm.config.ts`, and the current entities:

- `type-orm.config.ts:27` loads migrations via glob (`migrations/*-migration{.ts,.js}`); TypeORM runs them in ascending timestamp order, i.e. **filename order**, not the (out-of-order) `migrations/index.ts` barrel.
- `1777456933640-migration.ts` creates `purchase_orders` with a `store_id` column (FK to `core.stores`). It does **not** create `stock_transfers` or `stock_entries` at all — verified by reading the file; those tables don't exist yet at this point in history.
- `1785664498481-migration.ts` renames `purchase_orders.store_id` → `location_id`.
- `1786301965722-migration.ts` (`up()`) reverts this: drops `purchase_orders.location_id` **and** `purchase_orders.organization_id` entirely, adds `store_id` back (FK to `core.stores`). It also tries to `ALTER TABLE stock_transfers ... DROP COLUMN "from_location_id"` etc. — but on a fresh install `stock_transfers` doesn't exist yet at this point (see above), so this throws `relation "core.stock_transfers" does not exist` and the whole migration chain aborts. Confirmed against the repo's own carve-out in `1785700000000-migration.ts`'s comment and `backend-rules.md` §10's guidance for exactly this class of ordering bug.
- `1800000000003-migration.ts` is where `stock_transfers`/`stock_entries` are actually first created, already using `from_location_id`/`to_location_id` — correct shape, but on a fresh install it's never reached because of the crash above.
- Current entities (`purchase-order.entity.ts`, `stock-transfer.entity.ts`) use `locationId`/`organizationId`/`fromLocationId`/`toLocationId`, FK to `locations` — matching every other active module and the `ERP-Client` frontend (`CreatePurchaseOrderInput.locationId`, `StockTransfer.fromLocationId/toLocationId`). There is no `store.entity.ts` anywhere in the codebase — `core.stores`/`store_id` is legacy and orphaned.

**Decision (confirmed with user): fix the database to match the current entity code** (`location_id`, not `store_id`) — not the reverse — since entities, repos, and the frontend already agree on `locationId`.

Two DB states need two fixes:

### A1. Fix the fresh-install crash — edit `1786301965722-migration.ts` in place

Per `backend-rules.md` §10 ("make the earlier one idempotent OR ... so the earlier one becomes a no-op on fresh install" — this is the sanctioned exception to "never edit a migration," for a migration whose direction is permanently wrong, not environment-dependent):

Remove these statements from both `up()` and `down()` (leave every unrelated statement — customer_credit_transactions, bills, roles enum, etc. — untouched):
- `up()`: the `purchase_orders`/`stock_transfers` FK drops, the `location_id`/`organization_id`/`from_location_id`/`to_location_id` column drops, the `store_id`/`from_store_id`/`to_store_id` adds, and the four `...__stores` FK adds.
- `down()`: the mirror-image statements.

Since `organization_id` is already correctly present on `purchase_orders` before this migration runs (added in `1785658538945`), removing these statements is a pure deletion — no backfill needed for this file. Effect: `1786301965722` becomes a no-op for these two tables; `1800000000003`'s `CREATE TABLE stock_transfers/stock_entries` (already correct) then runs cleanly.

### A2. Fix already-migrated databases — one new migration via `migration:generate`

For any DB currently sitting in the `store_id`/missing-`organization_id` state, entities already reflect the target end state, so: run `npm run migration:generate` against that DB and hand-correct the output before committing (per §10, generate is the only allowed way to create the file; correcting its content before commit is expected, not hand-authoring):
1. TypeORM's diff will likely emit `DROP COLUMN "store_id"` + `ADD COLUMN "location_id"` (data/FK loss) instead of a rename — change to `RENAME COLUMN "store_id" TO "location_id"` (and `from_store_id`/`to_store_id` likewise), matching the pattern in `1785664498481`.
2. The generated `ADD "organization_id" uuid NOT NULL` will fail on any DB with existing rows — add it nullable first, backfill (`UPDATE core.purchase_orders po SET organization_id = l.organization_id FROM core.locations l WHERE l.id = po.location_id`), then `SET NOT NULL`.

Expected final diff: drop `...__stores` FKs; rename the three columns; add+backfill+not-null `organization_id`; add `...__locations`/`...__organizations` FKs. Add the new file to `migrations/index.ts`.

### Verification
- Fresh: drop schema, `npm run migration:up` from empty — must complete through the corrected `1786301965722` and `1800000000003` without error; confirm `purchase_orders.location_id`/`.organization_id` and `stock_transfers.from_location_id`/`.to_location_id` exist with FKs to `locations`/`organizations`.
- Legacy-state DB: apply only the new A2 migration against a copy seeded with the old `store_id` schema + sample rows; confirm no data loss and correct backfill.
- `npm run migration:generate` again on both resulting schemas afterward — must produce an empty diff.

## B. Related code check (no changes expected, verify)

`purchaseorder.repo.ts` and `stock-transfer.repo.ts` are plain `BaseRepo<Entity, Domain>` passthroughs — no raw SQL/query-builder referencing `store_id`/`stores`. Once the DB matches the entities, no repo changes needed.

One real gap: `src/infrastructure/persistence/seeds/purchase-orders.seed.ts` never sets `organizationId` on its seed rows — add it (matching the existing `supplierId`/`locationId` fields in the same seed entry), otherwise seeding fails once `organization_id` is correctly NOT NULL.

## C. Expose purchase-vs-transfer source on stock-movement logs

Goal (confirmed with user): no new table/report page — add source info to the existing stock-movements list/get responses. `StockMovementEntity` already carries `movementType` (`EMovementType`: `TransferIn`/`TransferOut` only ever set by `StockOrchestrationService`'s transfer path) and `referenceType`/`referenceId` (`receive-purchaseorder.command-handler.ts` sets `referenceType: 'purchase_order'`; the transfer path does not currently set `referenceType`). `referenceId` is a polymorphic pointer, not a TypeORM relation, so resolution is a batched lookup, not a join annotation.

Files:
1. **`src/application/modules/stock-movements/i-stock-movement.repo.ts`** — add:
   ```ts
   resolvePurchaseOrderSourcesAsync(ids: string[]): Promise<Map<string, { poNumber: string; supplierName: string }>>;
   resolveTransferSourcesAsync(ids: string[]): Promise<Map<string, { fromLocationName: string; toLocationName: string }>>;
   ```
2. **`src/infrastructure/persistence/repositories/stock-movement.repo.ts`** — implement both by injecting `PurchaseOrderEntity`/`StockTransferEntity` repos (already globally registered via `InfrastructureModule.forFeature`) and using `find({ where: { id: In(ids) }, relations: [...] })` — one extra query each, not N+1.
3. **`src/application/modules/stock-movements/domain/stock-movement.model.ts`** + **`.../models/responses/stock-movement.response.ts`** — add optional `@AutoMap()` fields: `supplierName?`, `purchaseOrderNumber?`, `fromLocationName?`, `toLocationName?`.
4. **`list-movements-by-inventory.query-handler.ts`** and **`get-stock-movement.query-handler.ts`** — after fetching movements, collect distinct `referenceId`s where `referenceType === 'purchase_order'` and distinct `referenceId`s where `movementType` is `TransferIn`/`TransferOut`, call the two batch-resolve methods (skip when the id list is empty), assign resolved fields onto each movement before returning.
5. **`complete-stock-transfer.command-handler.ts`** — also set `referenceType = 'stock_transfer'` alongside the existing `referenceId = command.transferId`, for consistency with the purchase-order and bill paths (not required by the query design above, which keys transfers off `movementType`, but keeps the discriminator populated for future use).

## Verification (end to end)

1. Backend: `npm run migration:up` from a clean DB completes; create a purchase order → receive it → confirm a `stock_movements` row with `movementType=StockIn`, `referenceType='purchase_order'`, and the list/get endpoint returns `supplierName`/`purchaseOrderNumber` for it.
2. Create a stock transfer between two locations → complete it → confirm the resulting `stock_movements` rows (`TransferIn`/`TransferOut`) return `fromLocationName`/`toLocationName` on the same endpoints.
3. Run `npm run lint` on touched `services`-equivalent path per `eslint-discipline.md`.
