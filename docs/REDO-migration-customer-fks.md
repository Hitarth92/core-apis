# Redo: customer FKs on trips / transportation_orders

Discarded from the analytics/dashboard ship (2026-08-20) so we do not rewrite already-shipped migrations in the same PR.

## Problem

On a **fresh** database install, migration `1786218933007` fails because it adds:

- `FK__trips__customers` → `core.customers(id)`
- `FK__transportation_orders__customers` → `core.customers(id)`

…but `core.customers` is created later by `1800000000003`.

## Intended fix (what you had locally)

### 1. `core-apis/src/infrastructure/persistence/migrations/1786218933007-migration.ts`

**In `up`:** remove (or comment out) these two statements:

```sql
ALTER TABLE "core"."trips" ADD CONSTRAINT "FK__trips__customers" ...
ALTER TABLE "core"."transportation_orders" ADD CONSTRAINT "FK__transportation_orders__customers" ...
```

**In `down`:** remove the matching `DROP CONSTRAINT` for those two FKs (they no longer belong to this migration).

### 2. `core-apis/src/infrastructure/persistence/migrations/1800000000003-migration.ts`

**In `up`:** after `core.customers` (and `FK__customers__organizations`) exists, add:

```sql
ALTER TABLE "core"."trips"
  ADD CONSTRAINT "FK__trips__customers"
  FOREIGN KEY ("customer_id") REFERENCES "core"."customers"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "core"."transportation_orders"
  ADD CONSTRAINT "FK__transportation_orders__customers"
  FOREIGN KEY ("customer_id") REFERENCES "core"."customers"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;
```

**In `down`:** drop those two constraints **before** dropping `FK__customers__organizations` / customers-related teardown (order matters).

## Before you re-apply — decide which world you are in

| Environment | Safe approach |
|---|---|
| **Only fresh DBs / never ran `1786218933007`** | Editing those two migration files (above) is OK. |
| **Any shared/staging/prod DB already ran the old `1786218933007`** | Do **not** edit checksummed history. Prefer a **new** migration that: (a) adds the FKs if missing, and (b) document that fresh installs still need the ordering fix in source — or squash only on a resettable DB. |

Check applied state:

```bash
cd core-apis
npm run migration:show
```

Confirm whether `1786218933007` / `1800000000003` already appear as executed.

## Verify after redo

1. Fresh schema: drop + migrate up on an empty DB — both migrations succeed.
2. `migration:down` across the pair does not leave orphan FK errors.
3. Existing DBs that already have the FKs: new migration is a no-op or uses `IF NOT EXISTS` / existence checks if your TypeORM style allows.

## Out of scope (still in working tree, not this note)

Stock-transfers list/search endpoint work remains local/unstaged for a later commit — not part of this migration redo.
