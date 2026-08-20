# Store-Scoped User Access — Design

Date: 2026-08-17
Status: Approved

## Problem

`user_roles.locationId` (DB column `store_id`) already exists on `UserRoleEntity`, with a comment stating "null = org-wide, non-null = scopes role to a specific store." It is completely dead:

- The domain model `UserRole` doesn't have the field.
- `CreateUserRoleRequest`/`Command` and `UpdateUserRoleRequest` have no way to set it.
- `ClerkJwtStrategy.validate` fetches user roles and flattens them to bare role names, discarding `locationId`.
- No guard anywhere checks location.

Net effect: every role is org-wide today regardless of intent. A "store manager" role behaves identically at every store in the org.

## Decisions

1. **Location context per request**: resolved from the request itself (route param / query / body `locationId`), not a global "active store" session concept. These endpoints already carry `locationId` today (Inventory, Stock Transfers, Purchase Orders, etc.) — reuse it rather than adding a parallel mechanism. Avoids conflicting with the POS screen, which already lets a user target a different store per sale.
2. **Enforcement scope**: only the modules that already have a location concept — Inventory, Stock Movements, Stock Transfers, Purchase Orders, Locations. Everything else (users, roles, org settings, etc.) stays org-wide, unchanged.
3. **List endpoints without an explicit location filter**: if the user has no org-wide instance of the required role, deny and require them to filter by a location within their allowed set. No auto-narrowing/query-rewriting — kept simple and deny-by-default.

## Changes

### Backend (core-apis)

- `UserRole` domain model (`application/modules/user-roles/domain/user-role.model.ts`): add `locationId?: string | null`.
- `CreateUserRoleRequest`/`CreateUserRoleCommand`/handler: add optional `locationId`; validate it references a `Location` in the same organization (reject cross-org); drop the existing `as any` cast in the handler.
- `UpdateUserRoleRequest`/command: add optional `locationId` (settable, and clearable back to org-wide via `null`).
- `ClerkJwtStrategy.validate`: stop flattening to bare `roles: ERole[]`; carry `{ role, locationId }` pairs on `AuthenticatedUser` so downstream guards know which location (if any) each role grants.
- New `LocationAccessGuard` + `@LocationScoped()` decorator: applied to the five modules above only. Resolves target `locationId` from route param → query → body (first present). Passes if the user has an org-wide instance of the required role, or a role scoped to that exact `locationId`. Otherwise 403. For list endpoints with no resolvable `locationId`, requires the caller to supply one from their allowed set unless they hold an org-wide role.

### Frontend (ERP-Client)

- `UserRoles` assignment form: add an optional "Scope to store" dropdown sourced from existing Locations. Blank = org-wide (current behavior, unchanged default).
- No other frontend changes — screens that already send `locationId` per action (Inventory filter, POS store picker, PO/transfer forms) already carry what the guard needs.

### Testing

- Unit test for `LocationAccessGuard`: org-wide role passes any location; scoped role passes only its own location and is denied elsewhere; user with neither is denied.
- Unit test for `CreateUserRoleCommandHandler`: rejects a `locationId` belonging to a different organization.

## Out of scope

- A global "switch active store" session/UX.
- Auto-filtering list queries to a user's allowed locations (deny-by-default instead).
- The separate resource/action permission tables (`permission.entity.ts`, `role-permission.entity.ts`) — untouched, out of scope for this change.
