# Store-Scoped Access & Onboarding — Design

Date: 2026-08-17
Status: Draft
Supersedes/extends: `2026-08-17-store-scoped-user-access-design.md` (scope expanded, decisions below override its §2 "Enforcement scope" and §3 "no auto-narrowing")

## Problem

Two problems, discovered while checking how a user gets from "signs up" to "sees only their store."

**1. Location scoping barely reaches beyond Inventory.** The prior design's guard (`assertLocationAccess`, `AuthenticatedUser.locationIds`/`hasOrgWideAccess`) is wired into 4 controllers (Inventory, Purchase Orders, Stock Movements, Stock Transfers). Bills, Orders, Invoices, Expenses, and Unpublished Stock all carry a `locationId` on their entities but have zero location enforcement — some (Bills `getById`/`update`/`delete`/`transitionStatus`, Orders/Invoices `getById`) don't even check `organizationId`, so any authenticated user from any org can currently read/mutate another org's bill by ID. List/search endpoints that are guarded throw `LocationAccessDeniedException` when a scoped user omits `locationId` instead of defaulting to their store — not "log in and see your store," but "log in and get an error until you supply the right filter."

**2. The invite → access pipeline doesn't connect.** Four separate systems look like they grant a user access; only two do anything the backend actually reads:

- `ClerkJwtStrategy.validate` (`common/auth/strategies/clerk-jwt.strategy.ts:63-83`) builds `roles`/`organizationId`/`locationIds`/`hasOrgWideAccess` **exclusively** from the DB `user_roles` and `org_members` tables.
- The "Users" page's "Invite User" (`POST /users/clerk/invite`) and "Edit Roles" (`PUT /users/clerk/:id/roles`) write to Clerk `publicMetadata.roles` — never read by the JWT strategy. Cosmetic.
- "Assign to Org" (`AssignOrgDrawer` → `POST /users/clerk/:id/organizations`) writes Clerk's own org-membership object. The JWT strategy captures `clerkOrgId`/`clerkOrgRole` from the token but never uses them for `organizationId` or `roles`. Cosmetic.
- `POST /auth/invite` (`invite-member.command-handler.ts`) is the one endpoint that creates a real `org_members` row — but has no frontend caller at all (dead from the UI's side).

Net effect: an admin invites a teammate today, the teammate signs up, calls `/auth/sync`, and ends up with a `User` row that has `organizationId = null` and no role — stuck, with no button anywhere that fixes it. Separately, the `UserRoles` page's manual assignment drawer calls `GET /api/v1/users/directory`, which doesn't exist in `users.controller.ts` (only `GET /users/:id` is defined) — the user picker in that drawer is non-functional today.

## Decisions

1. **Module scope for location-enforcement**: Inventory, Purchase Orders, Stock Movements, Stock Transfers (existing) + Bills, Orders, Invoices, Expenses, Unpublished Stock (+ its movement log), Product Logs, Activity Log. Explicitly **excluded**: Item Returns, Customers, Suppliers, Credit Approvals, Vehicles/Trips/Drivers, Locations CRUD, Categories/Products (org-wide catalog). Stock Entries have no standalone controller (created only via Purchase Order receiving) — already covered by the Purchase Orders guard, no separate change needed.
2. **One store per user.** A user holds at most one location-scoped `user_roles` row. Enforced once, in `CreateUserRoleCommandHandler` and reused by the new sync-triggered auto-provision path (§5) — reject creating a second location-scoped role; caller must update the existing one instead.
3. **Auto-default instead of throw.** Reverses the prior design's §3. When a request to a guarded list/search endpoint omits `locationId` and the caller isn't org-wide, default to `user.locationIds[0]` instead of throwing. `assertLocationAccess` still validates when a `locationId` **is** supplied (unchanged). A location-scoped user with zero locations (misconfigured — shouldn't happen once decision 2 holds) still gets the existing deny.
4. **Fix onboarding as part of this change**, not a follow-up: extend the existing Clerk-email invite (keep it — it's the only working delivery mechanism) to carry `{ organizationId, roleId, locationId }` in the invitation's `publicMetadata`. Clerk copies invitation `publicMetadata` onto the created user on acceptance. `SyncUserCommandHandler` reads it on first sync and creates the `org_members` row (no `locationId`) or `user_roles` row (`locationId` set) automatically — no admin follow-up step required after sending the invite.
5. **Leave the dead Clerk-metadata UI alone.** "Edit Roles" and "Assign to Org" on the Users page stay as-is (unused by the new flow) — not in scope for this change.

## Changes

### Backend (core-apis)

- `MeResponse` (`application/modules/auth/models/responses/me.response.ts`) + `GetMeQueryHandler`: add `locationIds: string[]`, `hasOrgWideAccess: boolean`, sourced from `AuthenticatedUser` (already computed by the JWT strategy) — `AuthController.getMe` just passes them through, no new query needed.
- New helper alongside `assertLocationAccess` (`common/auth/location-access.util.ts`): resolves the effective `locationId` for a request — returns the supplied one after validating it, or `user.locationIds[0]` when none was supplied and the user isn't org-wide, or `undefined` for org-wide users. Replaces the current per-controller `if (!filter?.locationId && !user.hasOrgWideAccess) throw ...` blocks.
- **Bills** (`bills.controller.ts`): add the missing `organizationId` ownership check + `assertLocationAccess`/default-resolve to `getById`, `update`, `delete`, `transitionStatus`, `addItem`, `updateItem`, `removeItem`; default-resolve on `search`/`list` (mirrors Inventory's existing pattern exactly).
- **Orders / Invoices** (`orders.controller.ts`, `invoices.controller.ts`): add `organizationId` check + `assertLocationAccess` to `getById` (their only read endpoint besides `POST`, which is created server-side alongside a Bill and inherits its location).
- **Expenses**: default-resolve on `list`; org + location check on `getById` and the `:id/status` patch.
- **Unpublished Stock**: default-resolve on the list `GET`; org + location check on `getById`/`by-record/:id`; `assertLocationAccess` on `add`/`publish` commands (mirrors Stock Movements).
- **Product Logs**: org + location check on `getById`/`by-inventory/:inventoryId` (resolve location via the linked inventory record, same pattern as Stock Movements today). `by-product/:productId` stays org-scoped only — products are an org-wide catalog, a product's log entries can legitimately span stores.
- **Activity Log**: add a `locationId` filter to the `list` query + default-resolve; org + location check on `getById`.
- `CreateUserRoleCommandHandler`: reject if the target user already has a location-scoped `user_roles` row (decision 2).
- `InviteUserCommand`/`InviteUserRequest`: add `roleId: string`, `locationId?: string`, `organizationId` (from the calling admin's session, not client input). `IClerkService.inviteUserAsync`'s `publicMetadata` payload carries `{ organizationId, roleId, locationId }` instead of the current cosmetic `roles` label array.
- `SyncUserCommandHandler`: after upserting the `User` row, if `organizationId` is still null, read the synced Clerk user's `publicMetadata` for an invite payload; if present, set `organizationId` and create the `org_members` row (no `locationId`) or `user_roles` row (`locationId` set), applying the same one-store-per-user check as decision 2.
- New `GET /users/directory` endpoint (`users.controller.ts`): org-scoped list of DB `User` rows, backing the existing `UserRoles` assignment drawer's user picker.

### Frontend (ERP-Client)

- `MeResponse` type (`services/auth.service.ts`) + `AuthContext`: carry `locationIds`/`hasOrgWideAccess`.
- New `useMyLocation()` hook returning `{ locationId, hasOrgWideAccess }`.
- Inventory, POS terminal, Stock Movements/Transfers, Purchase Orders, Bills, Expenses, Unpublished Stock pages: a location-scoped user sees their store name as a fixed label instead of a picker; the fetch always uses their `locationId`. Org-wide users keep today's picker, unchanged.
- Extend the "Invite User" drawer with Role + (conditionally, for store-level roles) Store fields, sent through to the updated `InviteUserRequest`.

### Testing

- One unit test per newly-guarded controller path (org-wide passes / correct store passes / wrong store 403s / omitted filter defaults instead of erroring) — same shape as the existing `assertLocationBelongsToOrg` spec.
- `CreateUserRoleCommandHandler`: rejects a second location-scoped role for the same user.
- `SyncUserCommandHandler`: org-wide invite payload creates an `org_members` row; store-scoped invite payload creates a `user_roles` row with `locationId`; no-payload sync (existing users, or org creator) is unaffected.

## Open risk to verify during implementation

Clerk invitation → user `publicMetadata` carry-through (decision 4) is an assumption about `@clerk/backend`'s behavior on invitation acceptance — confirm against the installed version before building the rest of the sync-handler logic on top of it. If it doesn't carry through, fall back to a small `pending_invites` table keyed by email instead.

## Out of scope

- A global "switch active store" session/UX for org-wide users.
- Multi-store-per-user.
- Item Returns location-scoping (explicitly excluded).
- Removing/replacing the Clerk-metadata "Edit Roles" / "Assign to Org" UI.
- The separate resource/action permission tables (`permission.entity.ts`, `role-permission.entity.ts`).
